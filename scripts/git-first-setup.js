#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REMOTE = "https://KK260529@github.com/KK260529/ai-site.git";

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  return { ok: r.status === 0, out };
}

function step(msg) {
  console.log(`\n>> ${msg}`);
}

function main() {
  console.log("Repository:", REMOTE);

  if (!fs.existsSync(path.join(ROOT, ".git"))) {
    step("git init");
    const init = git(["init"]);
    console.log(init.out || (init.ok ? "OK" : "FAIL"));
    if (!init.ok) process.exit(1);
  } else {
    console.log("Git repo: already exists");
  }

  const remote = git(["remote", "get-url", "origin"]);
  if (!remote.ok) {
    step("git remote add origin");
    console.log(git(["remote", "add", "origin", REMOTE]).out || "OK");
  } else {
    step("git remote set-url origin");
    console.log(git(["remote", "set-url", "origin", REMOTE]).out || "OK");
  }

  git(["branch", "-M", "main"]);

  step("git add .");
  git(["add", "."]);
  const st = git(["status", "-sb"]);
  console.log(st.out || "");

  const diff = git(["diff", "--cached", "--quiet"]);
  if (!diff.ok) {
    step("git commit");
    const commit = git(["commit", "-m", "initial: Knowledge CMS"]);
    console.log(commit.out || (commit.ok ? "OK" : "FAIL"));
  } else {
    console.log("Nothing to commit (skip)");
  }

  step("git push -u origin main");
  console.log("(GitHub login may appear - use account KK260529)\n");
  const push = git(["push", "-u", "origin", "main"]);
  console.log(push.out || "");
  if (!push.ok) {
    console.error("\n[PUSH FAILED]");
    console.error("Wrong GitHub account? Use KK260529 credentials.");
    console.error("Try: GitHub Desktop -> File -> Add local repository -> Push");
    process.exit(1);
  }

  console.log("\n[SUCCESS] Code is on GitHub.");
}

main();
