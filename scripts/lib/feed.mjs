// Feed loading: the portfolio's public feed is the source of truth. If it is unreachable, rebuild an equivalent
// feed straight from GitHub / LeetCode / Medium. If everything fails, return null and the caller keeps existing files.
const FEED_URL = process.env.FEED_URL || "https://chetangadhiya.vercel.app/api/public/feed";
const GH_USER = "chetangadhiya5062";
const LC_USER = "chetangadhiya4939";
const MEDIUM = "@ChetanGadhiy017";
const HIDDEN = new Set(["chetangadhiya5062", "chetangadhiya017", "jay_swaminarayan"]);

const get = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res;
};

function valid(f) {
  return f && Array.isArray(f.heatmap) && f.heatmap.length >= 182 && f.stats && Array.isArray(f.latest) && f.profile;
}

async function fromPortfolio() {
  const f = await (await get(FEED_URL, { headers: { Accept: "application/json" } })).json();
  if (!valid(f)) throw new Error("portfolio feed has an unexpected shape");
  return f;
}

// ---------- direct fallback ---------------------------------------------------------------------
async function github() {
  const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("no GitHub token");
  const q = `query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
  const r = await get("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, variables: { l: GH_USER } }),
  });
  const cal = (await r.json()).data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("no GitHub calendar");
  const days = cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })));
  let commits = [];
  try {
    const ev = await (await get(`https://api.github.com/users/${GH_USER}/events/public?per_page=60`, { headers: { Authorization: `Bearer ${token}` } })).json();
    commits = ev
      .filter((e) => e.type === "PushEvent" && !HIDDEN.has(e.repo.name.split("/")[1].toLowerCase()))
      .flatMap((e) => (e.payload.commits || []).slice(-1).map((c) => ({ type: "github", title: `${e.repo.name.split("/")[1]}: ${c.message.split("\n")[0]}`.slice(0, 140), url: `https://github.com/${e.repo.name}/commit/${c.sha}`, date: e.created_at })));
  } catch { /* commits are optional */ }
  return { total: cal.totalContributions, days, commits };
}

async function leetcode() {
  const query = `query($u:String!){matchedUser(username:$u){submitStatsGlobal{acSubmissionNum{difficulty count}} userCalendar{streak submissionCalendar}}}`;
  const r = await get("https://leetcode.com/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: `https://leetcode.com/u/${LC_USER}/`, "User-Agent": "Mozilla/5.0 (compatible; profile-readme-bot)" },
    body: JSON.stringify({ query, variables: { u: LC_USER } }),
  });
  const u = (await r.json()).data?.matchedUser;
  if (!u) throw new Error("no LeetCode user");
  const n = (d) => u.submitStatsGlobal.acSubmissionNum.find((x) => x.difficulty === d)?.count ?? 0;
  const raw = JSON.parse(u.userCalendar.submissionCalendar || "{}");
  const days = {};
  for (const [ts, c] of Object.entries(raw)) {
    const k = new Date(Number(ts) * 1000).toISOString().slice(0, 10);
    days[k] = (days[k] || 0) + Number(c);
  }
  return { all: n("All"), easy: n("Easy"), medium: n("Medium"), hard: n("Hard"), streak: u.userCalendar.streak, days };
}

async function medium() {
  const xml = await (await get(`https://medium.com/feed/${MEDIUM}`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; profile-readme-bot)" } })).text();
  const unwrap = (s) => (s || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const tag = (t) => unwrap(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`).exec(m[1])?.[1]);
    return { type: "medium", title: tag("title"), url: tag("link").split("?")[0], date: new Date(tag("pubDate")).toISOString() };
  }).filter((p) => p.title && p.url);
}

async function fromSources() {
  const [g, l, m] = await Promise.allSettled([github(), leetcode(), medium()]);
  if (g.status !== "fulfilled" && l.status !== "fulfilled" && m.status !== "fulfilled") throw new Error("all direct sources failed");
  const gh = g.value, lc = l.value, md = m.value ?? [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const ghDay = new Map((gh?.days ?? []).map((d) => [d.date, d.count]));
  const mdDay = new Map();
  md.forEach((p) => mdDay.set(p.date.slice(0, 10), (mdDay.get(p.date.slice(0, 10)) || 0) + 1));
  const heatmap = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (364 - i));
    const k = d.toISOString().slice(0, 10);
    return { date: k, github: ghDay.get(k) || 0, leetcode: lc?.days[k] || 0, medium: mdDay.get(k) || 0, posts: 0 };
  });
  return {
    generatedAt: new Date().toISOString(),
    profile: { name: "Chetan Gadhiya", status: "", openToWork: true },
    stats: {
      githubContributions365: gh?.total ?? 0, leetcodeSolved: lc?.all ?? 0, leetcodeEasy: lc?.easy ?? 0, leetcodeMedium: lc?.medium ?? 0,
      leetcodeHard: lc?.hard ?? 0, leetcodeStreak: lc?.streak ?? 0, mediumPosts: md.length,
    },
    heatmap,
    latest: [...md, ...(gh?.commits ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
  };
}

export async function loadFeed() {
  try {
    return { feed: await fromPortfolio(), via: "portfolio feed" };
  } catch (e) {
    console.warn("portfolio feed unavailable:", e.message);
  }
  try {
    return { feed: await fromSources(), via: "direct sources" };
  } catch (e) {
    console.warn("direct sources unavailable:", e.message);
  }
  return null;
}
