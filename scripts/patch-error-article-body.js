#!/usr/bin/env node
/** エラー記事本文から説明用の1文を削除 */
const fs = require("fs");
const path = require("path");

const NEEDLE = "<p>検索でヒットしやすいよう、実際のコンソール出力をそのまま掲載します。</p>\n";
const articlesDir = path.join(__dirname, "..", "articles");
const publicDir = path.join(__dirname, "..", "public", "articles");

let n = 0;
for (const f of fs.readdirSync(articlesDir).filter((x) => x.endsWith(".json"))) {
  const fp = path.join(articlesDir, f);
  const a = JSON.parse(fs.readFileSync(fp, "utf-8"));
  if (!a.body?.includes(NEEDLE)) continue;
  a.body = a.body.replace(NEEDLE, "");
  fs.writeFileSync(fp, JSON.stringify(a, null, 2), "utf-8");
  fs.writeFileSync(path.join(publicDir, f), JSON.stringify(a, null, 2), "utf-8");
  n++;
}
console.log(`✓ ${n} 件のエラー記事を更新`);
