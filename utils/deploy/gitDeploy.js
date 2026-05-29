const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DEFAULT_REMOTE = "https://KK260529@github.com/KK260529/ai-site.git";

/** Git に含める公開関連パス */
const DEPLOY_PATHS = [
  "articles",
  "public/sitemap.xml",
  "public/rss.xml",
  "public/robots.txt",
  "knowledge",
  "data/publish-status.json",
];

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status === 0) {
    return { ok: true, output };
  }
  return { ok: false, output, error: output || `git ${args[0]} failed (code ${result.status})` };
}

function isGitRepo() {
  return fs.existsSync(path.join(ROOT, ".git"));
}

function getGitInfo() {
  if (!isGitRepo()) {
    return { isRepo: false, message: "Git リポジトリが未初期化です（git init が必要）" };
  }

  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  const remote = runGit(["remote", "get-url", "origin"]);
  const status = runGit(["status", "--porcelain", "--", ...DEPLOY_PATHS]);
  const lines = status.ok && status.output ? status.output.split("\n").filter(Boolean) : [];

  return {
    isRepo: true,
    branch: branch.ok ? branch.output : null,
    remote: remote.ok ? remote.output : null,
    hasRemote: remote.ok,
    changedFiles: lines.length,
    changes: lines.slice(0, 30),
    canPush: remote.ok,
  };
}

function gitPushDeploy({ message } = {}) {
  if (!isGitRepo()) {
    throw new Error("Git リポジトリがありません。プロジェクトフォルダで git init を実行してください。");
  }

  const info = getGitInfo();
  if (!info.hasRemote) {
    throw new Error(
      `リモート origin がありません。git-初期設定.bat を実行するか: git remote add origin ${DEFAULT_REMOTE}`
    );
  }

  const steps = [];
  const addArgs = ["add", ...DEPLOY_PATHS];
  const addResult = runGit(addArgs);
  steps.push({ step: "add", ...addResult });
  if (!addResult.ok) throw new Error(`git add 失敗: ${addResult.error}`);

  const statusAfterAdd = runGit(["diff", "--cached", "--quiet"]);
  const hasStaged = !statusAfterAdd.ok;

  const commitMsg =
    message?.trim() ||
    `publish: サイトコンテンツ更新 ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`;

  if (hasStaged) {
    const commitResult = runGit(["commit", "-m", commitMsg]);
    steps.push({ step: "commit", message: commitMsg, ...commitResult });
    if (!commitResult.ok) throw new Error(`git commit 失敗: ${commitResult.error}`);
  } else {
    steps.push({ step: "commit", skipped: true, message: "コミットする変更なし" });
  }

  const pushResult = runGit(["push", "origin", info.branch || "HEAD"]);
  steps.push({ step: "push", branch: info.branch, ...pushResult });
  if (!pushResult.ok) throw new Error(`git push 失敗: ${pushResult.error}`);

  return {
    success: true,
    committed: hasStaged,
    branch: info.branch,
    remote: info.remote,
    steps,
    message: hasStaged
      ? "commit & push が完了しました。Vercel / Railway が自動デプロイを開始します。"
      : "変更はありませんでしたが push を実行しました。",
  };
}

module.exports = { DEPLOY_PATHS, isGitRepo, getGitInfo, gitPushDeploy, runGit };
