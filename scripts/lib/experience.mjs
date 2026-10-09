import { ANIM_CSS, Doc, measure, r1, wrap } from "./svg.mjs";

/** "Hidden layers": each role is a layer node; synapses connect them chronologically. */
export function experience(theme, roles) {
  const W = 1200, H = 236;
  const d = new Doc(W, H, theme, {
    title: "Experience as hidden layers",
    desc: roles.map((r) => `${r.period}: ${r.title.join(" ")}, ${r.org}`).join(". "),
  });
  d.css = ANIM_CSS;
  const t = theme;
  const n = roles.length;
  const cw = 252, gap = (W - 48 - n * cw) / (n - 1), top = 28, ch = 180;

  roles.forEach((r, i) => {
    const x = 24 + i * (cw + gap);
    if (i < n - 1) {
      const x1 = x + cw, x2 = x1 + gap, y = top + ch / 2;
      [-26, 0, 26].forEach((dy, k) => {
        d.raw(`<path d="M${r1(x1)},${y + dy * 0.4} C${r1(x1 + gap * 0.5)},${y + dy * 0.4} ${r1(x2 - gap * 0.5)},${y - dy * 0.4} ${r1(x2)},${y - dy * 0.4}" fill="none" stroke="${k === 1 ? t.lime : t.line}" stroke-width="${k === 1 ? 1.4 : 1}" ${k === 1 ? 'class="flow"' : ""} opacity="${k === 1 ? 0.85 : 1}"/>`);
      });
    }
    const last = i === n - 1;
    d.raw(`<rect x="${r1(x)}" y="${top}" width="${cw}" height="${ch}" rx="14" fill="${t.surface}" stroke="${last ? t.lime : t.line}" ${last ? 'stroke-opacity="0.7"' : ""}/>`);
    d.text(`H${i + 1}`, { font: "mono", size: 11, x: x + cw - 16, y: top + 28, fill: t.muted, anchor: "end", ls: 1 });
    d.text(r.period, { font: "mono", size: 11, x: x + 18, y: top + 28, fill: t.lime });
    r.title.forEach((line, k) => d.text(line, { font: "displayM", size: 19, x: x + 18, y: top + 62 + k * 24, fill: t.ink }));
    d.text(r.org, { font: "mono", size: 11, x: x + 18, y: top + 120, fill: t.muted });

    // "neurons": one dot per skill, then the first skills as text
    r.skills.slice(0, 7).forEach((_, k) => {
      const cx = x + 22 + k * 14;
      d.raw(`<circle cx="${cx}" cy="${top + 145}" r="3.2" fill="${k < 3 ? t.lime : "none"}" stroke="${t.lime}" stroke-opacity="${k < 3 ? 1 : 0.5}"/>`);
    });
    const sk = r.skills.slice(0, 3).join(" · ");
    d.text(sk.length > 34 ? r.skills.slice(0, 2).join(" · ") : sk, { font: "mono", size: 10, x: x + 18, y: top + 168, fill: t.muted });
  });
  return d.toString();
}
