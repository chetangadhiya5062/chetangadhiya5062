import { ANIM_CSS, Doc, measure, r1 } from "./svg.mjs";

const level = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
const OPACITY = [0, 0.28, 0.52, 0.76, 1]; // same scale as the portfolio heatmap

/** "Training loop": unified GitHub + LeetCode + Medium + posts heatmap (26 weeks) and the headline numbers. */
export function stats(theme, feed) {
  const W = 1200, H = 330;
  const days = feed.heatmap.slice(-182);
  const s = feed.stats;
  const tot = days.reduce((a, x) => ({ g: a.g + x.github, l: a.l + x.leetcode, m: a.m + x.medium, p: a.p + x.posts }), { g: 0, l: 0, m: 0, p: 0 });
  const d = new Doc(W, H, theme, {
    title: "Training loop — live activity",
    desc: `Last 26 weeks: ${tot.g} GitHub contributions, ${tot.l} LeetCode submissions, ${tot.m} Medium articles, ${tot.p} posts. ${s.githubContributions365} contributions in 365 days; ${s.leetcodeSolved} LeetCode problems solved (${s.leetcodeEasy} easy, ${s.leetcodeMedium} medium, ${s.leetcodeHard} hard); ${s.leetcodeStreak}-day streak; ${s.mediumPosts} articles.`,
  });
  const t = theme;
  d.css = ANIM_CSS + `.k{width:${15}px;height:${15}px;rx:3.5px}.l0{fill:${t.cellEmpty}}` + OPACITY.slice(1).map((o, i) => `.l${i + 1}{fill:${t.lime};fill-opacity:${o}}`).join("");

  d.raw(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.base}" stroke="${t.line}"/>`);
  d.raw(`<circle class="pulse" cx="52" cy="44" r="3.5" fill="${t.lime}"/>`);
  d.text("LIVE · GITHUB + LEETCODE + MEDIUM + POSTS · LAST 26 WEEKS", { font: "mono", size: 11, x: 66, y: 48, fill: t.muted, ls: 1.4 });

  // ---- heatmap ---------------------------------------------------------------------------------
  const CELL = 15, GAP = 4, STEP = CELL + GAP, X0 = 48, Y0 = 92;
  const start = new Date(days[0].date + "T00:00:00Z").getUTCDay();
  const cols = Math.ceil((days.length + start) / 7);
  const seen = [];
  days.forEach((x, i) => {
    const col = Math.floor((i + start) / 7), row = (i + start) % 7, lv = level(x.github + x.leetcode + x.medium + x.posts);
    d.raw(`<rect class="k l${lv}" x="${X0 + col * STEP}" y="${Y0 + row * STEP}"/>`);
    const m = x.date.slice(0, 7);
    if (!seen.includes(m) && row < 7) {
      seen.push(m);
      const x0 = X0 + col * STEP;
      if (!seen.__last || x0 - seen.__last >= 3 * STEP) {
        d.text(new Date(x.date + "T00:00:00Z").toLocaleString("en", { month: "short", timeZone: "UTC" }).toUpperCase(), { font: "mono", size: 10, x: x0, y: Y0 - 12, fill: t.muted, ls: 1 });
        seen.__last = x0;
      }
    }
  });
  const hmW = cols * STEP;
  // legend
  const ly = Y0 + 7 * STEP + 22;
  d.text("less", { font: "mono", size: 10, x: X0, y: ly + 9, fill: t.muted });
  [0, 1, 2, 3, 4].forEach((l) => d.raw(`<rect x="${X0 + 32 + l * 17}" y="${ly}" width="12" height="12" rx="3" fill="${l ? t.lime : t.cellEmpty}" ${l ? `fill-opacity="${OPACITY[l]}"` : ""}/>`));
  d.text("more", { font: "mono", size: 10, x: X0 + 32 + 5 * 17 + 4, y: ly + 9, fill: t.muted });

  // platform share
  const parts = [["GitHub", tot.g, t.lime], ["LeetCode", tot.l, t.cyan], ["Medium", tot.m, t.ink], ["Posts", tot.p, t.muted]];
  let px = X0 + hmW - 330;
  parts.forEach(([k, v, c]) => {
    d.raw(`<circle cx="${px + 4}" cy="${ly + 6}" r="3.5" fill="${c}"/>`);
    const w = d.text(`${k} ${v}`, { font: "mono", size: 10, x: px + 13, y: ly + 9, fill: t.muted });
    px += w + 28;
  });

  // ---- numbers ---------------------------------------------------------------------------------
  const NX = X0 + hmW + 64;
  const colW = (W - 48 - NX) / 2;
  const nums = [
    { v: s.githubContributions365, label: "contributions · 365 days", sub: "GitHub" },
    { v: s.leetcodeSolved, label: "problems solved", sub: "LeetCode", bar: true },
    { v: s.leetcodeStreak, label: "day streak", sub: "LeetCode" },
    { v: s.mediumPosts, label: s.mediumPosts === 1 ? "article" : "articles", sub: "Medium" },
  ];
  nums.forEach((n, i) => {
    const x = NX + (i % 2) * colW, y = 86 + Math.floor(i / 2) * 128;
    d.text(n.sub.toUpperCase(), { font: "mono", size: 10, x, y, fill: t.lime, ls: 1.4 });
    d.text(String(n.v), { font: "displayB", size: 54, x, y: y + 52, fill: t.ink });
    d.text(n.label, { font: "mono", size: 11, x, y: y + 72, fill: t.muted });
    if (n.bar) {
      const total = Math.max(1, s.leetcodeEasy + s.leetcodeMedium + s.leetcodeHard);
      const bw = colW - 28;
      let bx = x;
      [[s.leetcodeEasy, t.cyan, 0.55], [s.leetcodeMedium, t.lime, 0.75], [s.leetcodeHard, t.lime, 1]].forEach(([c, col, op]) => {
        const w = Math.max(2, (c / total) * bw);
        d.raw(`<rect x="${r1(bx)}" y="${y + 82}" width="${r1(w - 2)}" height="5" rx="2.5" fill="${col}" fill-opacity="${op}"/>`);
        bx += w;
      });
      d.text(`${s.leetcodeEasy} E · ${s.leetcodeMedium} M · ${s.leetcodeHard} H`, { font: "mono", size: 10, x, y: y + 102, fill: t.muted });
    }
  });
  d.raw(`<path d="M${NX - 32},84 V${H - 36}" stroke="${t.line}" stroke-width="1"/>`);
  return d.toString();
}
