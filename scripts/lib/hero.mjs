import { ANIM_CSS, Doc, measure, r1, sampleText } from "./svg.mjs";

const clip = (s, max) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);

/** Deterministic pseudo-random so the artwork is stable between builds. */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function ago(iso, now) {
  const s = Math.max(0, (new Date(now) - new Date(iso)) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 60) return `${Math.round(s / 86400)}d ago`;
  return `${Math.round(s / (86400 * 30))}mo ago`;
}

/** What the status pill cycles through: the owner's status, the last commit, the latest article. */
function tickerMessages(feed) {
  const msgs = [{ k: "currently:", v: clip(feed.profile.status?.trim() || "building agentic systems", 40) }];
  const commit = feed.latest.find((x) => x.type === "github");
  if (commit) {
    const [repo, ...rest] = commit.title.split(": ");
    msgs.push({ k: "last commit:", v: clip(`${repo} · ${ago(commit.date, feed.generatedAt)}`, 40) });
  }
  const post = feed.latest.find((x) => x.type !== "github");
  if (post) msgs.push({ k: post.type === "medium" ? "latest article:" : "latest post:", v: clip(post.title, 34) });
  return msgs;
}

export function hero(theme, feed) {
  const W = 1200, H = 300;
  const d = new Doc(W, H, theme, {
    title: "Chetan Gadhiya — AI Engineer",
    desc: "GenAI and agentic systems built to run in production. Forward Pass: input layer. Animated: the name assembles from dots, the headline streams in token by token.",
  });
  d.css = ANIM_CSS;
  const t = theme;

  d.raw(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.base}" stroke="${t.line}"/>`);

  // --- background network: five layers, sparse synapses (right half) -------------------------
  const rand = rng(42);
  const layers = [4, 6, 6, 5, 3];
  const xs = layers.map((_, i) => 700 + i * 112);
  const nodes = layers.map((n, li) => Array.from({ length: n }, (_, i) => ({ x: xs[li], y: 40 + ((H - 80) * (i + 0.5)) / n })));
  const lines = [];
  for (let li = 0; li < layers.length - 1; li++)
    for (const a of nodes[li]) for (const b of nodes[li + 1]) if (rand() < 0.28) lines.push(`M${r1(a.x)},${r1(a.y)}L${r1(b.x)},${r1(b.y)}`);
  d.raw(`<path class="fade" style="--d:1.2s" d="${lines.join("")}" fill="none" stroke="${t.line}" stroke-width="1" opacity="${t.name === "dark" ? 0.55 : 0.6}"/>`);
  const hot = nodes.map((col) => col[Math.floor(rand() * col.length)]);
  const hotPath = `M${hot.map((p) => `${r1(p.x)},${r1(p.y)}`).join("L")}`;
  d.raw(`<path id="hot" class="flow" d="${hotPath}" fill="none" stroke="${t.lime}" stroke-width="1.4" opacity="0.8"/>`);
  nodes.flat().forEach((p) => d.raw(`<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="3" fill="${t.base}" stroke="${t.muted}" stroke-opacity="0.55"/>`));
  hot.forEach((p, i) => d.raw(`<circle class="${i % 2 ? "pulse" : ""}" cx="${r1(p.x)}" cy="${r1(p.y)}" r="4" fill="${t.lime}"/>`));
  // signals travelling the forward pass (SMIL; works in <img>, ignored when motion is reduced by the browser)
  [0, 1.6].forEach((begin) =>
    d.raw(`<circle r="4.5" opacity="0" fill="${t.cyan}"><animateMotion dur="3.2s" begin="${begin + 1.4}s" repeatCount="indefinite" rotate="auto"><mpath href="#hot"/></animateMotion><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="3.2s" begin="${begin + 1.4}s" repeatCount="indefinite"/></circle>`),
  );

  // --- eyebrow --------------------------------------------------------------------------------
  let ex = 48;
  const eb = [];
  ex += d.text("01", { font: "mono", size: 12, x: ex, y: 52, fill: t.lime, ls: 1.6, attr: 'class="fade"' }) + 14;
  d.raw(`<rect class="fade" x="${ex}" y="47.5" width="36" height="1" fill="${t.line}"/>`);
  ex += 50;
  d.text("INPUT · THE FORWARD PASS BEGINS", { font: "mono", size: 12, x: ex, y: 52, fill: t.muted, ls: 1.6, attr: 'class="fade" style="--d:.15s"' });

  // --- name: a field of dots that assembles, then shimmers ------------------------------------
  const size = 98;
  const names = ["CHETAN", "GADHIYA"];
  const BAND = 36;
  names.forEach((line, li) => {
    const y = 158 + li * 88;
    d.text(line, { font: "displayB", size, x: 44, y, ls: -1, fill: t.lime, opacity: t.name === "dark" ? 0.07 : 0.1 });
    const pts = sampleText(line, { font: "displayB", size, x: 44, y, ls: -1, step: 5 });
    const groups = new Map();
    const cyan = new Map();
    pts.forEach(([px, py], n) => {
      const band = Math.floor((px - 44) / BAND);
      const sub = (Math.floor(py / 5) + band) % 2;
      const key = `${band}-${sub}`;
      (groups.get(key) || groups.set(key, []).get(key)).push([px, py]);
      if ((px * 7 + py * 13) % 11 === 0) (cyan.get(band) || cyan.set(band, []).get(band)).push([px, py]);
    });
    // zero-length segments with round caps draw as dots; relative moves keep the path data short
    const dots = (pts) => { let lx = 0, ly = 0; return pts.map(([x, y], k) => { const r = k ? `m${x - lx} ${y - ly}h0` : `M${x} ${y}h0`; lx = x; ly = y; return r; }).join(""); };
    [...groups].forEach(([key, segs]) => {
      const [band, sub] = key.split("-").map(Number);
      const i = band * 2 + sub + li * 3;
      const dx = Math.round(180 + rand() * 360), dy = Math.round((rand() - 0.5) * 140);
      d.raw(`<path class="asm" style="--i:${i};--dx:${dx}px;--dy:${dy}px" d="${dots(segs)}" stroke="${t.lime}" stroke-width="3.5" stroke-linecap="round"/>`);
    });
    [...cyan].forEach(([band, segs]) =>
      d.raw(`<path class="tw" style="--i:${band + li * 5}" d="${dots(segs)}" stroke="${t.cyan}" stroke-width="4.4" stroke-linecap="round"/>`),
    );
  });

  d.text("Gandhinagar, India  ·  B.Tech CSE @ PDEU  ·  CGPA 8.71", { font: "mono", size: 12, x: 48, y: 280, fill: t.muted, attr: 'class="fade" style="--d:1.6s"' });

  // --- headline streaming in token by token, with a caret that follows ------------------------
  const hl = ["AI Engineer —", "GenAI & agentic systems", "built to run in production."];
  const space = measure(" ", "displayM", 27);
  let n = 0;
  const totalTokens = hl.reduce((a, l) => a + l.split(" ").length, 0);
  hl.forEach((line, i) => {
    let x = 700;
    const y = 92 + i * 36;
    line.split(" ").forEach((word) => {
      const w = d.text(word, { font: "displayM", size: 27, x, y, fill: i === 0 ? t.lime : t.ink, attr: `class="tk" style="--i:${n}"` });
      d.raw(`<rect class="cr${n === totalTokens - 1 ? " last" : ""}" style="--i:${n}" x="${r1(x + w + 3)}" y="${y - 21}" width="9" height="25" fill="${t.lime}"/>`);
      x += w + space;
      n++;
    });
  });

  // --- status ticker (cycles: status / last commit / latest article) --------------------------
  const msgs = tickerMessages(feed);
  const width = Math.max(...msgs.map((m) => measure(`${m.k} ${m.v}`, "mono", 12))) + 40;
  d.raw(`<g class="fade" style="--d:1.8s"><rect x="700" y="214" width="${r1(width)}" height="30" rx="15" fill="${t.surface}" stroke="${t.line}"/><circle class="pulse" cx="718" cy="229" r="3.5" fill="${t.lime}"/></g>`);
  msgs.forEach((m, i) => {
    const wk = measure(m.k, "mono", 12);
    d.text(m.k, { font: "mono", size: 12, x: 730, y: 233, fill: t.ink, attr: msgs.length > 1 ? `class="tick${i === 0 ? " first" : ""}" style="--i:${i}"` : "" });
    d.text(m.v, { font: "mono", size: 12, x: 730 + wk + 7, y: 233, fill: t.muted, attr: msgs.length > 1 ? `class="tick${i === 0 ? " first" : ""}" style="--i:${i}"` : "" });
  });
  if (feed.profile.openToWork) {
    const px = 700 + width + 12;
    const w = measure("open to work", "mono", 12) + 28;
    d.raw(`<g class="fade" style="--d:2s"><rect x="${r1(px)}" y="214" width="${r1(w)}" height="30" rx="15" fill="none" stroke="${t.lime}" stroke-opacity="0.6"/></g>`);
    d.text("open to work", { font: "mono", size: 12, x: px + 14, y: 233, fill: t.lime, attr: 'class="fade" style="--d:2s"' });
  }
  return d.toString();
}
