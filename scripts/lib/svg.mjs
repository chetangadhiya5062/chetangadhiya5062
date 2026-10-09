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
  text(str, { font = "display", size = 14, x = 0, y = 0, fill, anchor = "start", ls = 0, opacity, collect } = {}) {
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
    const g = `<g ${attrs} transform="translate(${r1(sx)} ${r1(y)}) scale(${k})">${out.join("")}</g>`;
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

/** Shared animation CSS (works inside <img>, no JS). */
export const ANIM_CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes shimmer{0%,100%{opacity:.15}50%{opacity:.9}}
@keyframes dash{to{stroke-dashoffset:-24}}
.pulse{animation:pulse 2.4s ease-in-out infinite}
.shimmer{animation:shimmer 5s ease-in-out infinite}
.shimmer2{animation:shimmer 5s ease-in-out 2.5s infinite}
.flow{stroke-dasharray:4 8;animation:dash 2.2s linear infinite}
`;
