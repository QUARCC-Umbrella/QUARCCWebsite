#!/usr/bin/env python3
"""Typeset the research papers in this folder as PDFs with KaTeX and headless Chromium.

Converts the small LaTeX subset these papers use into print HTML, then prints it.
Nothing is sent over the network: KaTeX comes from node_modules, Chromium runs locally.

    python3 papers/build_papers.py [--chrome PATH] [--out Public/papers]
"""
import argparse
import pathlib
import re
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
KATEX = ROOT / "node_modules" / "katex" / "dist"
HERE = pathlib.Path(__file__).resolve().parent

CSS = r"""
@page { size: letter; margin: 0.72in 0.7in 0.78in; }
@page { @bottom-center { content: counter(page); font: 9pt KaTeX_Main, serif; color: #000; } }
* { box-sizing: border-box; }
html { font-size: 9.6pt; }
body { margin: 0; font-family: KaTeX_Main, "Times New Roman", serif; line-height: 1.24; color: #000;
  font-variant-ligatures: common-ligatures; text-rendering: geometricPrecision; }
a { color: inherit; text-decoration: none; }
header { text-align: center; margin-bottom: 11pt; }
h1 { font-size: 13.4pt; line-height: 1.2; margin: 0 0 6pt; font-weight: 700; }
.author { font-size: 10.4pt; } .meta { font-size: 8.8pt; margin-top: 1pt; }
.abstract { width: 91%; margin: 9pt auto 0; font-size: 8.9pt; text-align: justify; hyphens: auto; }
main { column-count: 2; column-gap: 0.24in; column-fill: balance; }
p { margin: 0 0 3.6pt; text-align: justify; hyphens: auto; orphans: 2; widows: 2; }
h2 { font-size: 10pt; margin: 8pt 0 3pt; font-weight: 700; break-after: avoid; }
ol, ul { margin: 2pt 0 4pt; padding-left: 15pt; } li { margin-bottom: 2.4pt; text-align: justify; hyphens: auto; }
.eq { display: flex; align-items: center; margin: 5pt 0 6pt; break-inside: avoid; }
.eq .m { flex: 1; min-width: 0; text-align: center; } .eq .n { flex: none; padding-left: 5pt; }
.katex { font-size: 1.04em; } .katex-display { margin: 0; }
.fig { break-inside: avoid; margin: 5pt 0 8pt; }
.wide { break-inside: avoid; column-span: all; margin: 7pt 0 9pt; }
.pair { display: flex; justify-content: center; gap: 22pt; align-items: flex-start; }
table { border-collapse: collapse; font-size: 8.1pt; line-height: 1.22; font-variant-numeric: lining-nums tabular-nums; }
.small table { font-size: 7.2pt; }
th, td { padding: 1.6pt 4.5pt; white-space: nowrap; vertical-align: baseline; }
td.w { white-space: normal; }
.l { text-align: left; } .r { text-align: right; } .c { text-align: center; }
tr.top td, tr.top th { border-top: 0.9pt solid #000; } tr.mid td, tr.mid th { border-top: 0.5pt solid #000; }
tr.bot td, tr.bot th { border-bottom: 0.9pt solid #000; } tr.gap td { padding-top: 4pt; }
figcaption, .cap { font-size: 8.3pt; text-align: left; margin: 0 0 5pt; hyphens: auto; }
.refs { font-size: 7.5pt; line-height: 1.2; } .refs p { padding-left: 1.3em; text-indent: -1.3em; margin-bottom: 1.5pt; }
"""

TEXT_SUBS = [
    (r"\\&", "&amp;"), (r"\\%", "%"), (r"\\\$", "§DOLLAR§"), (r"\\_", "_"), (r"\\#", "#"),
    (r"\\'a", "á"), (r"\\'e", "é"), (r"\\'o", "ó"), (r'\\"u', "ü"), (r'\\"a', "ä"), (r"\\`e", "è"), (r"\\\^a", "â"),
    (r"---", "—"), (r"--", "–"), (r"``", "“"), (r"''", "”"), (r"(?<!\\)~", "\u00a0"),
    (r"\\,", "\u2009"), (r"\\ ", " "), (r"\\qquad", " "), (r"\\quad", " "), (r"\\!", ""),
]


def braced(s, i):
    """Return (content, index after the closing brace) for the group opening at s[i]."""
    assert s[i] == "{", s[i:i + 40]
    depth, j = 0, i
    while True:
        if s[j] == "\\":
            j += 2
            continue
        if s[j] == "{":
            depth += 1
        elif s[j] == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1:j], j + 1
        j += 1


