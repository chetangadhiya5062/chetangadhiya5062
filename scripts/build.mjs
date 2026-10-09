// Generates the profile README + SVG assets. Safe by design: if no data can be loaded it changes nothing and exits 0.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { THEMES } from "./lib/svg.mjs";
import { hero } from "./lib/hero.mjs";
import { experience } from "./lib/experience.mjs";
import { projectCard } from "./lib/project-card.mjs";
import { stats } from "./lib/stats.mjs";
import { skills } from "./lib/skills.mjs";
import { loadFeed } from "./lib/feed.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = JSON.parse(fs.readFileSync(path.join(root, "data", "static.json"), "utf8"));
const out = (rel, content) => {
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const prev = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  if (prev !== content) fs.writeFileSync(f, content);
  return prev !== content;
};

const loaded = await loadFeed();
if (!loaded) {
  console.log("No data available: keeping existing files untouched.");
  process.exit(0);
}
const { feed, via } = loaded;
console.log(`feed via ${via}, generated ${feed.generatedAt}`);

// ---------- SVG assets (dark + light) -----------------------------------------------------------
let changed = 0;
for (const theme of Object.values(THEMES)) {
  const n = theme.name;
  changed += out(`assets/hero-${n}.svg`, hero(theme, feed));
  changed += out(`assets/experience-${n}.svg`, experience(theme, S.experience));
  changed += out(`assets/stats-${n}.svg`, stats(theme, feed));
  changed += out(`assets/skills-${n}.svg`, skills(theme, S.skills));
  for (const p of S.projects) changed += out(`assets/projects/${p.slug}-${n}.svg`, projectCard(theme, p));
}

// ---------- README -------------------------------------------------------------------------------
const pic = (name, alt, extra = "") =>
  `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${name}-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="${name}-light.svg">
  <img alt="${alt}" src="${name}-dark.svg" ${extra}>
</picture>`;

/** Newest 5 across sources; GitHub commits are capped at 2 so articles and posts are not drowned out. */
function latestItems(items) {
  const picked = [];
  let gh = 0;
  for (const it of [...items].sort((a, b) => b.date.localeCompare(a.date))) {
    if (it.type === "github" && gh >= 2) continue;
    if (it.type === "github") gh++;
    picked.push(it);
    if (picked.length === 5) break;
  }
  return picked;
}
const esc = (s) => s.replace(/([\[\]|])/g, "\\$1");
const feedLines = latestItems(feed.latest)
  .map((it) => `- \`${it.type}\` · ${it.date.slice(0, 10)} · [${esc(it.title)}](${it.url})`)
  .join("\n") || "- Nothing new yet.";

const L = S.person.links;
const about = `I engineer AI systems designed to run in production, not just perform well in a demo. At HNNOIX's NeuroFlow AI I built core platform infrastructure — a provider-agnostic LLM Gateway, RAG Runtime, AI Memory Layer and agent-execution runtimes — on Clean Architecture and SOLID. Before that I shipped two GenAI systems as a freelancer: multi-agent fact verification and knowledge-grounded QA. Final-year B.Tech CSE at PDEU, open to ${S.person.openTo}.`;

const cell = (p) =>
  `<td width="50%" valign="top" align="center"><a href="${p.url}">${pic(`assets/projects/${p.slug}`, `${p.name}: ${p.oneLiner} ${p.metric.value} ${p.metric.label}.`, 'width="100%"')}</a></td>`;
const rows = [];
for (let i = 0; i < S.projects.length; i += 2) rows.push(`<tr>${cell(S.projects[i])}${S.projects[i + 1] ? cell(S.projects[i + 1]) : ""}</tr>`);

const date = feed.generatedAt.slice(0, 10);
const readme = `<div align="center">

${pic("assets/hero", "Chetan Gadhiya — AI Engineer. GenAI and agentic systems built to run in production.", 'width="100%"')}

</div>

${about}

[Portfolio](${S.person.site}) · [Resume](${S.person.site}/resume) · [LinkedIn](${L.linkedin}) · [X](${L.x}) · [Medium](${L.medium}) · [LeetCode](${L.leetcode}) · [Email](mailto:${S.person.email})

## Hidden layers

${pic("assets/experience", "Experience as connected layers: Encode PDEU, Cognifyz Technologies, freelance GenAI engineering, and HNNOIX NeuroFlow AI.", 'width="100%"')}

## Attention

<table>
${rows.join("\n")}
</table>

<sub>AetherMail and Truth AI were built with teammates; see each repository's contributors. Case studies: [chetangadhiya.vercel.app](${S.person.site}/#projects).</sub>

## Training loop

${pic("assets/stats", `Live activity: ${feed.stats.githubContributions365} GitHub contributions in 365 days, ${feed.stats.leetcodeSolved} LeetCode problems solved, ${feed.stats.leetcodeStreak}-day streak, ${feed.stats.mediumPosts} Medium articles, and a unified 26-week heatmap.`, 'width="100%"')}

## Output logits

<!-- FEED:START -->
${feedLines}
<!-- FEED:END -->

## Parameters

${pic("assets/skills", "Skills as a six-layer stack: AI/ML, GenAI and agentic, AI engineering, data and distributed, programming and tools, core CS.", 'width="100%"')}

---

<sub>built as a forward pass · auto-updated ${date} · source → [chetangadhiya.vercel.app](${S.person.site})</sub>
`;
changed += out("README.md", readme);
console.log(changed ? `${changed} file(s) updated` : "no changes");
