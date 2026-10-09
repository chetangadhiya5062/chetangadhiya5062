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
  // faint index numeral (the site's big "01")
  d.text(String(p.index).padStart(2, "0"), { font: "displayB", size: 128, x: W - 14, y: 112, fill: t.line, anchor: "end", opacity: t.name === "dark" ? 0.8 : 0.9 });
  // attention lines: tiny curves hinting at the hover interaction on the site
  [0, 1, 2].forEach((k) => d.raw(`<path d="M${W - 70},${164 + k * 8} C${W - 40},${164 + k * 8} ${W - 30},${186 + k * 3} ${W - 8},${190 + k * 3}" fill="none" stroke="${t.cyan}" stroke-opacity="${0.55 - k * 0.15}" stroke-width="1"/>`));

  d.text(p.kicker.toUpperCase(), { font: "mono", size: 10, x: 22, y: 32, fill: t.lime, ls: 1.2 });
  d.text(p.name, { font: "displayM", size: 25, x: 22, y: 66, fill: t.ink });

  wrap(p.oneLiner.replace(/s*→s*/g, " to "), "displayM", 13, 330).slice(0, 3).forEach((line, i) => d.text(line, { font: "displayM", size: 13, x: 22, y: 92 + i * 18, fill: t.muted }));

  // stack chips
  let cx = 22;
  const cy = 156;
  p.stack.forEach((s) => {
    const w = measure(s, "mono", 10) + 18;
    if (cx + w > W - 22) return;
    d.raw(`<rect x="${r1(cx)}" y="${cy}" width="${r1(w)}" height="22" rx="11" fill="none" stroke="${t.line}"/>`);
    d.text(s, { font: "mono", size: 10, x: cx + 9, y: cy + 15, fill: t.muted });
    cx += w + 6;
  });

  // metric
  d.text(p.metric.value, { font: "displayB", size: 22, x: 22, y: 198, fill: t.lime });
  const mw = measure(p.metric.value, "displayB", 22);
  d.text(p.metric.label, { font: "mono", size: 10, x: 22 + mw + 10, y: 198, fill: t.muted });
  return d.toString();
}
