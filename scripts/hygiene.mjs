// Repo hygiene + profile settings via the GitHub CLI.
//   node scripts/hygiene.mjs                     dry run: prints exactly what would change (nothing is modified)
//   node scripts/hygiene.mjs --apply             profile settings + descriptions/homepages/topics
//   node scripts/hygiene.mjs --archive --apply   also archives the repos listed in data/hygiene.json ("archive")
// Requires `gh auth login`. Archiving is reversible in the repo's Settings, but is never done without --archive.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const H = JSON.parse(fs.readFileSync(path.join(root, "data", "hygiene.json"), "utf8"));
const apply = process.argv.includes("--apply");
const archive = process.argv.includes("--archive");
const OWNER = "chetangadhiya5062";

const gh = (args, input) => {
  const r = spawnSync("gh", args, { input, encoding: "utf8" });
  if (r.error) throw new Error("GitHub CLI (gh) not found. Install it and run `gh auth login`.");
  return r;
};
if (apply && gh(["auth", "status"]).status !== 0) throw new Error("Not logged in. Run: gh auth login");

const say = (s) => console.log(s);

// ---- profile -------------------------------------------------------------------------------------
say("PROFILE");
for (const [k, v] of Object.entries(H.profile)) say(`  ${k}: ${JSON.stringify(v)}`);
if (apply) {
  const args = ["api", "-X", "PATCH", "user"];
  for (const [k, v] of Object.entries(H.profile)) args.push(typeof v === "boolean" ? "-F" : "-f", `${k}=${v}`);
  const r = gh(args);
  say(r.status === 0 ? "  -> updated" : `  -> FAILED: ${r.stderr.trim()}`);
}

// ---- repos ---------------------------------------------------------------------------------------
for (const r of H.repos) {
  say(`\nREPO ${r.repo}`);
  say(`  description: ${r.description}  (${r.description.length} chars)`);
  say(`  homepage:    ${r.homepage}`);
  say(`  topics:      ${r.topics.join(", ")}`);
  if (r.description.length > 120) say("  ! description is longer than 120 chars");
  if (!apply) continue;
  const a = gh(["api", "-X", "PATCH", `repos/${r.repo}`, "-f", `description=${r.description}`, "-f", `homepage=${r.homepage}`]);
  const t = gh(["api", "-X", "PUT", `repos/${r.repo}/topics`, "-H", "Accept: application/vnd.github+json", "--input", "-"], JSON.stringify({ names: r.topics }));
  say(a.status === 0 && t.status === 0 ? "  -> updated" : `  -> FAILED: ${(a.stderr + t.stderr).trim()}`);
}

// ---- archive -------------------------------------------------------------------------------------
say("\nARCHIVE CANDIDATES" + (archive ? "" : "  (not archived unless you pass --archive)"));
for (const name of H.archive) {
  say(`  ${OWNER}/${name}`);
  if (apply && archive) {
    const r = gh(["repo", "archive", `${OWNER}/${name}`, "--yes"]);
    say(r.status === 0 ? "    -> archived" : `    -> FAILED: ${r.stderr.trim()}`);
  }
}
if (!apply) say("\nDry run only. Re-run with --apply to make these changes.");
