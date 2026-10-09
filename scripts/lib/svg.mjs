// Tiny SVG builder: all text is converted to glyph outlines (GitHub renders SVG <img> without webfonts),
// and each glyph is defined once per file and reused with <use>, which keeps files small.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fonts");
const FILES = {
  display: "space-grotesk-latin-400-normal.woff",
  displayM: "space-grotesk-latin-500-normal.woff",
  displayB: "space-grotesk-latin-700-normal.woff",
  mono: "jetbrains-mono-latin-400-normal.woff",
  monoM: "jetbrains-mono-latin-500-normal.woff",
};
const fonts = {};
for (const [k, f] of Object.entries(FILES)) {
  const b = fs.readFileSync(path.join(dir, f));
  fonts[k] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const r1 = (n) => Math.round(n * 10) / 10;

/** Glyph outline at quarter font-unit resolution as compact relative path data. */
function compactPath(cmds) {
  let px = 0, py = 0, sx = 0, sy = 0;
  const q = (v) => Math.round(v / 4);
  const out = [];
  const rel = (x, y) => { const dx = x - px, dy = y - py; px = x; py = y; return `${dx} ${dy}`; };
  for (const c of cmds) {
    if (c.type === "M") { const x = q(c.x), y = q(c.y); out.push(`M${x} ${y}`); px = sx = x; py = sy = y; }
    else if (c.type === "L") { const x = q(c.x), y = q(c.y), dx = x - px, dy = y - py; px = x; py = y; if (dx && dy) out.push(`l${dx} ${dy}`); else if (dx) out.push(`h${dx}`); else if (dy) out.push(`v${dy}`); }
    else if (c.type === "Q") { const x0 = px, y0 = py, x = q(c.x), y = q(c.y); out.push(`q${q(c.x1) - x0} ${q(c.y1) - y0} ${x - x0} ${y - y0}`); px = x; py = y; }
    else if (c.type === "C") { const x0 = px, y0 = py; const x1 = q(c.x1), y1 = q(c.y1), x2 = q(c.x2), y2 = q(c.y2), x = q(c.x), y = q(c.y); out.push(`c${x1 - x0} ${y1 - y0} ${x2 - x0} ${y2 - y0} ${x - x0} ${y - y0}`); px = x; py = y; }
    else if (c.type === "Z") { out.push("z"); px = sx; py = sy; }
  }
  return out.join("").replace(/ -/g, "-");
}

/** Width of a string in px (kerning + letter spacing). */
export function measure(str, fontKey, size, ls = 0) {
  const font = fonts[fontKey];
  const glyphs = font.stringToGlyphs(str);
  let w = 0;
  glyphs.forEach((g, i) => {
    w += g.advanceWidth;
    if (i < glyphs.length - 1) w += font.getKerningValue(g, glyphs[i + 1]);
  });
  return (w * size) / font.unitsPerEm + ls * glyphs.length;
}

/** Greedy word wrap. */
export function wrap(str, fontKey, size, maxWidth, ls = 0) {
  const lines = [];
  let cur = "";
  for (const word of str.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && measure(next, fontKey, size, ls) > maxWidth) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export const THEMES = {
  dark: { name: "dark", base: "#07080b", surface: "#0e1117", line: "#1c2230", ink: "#e8ecf3", muted: "#8b93a7", lime: "#c6ff3d", cyan: "#3de0ff", onLime: "#07080b", cellEmpty: "#161b26" },
  light: { name: "light", base: "#ffffff", surface: "#f6f8fa", line: "#d0d7de", ink: "#1f2328", muted: "#59636e", lime: "#4d7c0f", cyan: "#0e7490", onLime: "#ffffff", cellEmpty: "#e6eaee" },
};

export class Doc {
  constructor(w, h, theme, { title, desc } = {}) {
    this.w = w;
    this.h = h;
    this.t = theme;
    this.title = title;
    this.desc = desc;
    this.glyphs = new Map(); // id -> d
    this.defs = [];
    this.body = [];
    this.css = "";
    this.uid = 0;
  }

  id(p = "i") {
    return `${p}${this.uid++}`;
  }

  raw(s) {
    this.body.push(s);
  }

  /** Emits one <g> per text run with integer glyph offsets (font units / 4); returns the width. */
  text(str, { font = "display", size = 14, x = 0, y = 0, fill, anchor = "start", ls = 0, opacity, collect, attr = "" } = {}) {
    const f = fonts[font];
    const glyphs = f.stringToGlyphs(str);
    const upm = f.unitsPerEm;
    const width = measure(str, font, size, ls);
    const sx = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
    const lsUnits = (ls * upm) / size;
    let cx = 0; // in font units
    const out = [];
    glyphs.forEach((g, i) => {
      const gid = `${font}${g.index}`;
      if (g.path && g.path.commands.length) {
        if (!this.glyphs.has(gid)) this.glyphs.set(gid, compactPath(g.getPath(0, 0, upm).commands));
        out.push(`<use href="#${gid}" x="${Math.round(cx / 4)}"/>`);
      }
      cx += g.advanceWidth + lsUnits;
      if (i < glyphs.length - 1) cx += f.getKerningValue(g, glyphs[i + 1]);
    });
    const k = Math.round(((size * 4) / upm) * 10000) / 10000;
    const attrs = [fill ? `fill="${fill}"` : "", opacity !== undefined ? `opacity="${opacity}"` : ""].filter(Boolean).join(" ");
    const g = `<g ${attrs}${attr ? ` ${attr}` : ""} transform="translate(${r1(sx)} ${r1(y)}) scale(${k})">${out.join("")}</g>`;
    if (collect) return { markup: g, width };
    this.body.push(g);
    return width;
  }

  toString() {
    const defs = [...this.glyphs].map(([id, d]) => `<path id="${id}" d="${d}"/>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" role="img" aria-labelledby="t d">
<title id="t">${esc(this.title || "")}</title><desc id="d">${esc(this.desc || "")}</desc>
<style>${this.css}@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>
<defs>${defs}${this.defs.join("")}</defs>
${this.body.join("\n")}
</svg>
`;
  }
}

/**
 * Shared animation CSS (works inside <img>, no JS). Every element's BASE style is its final, fully visible state;
 * entrance animations only define the "from" frame with fill-mode backwards, so reduced-motion
 * (animation: none) simply shows the finished graphic.
 */
export const ANIM_CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes shimmer{0%,100%{opacity:.1}50%{opacity:.95}}
@keyframes dash{to{stroke-dashoffset:-24}}
@keyframes rise{from{opacity:0;transform:translateY(14px)}}
@keyframes pop{from{opacity:0;transform:scale(.4)}}
@keyframes fade{from{opacity:0}}
@keyframes grow{from{transform:scaleX(0)}}
@keyframes assemble{from{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes tick{0%{opacity:0}5%{opacity:1}30%{opacity:1}35%{opacity:0}100%{opacity:0}}
@keyframes slot{0%,100%{opacity:1}}
@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}
@keyframes scan{from{transform:translateX(-80px)}to{transform:translateX(var(--w))}}
@keyframes sweep{0%{transform:translateX(-140px)}60%,100%{transform:translateX(var(--w,560px))}}
@keyframes frame{0%,99%{opacity:1}100%{opacity:0}}
.pulse{animation:pulse 2.4s ease-in-out infinite}
.tw{animation:twinkle 3.2s ease-in-out infinite;animation-delay:calc(var(--i,0)*.37s)}
.shimmer{animation:shimmer 5s ease-in-out infinite}
.flow{stroke-dasharray:4 8;animation:dash 2.2s linear infinite}
.rise{animation:rise .8s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i,0)*.12s + var(--d,0s))}
.pop{animation:pop .45s cubic-bezier(.34,1.56,.64,1) backwards;animation-delay:calc(var(--i,0)*.07s + var(--d,0s));transform-box:fill-box;transform-origin:center}
.fade{animation:fade .8s ease-out backwards;animation-delay:calc(var(--i,0)*.1s + var(--d,0s))}
.grow{animation:grow 1.1s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i,0)*.15s + var(--d,0s));transform-box:fill-box;transform-origin:0 50%}
.asm{animation:assemble 1.1s cubic-bezier(.16,1,.3,1) backwards;animation-delay:calc(var(--i,0)*.05s)}
.tk{animation:fade .01s steps(1) backwards;animation-delay:calc(var(--i,0)*.11s + .9s)}
.cr{opacity:0;animation:slot .11s steps(1);animation-delay:calc(var(--i,0)*.11s + .9s)}
.cr.last{animation:blink 1.05s steps(1) infinite;animation-delay:calc(var(--i,0)*.11s + .9s);opacity:1}
.tick{opacity:0;animation:tick 12s ease-in-out infinite;animation-delay:calc(var(--i,0)*4s)}
.tick.first{opacity:1}
.scan{animation:scan 7s ease-in-out infinite;animation-delay:2.5s}
.sweep{animation:sweep 7s ease-in-out infinite;animation-delay:calc(var(--i,0)*1.3s + 3s)}
.fr{opacity:0;animation:frame .08s steps(1);animation-delay:calc(var(--i,0)*.08s + var(--d,0s))}
.fr.end{opacity:1;animation:fade .08s steps(1) backwards;animation-delay:calc(var(--i,0)*.08s + var(--d,0s))}
`;

/** Eased count-up frames for a number: returns the values to show (last one is the final value). */
export function countFrames(n, steps = 14) {
  return Array.from({ length: steps }, (_, k) => (k === steps - 1 ? n : Math.round(n * (1 - Math.pow(1 - (k + 1) / steps, 3)))));
}

/** Sample a string's glyph outlines on a grid (nonzero winding): returns [[x, y], ...] pixel positions. */
export function sampleText(str, { font = "displayB", size = 96, x = 0, y = 0, ls = 0, step = 5 } = {}) {
  const f = fonts[font];
  const glyphs = f.stringToGlyphs(str);
  const scale = size / f.unitsPerEm;
  const polys = [];
  let cx = 0;
  glyphs.forEach((g, i) => {
    const p = g.getPath(x + cx * scale, y, size);
    let cur = null, px = 0, py = 0;
    for (const c of p.commands) {
      if (c.type === "M") { cur = [[c.x, c.y]]; polys.push(cur); px = c.x; py = c.y; }
      else if (c.type === "L") { cur.push([c.x, c.y]); px = c.x; py = c.y; }
      else if (c.type === "Q") { for (let t = 1; t <= 6; t++) { const u = t / 6; cur.push([(1 - u) * (1 - u) * px + 2 * (1 - u) * u * c.x1 + u * u * c.x, (1 - u) * (1 - u) * py + 2 * (1 - u) * u * c.y1 + u * u * c.y]); } px = c.x; py = c.y; }
      else if (c.type === "C") { for (let t = 1; t <= 8; t++) { const u = t / 8, v = 1 - u; cur.push([v ** 3 * px + 3 * v * v * u * c.x1 + 3 * v * u * u * c.x2 + u ** 3 * c.x, v ** 3 * py + 3 * v * v * u * c.y1 + 3 * v * u * u * c.y2 + u ** 3 * c.y]); } px = c.x; py = c.y; }
    }
    cx += g.advanceWidth + (ls * f.unitsPerEm) / size;
    if (i < glyphs.length - 1) cx += f.getKerningValue(g, glyphs[i + 1]);
  });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const poly of polys) for (const [qx, qy] of poly) { minX = Math.min(minX, qx); maxX = Math.max(maxX, qx); minY = Math.min(minY, qy); maxY = Math.max(maxY, qy); }
  const inside = (tx, ty) => {
    let w = 0;
    for (const poly of polys) {
      for (let i = 0; i < poly.length; i++) {
        const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
        if (y1 <= ty) { if (y2 > ty && (x2 - x1) * (ty - y1) - (tx - x1) * (y2 - y1) > 0) w++; }
        else if (y2 <= ty && (x2 - x1) * (ty - y1) - (tx - x1) * (y2 - y1) < 0) w--;
      }
    }
    return w !== 0;
  };
  const pts = [];
  for (let ty = Math.ceil(minY / step) * step + step / 2; ty < maxY; ty += step)
    for (let tx = Math.ceil(minX / step) * step + step / 2; tx < maxX; tx += step) if (inside(tx, ty)) pts.push([tx, ty]);
  return pts;
}
