import { ANIM_CSS, Doc, measure, r1 } from "./svg.mjs";

/** "Parameters": the six-layer skill stack as one compact graphic (not a badge wall). */
export function skills(theme, groups) {
  const ROW = 40, W = 1200, H = 28 + groups.length * ROW + 12;
  const d = new Doc(W, H, theme, {
    title: "Skills as a layer stack",
    desc: groups.map((g) => `${g.layer} ${g.label}: ${g.skills.join(", ")}`).join(". "),
  });
  d.css = ANIM_CSS;
  const t = theme;
  d.raw(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.surface}" stroke="${t.line}"/>`);

  groups.forEach((g, i) => {
    const y = 28 + i * ROW + 24;
    if (i) d.raw(`<path d="M24,${y - 27}H${W - 24}" stroke="${t.line}"/>`);
    d.text(g.layer, { font: "mono", size: 12, x: 28, y, fill: t.lime });
    d.text(g.label, { font: "displayM", size: 17, x: 66, y: y + 1, fill: t.ink });
    let x = 280;
    g.skills.forEach((s, k) => {
      d.raw(`<circle cx="${x + 2}" cy="${y - 4}" r="2" fill="${t.line === "#1c2230" ? "#2a3347" : "#b1bac4"}"/>`);
      x += 12 + d.text(s, { font: "mono", size: 12, x: x + 12, y, fill: t.muted }) + 14;
    });
    // depth bar: deeper layers are darker, like the site's rail
    d.raw(`<rect x="${W - 36}" y="${y - 12}" width="6" height="14" rx="3" fill="${t.lime}" fill-opacity="${r1(1 - i * 0.14)}"/>`);
  });
  return d.toString();
}