def unwrap(s, cmd, fn):
    out, i, key = [], 0, "\\" + cmd + "{"
    while True:
        k = s.find(key, i)
        if k < 0:
            out.append(s[i:])
            return "".join(out)
        out.append(s[i:k])
        body, i = braced(s, k + len(key) - 1)
        out.append(fn(body))


class Doc:
    def __init__(self, tex):
        self.tex = re.sub(r"(?m)(?<!\\)%.*$", "", tex)
        self.labels = {}
        n = 0
        # Number equations and tables in reading order so forward references resolve.
        for m in re.finditer(r"\\begin\{(equation|align)\}(.*?)\\end\{\1\}", self.tex, re.S):
            n += 1
            lab = re.search(r"\\label\{([^}]+)\}", m.group(2))
            if lab:
                self.labels[lab.group(1)] = str(n)
        t = 0
        for m in re.finditer(r"\\begin\{table\*?\}(.*?)\\end\{table\*?\}", self.tex, re.S):
            t += 1
            lab = re.search(r"\\label\{([^}]+)\}", m.group(1))
            if lab:
                self.labels[lab.group(1)] = str(t)
        self.eqn = 0
        self.tabn = 0
        self.store = []

    def stash(self, html):
        self.store.append(html)
        return f"\x00{len(self.store) - 1}\x00"

    def restore(self, s):
        while "\x00" in s:
            s = re.sub(r"\x00(\d+)\x00", lambda m: self.store[int(m.group(1))], s)
        return s

    def inline(self, s):
        """Render a run of text: macros and math are stashed so text rules cannot touch them."""
        s = re.sub(r"\\href\{([^}]*)\}\{([^}]*)\}",
                   lambda m: self.stash(f'<a href="{m.group(1)}">{self.inline(m.group(2))}</a>'), s)
        for cmd, tag in (("textbf", "b"), ("textit", "i"), ("emph", "i"), ("texttt", "code")):
            s = unwrap(s, cmd, lambda b, t=tag: self.stash(f"<{t}>{self.inline(b)}</{t}>"))
        s = re.sub(r"(?<!\\)\$((?:\\.|[^$\\])*)\$", lambda m: self.stash(self.math(m.group(1))), s)
        return self.restore(self.text(s))

    def math(self, m, display=False):
        esc = m.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        return f'<span class="tex{" d" if display else ""}">{esc}</span>'

    def text(self, s):
        s = re.sub(r"\\eqref\{([^}]+)\}", lambda m: f"({self.labels[m.group(1)]})", s)
        s = re.sub(r"\\ref\{([^}]+)\}", lambda m: self.labels[m.group(1)], s)
        s = re.sub(r"\\label\{[^}]*\}", "", s)
        for a, b in TEXT_SUBS:
            s = re.sub(a, b, s)
        return s.replace("§DOLLAR§", "$")

    def equation(self, body):
        self.eqn += 1
        body = re.sub(r"\\label\{[^}]*\}", "", body).replace("\\nonumber", "").strip()
        return (f'<div class="eq"><div class="m">{self.math(body, True)}</div>'
                f'<div class="n">({self.eqn})</div></div>')

    def align(self, body):
        return self.equation("\\begin{aligned}" + body + "\\end{aligned}")

    def table(self, body, wide):
        self.tabn += 1
        cap = re.search(r"\\caption\{", body)
        caption, _ = braced(body, cap.end() - 1)
        small = "\\scriptsize" in body
        tabs = []
        for m in re.finditer(r"\\begin\{tabular\}\{([^}]*)\}(.*?)\\end\{tabular\}", body, re.S):
            tabs.append(self.tabular(m.group(1), m.group(2)))
        inner = f'<div class="pair">{"".join(tabs)}</div>'
        cls = "wide" if wide else "fig"
        return (f'<figure class="{cls}{" small" if small else ""}" style="margin-left:0;margin-right:0">'
                f'<figcaption class="cap">Table {self.tabn}. {self.inline(caption)}</figcaption>{inner}</figure>')

    def tabular(self, spec, body):
        al = [c for c in re.sub(r"[@|>]\{[^}]*\}", "", spec) if c in "lrcp"]
        rows, pending, gap = [], "top", False
        for raw in re.split(r"\\\\", body):
            raw = raw.strip()
            cls = pending
            while True:
                m = re.match(r"\\(toprule|midrule|bottomrule|addlinespace(\[[^\]]*\])?)\s*", raw)
                if not m:
                    break
                k = m.group(1)
                if k == "midrule":
                    cls = "mid"
                elif k.startswith("addlinespace"):
                    gap = True
                elif k == "bottomrule":
                    rows[-1] = rows[-1].replace('<tr class="', '<tr class="bot ', 1)
                raw = raw[m.end():].strip()
            if not raw:
                pending = cls
                continue
            cells = re.split(r"(?<!\\)&", raw)
            tds = "".join(f'<td class="{al[i] if al[i] != "p" else "l"}">{self.inline(c.strip())}</td>'
                          for i, c in enumerate(cells))
            rows.append(f'<tr class="{cls}{" gap" if gap else ""}">{tds}</tr>')
            pending, gap = "", False
        return "<table>" + "".join(rows) + "</table>"

    def list_(self, env, body):
        tag = "ol" if env == "enumerate" else "ul"
        items = re.split(r"\\item\s+", body)[1:]
        return f"<{tag}>" + "".join(f"<li>{''.join(self.body(i.strip()))}</li>" for i in items) + f"</{tag}>"

    def refs(self, body):
        items = re.split(r"\\item\s+", body)[1:]
        return '<div class="refs">' + "".join(f"<p>{self.inline(i.strip())}</p>" for i in items) + "</div>"

    def body(self, s):
        token = re.compile(
            r"\\begin\{(equation|align|enumerate|itemize|table\*?|list)\}(.*?)\\end\{\1\}"
            r"|\\section\*?\{([^}]*)\}", re.S)
        out, i = [], 0
        def para(chunk):
            chunk = re.sub(r"\\(vspace|setlength)\{[^}]*\}(\{[^}]*\})?|\\(scriptsize|footnotesize|small|centering)\b", "", chunk)
            for p in re.split(r"\n\s*\n", chunk):
                if p.strip():
                    out.append(f"<p>{self.inline(p.strip())}</p>")
        for m in token.finditer(s):
            para(s[i:m.start()])
            i = m.end()
            env = m.group(1)
            if env is None:
                out.append(f"<h2>{self.inline(m.group(3))}</h2>")
            elif env == "equation":
                out.append(self.equation(m.group(2)))
            elif env == "align":
                out.append(self.align(m.group(2)))
            elif env in ("enumerate", "itemize"):
                out.append(self.list_(env, m.group(2)))
            elif env == "list":
                out.append(self.refs(m.group(2)))
            else:
                out.append(self.table(m.group(2), env.endswith("*")))
        para(s[i:])
        return out

    def render(self):
        head = re.search(r"\\twocolumn\[\{(.*?)\}\]\s*\n", self.tex, re.S).group(1)
        title = re.search(r"\\bfseries (.*?)\}\\\\", head, re.S).group(1)
        author = re.search(r"\\normalsize (.*?)\}", head).group(1)
        metas = re.findall(r"\{\\small (.*?)\}(?:\\\\(?:\[\d+pt\])?)?\n", head)
        abstract = re.search(r"\\small\n(.*?)\n\\end\{minipage\}", head, re.S).group(1)
        main = self.tex[self.tex.index("}]", self.tex.index("\\twocolumn[")) + 2:self.tex.index("\\end{document}")]
        blocks = self.body(main)
        return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{self.text(title)}</title>
