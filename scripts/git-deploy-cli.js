#!/usr/bin/env node
const { regenerateAll } = require("../utils/publish/publishService");
const { getGitInfo, gitPushDeploy } = require("../utils/deploy/gitDeploy");

async function main() {
  console.log("SEOファイルを更新中…");
  try {
    regenerateAll();
    console.log("  → public/sitemap.xml, rss.xml, robots.txt OK\n");
  } catch (e) {
    console.log(`  ⚠ SEO更新スキップ: ${e.message}\n`);
  }

  const info = getGitInfo();
  if (!info.isRepo) {
    console.error("Git リポジトリがありません。");
    console.error("  git init");
    console.error("  git remote add origin https://github.com/あなた/リポジトリ.git");
    process.exit(1);
  }

  console.log(`ブランチ: ${info.branch}`);
  console.log(`リモート: ${info.remote || "未設定"}`);
  console.log(`変更ファイル: ${info.changedFiles} 件\n`);

  if (!info.canPush) {
    console.error("origin リモートを設定してから再実行してください。");
    process.exit(1);
  }

  try {
    const result = gitPushDeploy({});
    console.log(result.message);
    for (const s of result.steps || []) {
      console.log(`  [${s.step}] ${s.skipped ? "skip" : "ok"} ${s.output || ""}`);
    }
  } catch (e) {
    console.error("\n[失敗]", e.message);
    process.exit(1);
  }
}

main();
