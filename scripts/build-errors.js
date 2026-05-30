#!/usr/bin/env node
/**
 * エラーカタログから記事を一括ビルド・公開
 * Usage: node scripts/build-errors.js [--tech python] [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const techDefs = require("./errors-tech-def");
const { buildErrorArticle } = require("../utils/generation/errorArticleBuilder");
const articleStore = require("../utils/articleStore");
const { regenerateAll } = require("../utils/publish/publishService");
const { buildArticleIndex } = require("./build-article-index");

const CATALOG_DIR = path.join(__dirname, "errors-catalog", "data");
const ARTICLES_DIR = path.join(__dirname, "..", "articles");

function deleteExistingErrorArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(ARTICLES_DIR).filter((x) => x.endsWith(".json"))) {
    try {
      const a = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8"));
      if (a.knowledge?.topic === "errors" || a.articleType === "error") {
        fs.unlinkSync(path.join(ARTICLES_DIR, f));
        const pub = path.join(__dirname, "..", "public", "articles", f);
        if (fs.existsSync(pub)) fs.unlinkSync(pub);
        n++;
      }
    } catch {
      /* skip */
    }
  }
  return n;
}

function loadCatalog(tech) {
  const p = path.join(CATALOG_DIR, `${tech}.json`);
  if (!fs.existsSync(p)) throw new Error(`Catalog not found: ${p}. Run: node scripts/errors-catalog/generate-catalogs.js`);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

async function buildTech(techDef, dryRun) {
  const catalog = loadCatalog(techDef.tech);
  console.log(`\n=== ${techDef.title} (${catalog.length}件) ===`);

  if (dryRun) {
    console.log(`  (dry-run: ${catalog.length} 件)`);
    return catalog.length;
  }

  let n = 0;
  for (let i = 0; i < catalog.length; i++) {
    const entry = catalog[i];
    const article = buildErrorArticle(entry, techDef, i);
    articleStore.writeArticleFile(article);
    n++;
    if (n % 100 === 0) console.log(`  … ${n}/${catalog.length}`);
  }
  console.log(`  ✓ ${n} 件書き込み`);
  return n;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const techArg = args.find((a) => !a.startsWith("--"));
  const targets = techArg
    ? techDefs.filter((t) => t.tech === techArg)
    : techDefs;

  if (!targets.length) {
    console.error("Unknown tech:", techArg);
    process.exit(1);
  }

  if (!dryRun) {
    const deleted = deleteExistingErrorArticles();
    if (deleted) console.log(`旧エラー記事 ${deleted} 件を削除しました`);
  }

  let total = 0;
  for (const def of targets) {
    total += await buildTech(def, dryRun);
  }

  if (dryRun) {
    console.log(`\n(dry-run: 合計 ${total} 件)`);
    return;
  }

  console.log("\nSEO ファイル再生成中…");
  regenerateAll();
  const index = buildArticleIndex();
  console.log(`\n✓ 合計 ${total} 件公開, articleIndex ${index.count} 件`);
}

main().catch((err) => {
  console.error("\n[失敗]", err.message);
  process.exit(1);
});
