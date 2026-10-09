// Local tool (not part of the workflow): builds 1280x640 social-preview cards as SVG, then rasterises to PNG
// with headless Chrome/Edge (GitHub's social preview needs PNG/JPG/GIF, < 1 MB). Usage: node scripts/social.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ANIM_CSS, Doc, THEMES, measure, r1, wrap } from "./lib/svg.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = JSON.parse(fs.readFileSync(path.join(root, "data", "static.json"), "utf8"));
const outDir = path.join(root, "assets", "social");
fs.mkdirSync(outDir, { recursive: true });

const cards = [
  ...S.projects.map((p) => ({ file: p.repo.split("/")[1], index: p.index, kicker: p.kicker, name: p.name, line: p.oneLiner.replace(/\s*→\s*/g, " to "), stack: p.stack, metric: p.metric })),
  {
    file: "chetan-portfolio", index: 5, kicker: "Portfolio · Next.js · WebGL", name: "Forward Pass",
    line: "Self-updating portfolio: live GitHub, LeetCode and Medium activity, a WebGL particle hero and a private admin.",
    stack: ["Next.js 16", "WebGL", "Supabase", "Vercel"], metric: { value: "92 / 100 / 96 / 100", label: "Lighthouse mobile" },
  },
];

function card(c) {
  const t = THEMES.dark;
  const W = 1280, H = 640;
  const d = new Doc(W, H, t, { title: `${c.name} — ${c.kicker}`, desc: c.line });
  d.css = ANIM_CSS;
  d.raw(`<rect width="${W}" height="${H}" fill="${t.base}"/>`);

  // dot field on the right, fading toward the left (the "input layer")
  d.defs.push(`<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="2.2" fill="${t.lime}"/></pattern>`);
  d.defs.push(`<linearGradient id="fade" x1="0" x2="1"><stop offset="0.35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.55"/></linearGradient>`);
  d.defs.push(`<mask id="fm"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>`);
  d.raw(`<rect width="${W}" height="${H}" fill="url(#dots)" mask="url(#fm)" opacity="0.5"/>`);
  // faint index numeral
  d.text(String(c.index).padStart(2, "0"), { font: "displayB", size: 420, x: W - 40, y: 470, fill: t.line, anchor: "end", opacity: 0.8 });

  let x = 80;
  x += d.text(String(c.index).padStart(2, "0"), { font: "mono", size: 18, x, y: 96, fill: t.lime, ls: 2 }) + 18;
  d.raw(`<rect x="${x}" y="86" width="48" height="2" fill="${t.line}"/>`);
  d.text(c.kicker.toUpperCase(), { font: "mono", size: 18, x: x + 66, y: 96, fill: t.muted, ls: 2 });

  const size = measure(c.name, "displayB", 120) > 760 ? 92 : 120;
  d.text(c.name, { font: "displayB", size, x: 76, y: 250, fill: t.ink, ls: -2 });
  wrap(c.line, "displayM", 34, 700).slice(0, 3).forEach((l, i) => d.text(l, { font: "displayM", size: 34, x: 80, y: 322 + i * 46, fill: t.muted }));

  let cx = 80;
  c.stack.forEach((s) => {
    const w = measure(s, "mono", 18) + 32;
    d.raw(`<rect x="${r1(cx)}" y="480" width="${r1(w)}" height="40" rx="20" fill="none" stroke="${t.line}" stroke-width="2"/>`);
    d.text(s, { font: "mono", size: 18, x: cx + 16, y: 506, fill: t.ink });
    cx += w + 12;
  });
  d.text(c.metric.value, { font: "displayB", size: 40, x: 80, y: 588, fill: t.lime });
  d.text(c.metric.label, { font: "mono", size: 18, x: 80 + measure(c.metric.value, "displayB", 40) + 18, y: 588, fill: t.muted });
  d.text("chetangadhiya.vercel.app", { font: "mono", size: 18, x: W - 60, y: 588, fill: t.muted, anchor: "end" });
  return d.toString();
}

const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].filter((p) => fs.existsSync(p));
if (!browsers.length) throw new Error("No Chrome/Edge found to rasterise PNGs");

for (const c of cards) {
  const svg = path.join(outDir, `${c.file}.svg`);
  const png = path.join(outDir, `${c.file}.png`);
  fs.writeFileSync(svg, card(c));
  const r = spawnSync(browsers[0], ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1280,640", `--screenshot=${png}`, pathToFileURL(svg).href], { stdio: "ignore" });
  console.log(c.file, r.status === 0 && fs.existsSync(png) ? `${(fs.statSync(png).size / 1024).toFixed(0)} KB png` : "PNG FAILED");
}
