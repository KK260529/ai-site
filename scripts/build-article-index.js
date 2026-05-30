const fs = require("fs");
const path = require("path");
const articleStore = require("../utils/articleStore");
const { config } = require("../utils/config");

const OUT = path.join(config.rootDir, "utils", "articleIndex.json");

function buildArticleIndex() {
  articleStore.ensurePublicArticlesDir();
  const articlesDir = path.join(config.rootDir, config.articlesDir);
  const publicDir = path.join(config.publicDir, "articles");
  const index = {};

  if (fs.existsSync(articlesDir)) {
    for (const f of fs.readdirSync(articlesDir).filter((name) => name.endsWith(".json"))) {
      try {
        const a = JSON.parse(fs.readFileSync(path.join(articlesDir, f), "utf-8"));
        if (a?.slug && a.status === "published") {
          index[a.slug] = a;
          articleStore.mirrorPublishedArticle(a);
        }
      } catch {
        /* skip bad file */
      }
    }
  }

  if (fs.existsSync(publicDir)) {
    const keep = new Set(Object.keys(index).map((slug) => `${slug}.json`));
    for (const f of fs.readdirSync(publicDir)) {
      if (f.endsWith(".json") && !keep.has(f)) {
        try {
          fs.unlinkSync(path.join(publicDir, f));
        } catch {
          /* ignore */
        }
      }
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(index, null, 2), "utf-8");
  return { count: Object.keys(index).length, out: OUT };
}

if (require.main === module) {
  const { count } = buildArticleIndex();
  console.log(`articleIndex.json: ${count} published articles`);
}

module.exports = { buildArticleIndex };
