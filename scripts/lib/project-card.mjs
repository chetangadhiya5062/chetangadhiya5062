import { ANIM_CSS, Doc, measure, r1, wrap } from "./svg.mjs";

/** "Attention": one card per featured project. */
export function projectCard(theme, p) {
  const W = 440, H = 214;
  const d = new Doc(W, H, theme, {
    title: `${p.name} — ${p.kicker}`,
    desc: `${p.oneLiner} Stack: ${p.stack.join(", ")}. ${p.metric.value} ${p.metric.label}.`,
  });
  d.css = ANIM_CSS;
  const t = theme;

  d.raw(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.surface}" stroke="${t.line}"/>`);
  const base = (p.index - 1) * 0.15;
  // faint index numeral (the site's big "01")
  d.text(String(p.index).padStart(2, "0"), { font: "displayB", size: 128, x: W - 14, y: 112, fill: t.line, anchor: "end", opacity: t.name === "dark" ? 0.8 : 0.9, attr: `class="fade" style="--d:${base}s"` });
  // attention lines: tiny curves hinting at the hover interaction on the site
  [0, 1, 2].forEach((k) => d.raw(`<path d="M${W - 70},${164 + k * 8} C${W - 40},${164 + k * 8} ${W - 30},${186 + k * 3} ${W - 8},${190 + k * 3}" fill="none" stroke="${t.cyan}" stroke-opacity="${0.7 - k * 0.15}" stroke-width="1.2" class="flow" style="animation-duration:${1.8 + k * 0.5}s"/>`));

  d.text(p.kicker.toUpperCase(), { font: "mono", size: 10, x: 22, y: 32, fill: t.lime, ls: 1.2, attr: `class="fade" style="--d:${base}s"` });
  d.text(p.name, { font: "displayM", size: 25, x: 22, y: 66, fill: t.ink, attr: `class="rise" style="--d:${base + 0.1}s"` });

  wrap(p.oneLiner.replace(/\s*→\s*/g, " to "), "displayM", 13, 330).slice(0, 3).forEach((line, i) => d.text(line, { font: "displayM", size: 13, x: 22, y: 92 + i * 18, fill: t.muted, attr: `class="rise" style="--d:${base + 0.2 + i * 0.08}s"` }));

  // stack chips
  let cx = 22;
  const cy = 156;
  let ci = 0;
  p.stack.forEach((s) => {
    const w = measure(s, "mono", 10) + 18;
    if (cx + w > W - 22) return;
    d.raw(`<g class="pop" style="--i:${ci++};--d:${base + 0.5}s"><rect x="${r1(cx)}" y="${cy}" width="${r1(w)}" height="22" rx="11" fill="none" stroke="${t.line}"/>`);
    d.text(s, { font: "mono", size: 10, x: cx + 9, y: cy + 15, fill: t.muted });
    d.raw("</g>");
    cx += w + 6;
  });

  // metric
  d.text(p.metric.value, { font: "displayB", size: 22, x: 22, y: 198, fill: t.lime, attr: `class="rise" style="--d:${base + 0.8}s"` });
  const mw = measure(p.metric.value, "displayB", 22);
  d.text(p.metric.label, { font: "mono", size: 10, x: 22 + mw + 10, y: 198, fill: t.muted, attr: `class="fade" style="--d:${base + 1}s"` });
  // a soft light sweep crosses the card now and then (offset per card so they never sync)
  d.defs.push(`<linearGradient id="shine" x1="0" x2="1"><stop offset="0" stop-color="${t.lime}" stop-opacity="0"/><stop offset="0.5" stop-color="${t.lime}" stop-opacity="${t.name === "dark" ? 0.09 : 0.14}"/><stop offset="1" stop-color="${t.lime}" stop-opacity="0"/></linearGradient><clipPath id="cardclip"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="13"/></clipPath>`);
  d.raw(`<g clip-path="url(#cardclip)"><rect class="sweep" style="--i:${p.index};--w:${W + 20}px" x="0" y="0" width="120" height="${H}" fill="url(#shine)" transform="skewX(-18)"/></g>`);
  return d.toString();
}
