import { ANIM_CSS, Doc, measure, r1 } from "./svg.mjs";

const clip = (s, max) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);

/** Deterministic pseudo-random so the artwork is stable between builds. */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

export function hero(theme, { status, openToWork }) {
  const W = 1200, H = 300;
  const d = new Doc(W, H, theme, {
    title: "Chetan Gadhiya — AI Engineer",
    desc: "GenAI and agentic systems built to run in production. Forward Pass: input layer.",
  });
  d.css = ANIM_CSS;
  const t = theme;

  d.raw(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.base}" stroke="${t.line}"/>`);

  // --- background network: five layers, sparse synapses (right half) -------------------------
  const rand = rng(42);
  const layers = [4, 6, 6, 5, 3];
  const xs = layers.map((_, i) => 700 + i * 112);
  const nodes = layers.map((n, li) =>
    Array.from({ length: n }, (_, i) => ({ x: xs[li], y: 40 + ((H - 80) * (i + 0.5)) / n })),
  );
  const lines = [];
  for (let li = 0; li < layers.length - 1; li++)
    for (const a of nodes[li]) for (const b of nodes[li + 1]) if (rand() < 0.28) lines.push(`M${r1(a.x)},${r1(a.y)}L${r1(b.x)},${r1(b.y)}`);
  d.raw(`<path d="${lines.join("")}" fill="none" stroke="${t.line}" stroke-width="1" opacity="${t.name === "dark" ? 0.55 : 0.6}"/>`);
  // one highlighted path flows through the network (the "forward pass")
  const hot = nodes.map((col) => col[Math.floor(rand() * col.length)]);
  d.raw(`<path class="flow" d="M${hot.map((p) => `${r1(p.x)},${r1(p.y)}`).join("L")}" fill="none" stroke="${t.lime}" stroke-width="1.4" opacity="0.8"/>`);
  nodes.flat().forEach((p) => d.raw(`<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="3" fill="${t.base}" stroke="${t.muted}" stroke-opacity="0.55"/>`));
  hot.forEach((p, i) => d.raw(`<circle class="${i % 2 ? "pulse" : ""}" cx="${r1(p.x)}" cy="${r1(p.y)}" r="4" fill="${t.lime}"/>`));

  // --- eyebrow --------------------------------------------------------------------------------
  let ex = 48;
  ex += d.text("01", { font: "mono", size: 12, x: ex, y: 52, fill: t.lime, ls: 1.6 }) + 14;
  d.raw(`<rect x="${ex}" y="47.5" width="36" height="1" fill="${t.line}"/>`);
  ex += 50;
  d.text("INPUT · THE FORWARD PASS BEGINS", { font: "mono", size: 12, x: ex, y: 52, fill: t.muted, ls: 1.6 });

  // --- name built from a dot grid (mask + pattern) --------------------------------------------
  const size = 98;
  const lines2 = ["CHETAN", "GADHIYA"];
  const maskId = "name-mask";
  const nameMarkup = [];
  lines2.forEach((l, i) => {
    const { markup } = d.text(l, { font: "displayB", size, x: 44, y: 158 + i * 88, ls: -1, collect: true });
    nameMarkup.push(markup);
  });
  d.defs.push(`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><g fill="#fff">${nameMarkup.join("")}</g></mask>`);
  d.defs.push(`<pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.75" fill="${t.lime}"/></pattern>`);
  d.defs.push(`<pattern id="dots2" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.2" fill="${t.cyan}"/></pattern>`);
  d.raw(`<g mask="url(#${maskId})">
<rect x="0" y="0" width="${W}" height="${H}" fill="${t.lime}" opacity="${t.name === "dark" ? 0.1 : 0.12}"/>
<rect x="0" y="0" width="${W}" height="${H}" fill="url(#dots)"/>
<rect class="shimmer" x="0" y="0" width="${W}" height="${H}" fill="url(#dots2)"/>
</g>`);

  d.text("Gandhinagar, India  ·  B.Tech CSE @ PDEU  ·  CGPA 8.71", { font: "mono", size: 12, x: 48, y: 280, fill: t.muted });

  // --- headline --------------------------------------------------------------------------------
  const hl = ["AI Engineer —", "GenAI & agentic systems", "built to run in production."];
  hl.forEach((line, i) => d.text(line, { font: "displayM", size: 27, x: 700, y: 92 + i * 36, fill: i === 0 ? t.lime : t.ink }));

  // --- status pills ----------------------------------------------------------------------------
  const label = clip(status?.trim() || "building agentic systems", 34);
  const pill1 = 32 + measure(`currently: ${label}`, "mono", 12);
  d.raw(`<rect x="700" y="214" width="${r1(pill1 + 16)}" height="30" rx="15" fill="${t.surface}" stroke="${t.line}"/>`);
  d.raw(`<circle class="pulse" cx="718" cy="229" r="3.5" fill="${t.lime}"/>`);
  const w1 = d.text("currently:", { font: "mono", size: 12, x: 730, y: 233, fill: t.ink });
  d.text(label, { font: "mono", size: 12, x: 730 + w1 + 7, y: 233, fill: t.muted });
  let px = 700 + pill1 + 16 + 12;
  if (openToWork) {
    const w = measure("open to work", "mono", 12) + 28;
    d.raw(`<rect x="${r1(px)}" y="214" width="${r1(w)}" height="30" rx="15" fill="none" stroke="${t.lime}" stroke-opacity="0.6"/>`);
    d.text("open to work", { font: "mono", size: 12, x: px + 14, y: 233, fill: t.lime });
  }
  return d.toString();
}
