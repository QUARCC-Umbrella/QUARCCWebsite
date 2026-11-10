// Adds a trailing slash to internal page links in Markdown ("/blog/x" -> "/blog/x/").
// The host 301-redirects slashless page URLs, so linking to them directly avoids a redirect hop.
// Files ("/papers/x.pdf"), anchors and query strings are left alone.
export default function rehypeTrailingSlash() {
  const fix = (href) => {
    if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return href;
    const match = /^([^?#]*)(.*)$/.exec(href);
    const path = match[1];
    const rest = match[2];
    if (path.endsWith("/") || /\.[a-z0-9]+$/i.test(path)) return href;
    return `${path}/${rest}`;
  };
  const walk = (node) => {
    if (node.type === "element" && node.tagName === "a" && node.properties) {
      node.properties.href = fix(node.properties.href);
    }
    (node.children || []).forEach(walk);
  };
  return (tree) => walk(tree);
}
