import { useEffect, useRef } from "react";

// Light to heavy. The space keeps the far end of the fill airy.
const RAMP = " .:-=+*#%@";
// 4x4 ordered-dither thresholds, centred on 0.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
const FONT = '"Geist Mono", ui-monospace, monospace';

// Stable 0..1 hash per grid cell, so redraws keep the same texture.
function noise(col, row) {
  let h = Math.imul(col, 374761393) + Math.imul(row, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Line height at x (0..1) by linear interpolation; points are sorted by x.
function lineAt(points, x) {
  let lo = 0;
  let hi = points.length - 1;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[hi][0]) return points[hi][1];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid][0] < x) lo = mid;
    else hi = mid;
  }
  const [x0, y0] = points[lo];
  const [x1, y1] = points[hi];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
}

/**
 * Decorative ASCII fill between a line and a baseline, drawn on a canvas so the
 * glyphs never become page text. Glyphs are heaviest along the line and thin out
 * with distance from it, dithered like the site's other ASCII art.
 *
 * points:   [[x, y], ...] as fractions (0..1) of the canvas box, sorted by x
 * baseline: y fraction the fill runs to (1 = bottom edge)
 * color:    hex colour of the line the fill sits under
 * size:     glyph size in CSS px
 */
export default function AsciiFill({ points, baseline = 1, color, size = 8, className = "", style }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !points || points.length < 2) return undefined;
    const [r, g, b] = hexToRgb(color);
    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${size}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const cw = size * 0.68;
      const ch = size * 0.98;
      const cols = Math.ceil(width / cw);
      const rows = Math.ceil(height / ch);
      const baseY = baseline * height;
      // Distance over which the glyphs fade from heavy to light.
      const span = Math.max(height * 0.85, ch * 4);

      for (let col = 0; col < cols; col++) {
        const cx = (col + 0.5) * cw;
        if (cx > points[points.length - 1][0] * width + cw * 0.5) break;
        const ly = lineAt(points, cx / width) * height;
        const above = ly <= baseY;
        for (let row = 0; row < rows; row++) {
          const cy = (row + 0.5) * ch;
          // Stay just clear of the line itself so the stroke reads cleanly.
          const inside = above ? cy >= ly + ch * 0.35 && cy <= baseY : cy <= ly - ch * 0.35 && cy >= baseY;
          if (!inside) continue;
          const d = Math.abs(cy - ly);
          const level = Math.max(0, 1 - d / span) ** 1.25;
          // Ordered dither plus a little per-cell noise, so the texture doesn't stripe.
          const v = level + BAYER[(row % 4) * 4 + (col % 4)] * 0.4 + (noise(col, row) - 0.5) * 0.35;
          const index = Math.min(RAMP.length - 1, Math.max(0, Math.floor(v * RAMP.length)));
          const glyph = RAMP[index];
          if (glyph === " ") continue;
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.16 + 0.5 * level).toFixed(3)})`;
          ctx.fillText(glyph, cx, cy);
        }
      }
    };

    // Draw now with the fallback font, then again once Geist Mono is ready.
    draw();
    document.fonts?.load(`${size}px "Geist Mono"`).then(draw, () => {});
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [points, baseline, color, size]);

  return <canvas ref={ref} className={`ascii-fill ${className}`} style={style} aria-hidden="true" />;
}