<link rel="stylesheet" href="katex.min.css"><style>{CSS}</style></head><body>
<header><h1>{self.inline(title)}</h1><div class="author">{self.inline(author)}</div>
{''.join(f'<div class="meta">{self.inline(x)}</div>' for x in metas)}
<div class="abstract">{self.inline(abstract)}</div></header>
<main>{''.join(blocks)}</main>
<script src="katex.min.js"></script><script>
document.querySelectorAll('.tex').forEach(function(e){{var d=e.classList.contains('d');
katex.render(e.textContent,e,{{displayMode:d,throwOnError:true,strict:false}});}});
document.body.dataset.done='1';
</script></body></html>"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chrome", default=shutil.which("chromium") or "chromium")
    ap.add_argument("--out", default=str(ROOT / "Public" / "papers"))
    ap.add_argument("--html-only", action="store_true")
    a = ap.parse_args()
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        td = pathlib.Path(td)
        shutil.copy(KATEX / "katex.min.css", td)
        shutil.copy(KATEX / "katex.min.js", td)
        shutil.copytree(KATEX / "fonts", td / "fonts")
        for tex in sorted(HERE.glob("*.tex")):
            html = td / (tex.stem + ".html")
            html.write_text(Doc(tex.read_text()).render())
            pdf = out / (tex.stem + ".pdf")
            subprocess.run([a.chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
                            "--no-pdf-header-footer", "--virtual-time-budget=20000",
                            f"--print-to-pdf={pdf}", f"file://{html}"],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(pdf, pdf.stat().st_size)


if __name__ == "__main__":
    main()
