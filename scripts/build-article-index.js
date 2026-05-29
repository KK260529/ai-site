const fs = require("fs");
const path = require("path");
const articleStore = require("../utils/articleStore");
const { config } = require("../utils/config");

const OUT = path.join(config.rootDir, "utils", "articleIndex.json");

function buildArticleIndex() {
  articleStore.ensurePublicArticlesDir();
  for (const a of articleStore.listAllArticles().filter((x) => x.status === "published")) {
    articleStore.mirrorPublishedArticle(a);
  }

  const articles = articleStore
    .listAllArticles()
    .filter((a) => a.status === "published");
  const index = {};
  for (const a of articles) {
    index[a.slug] = a;
  }
  fs.writeFileSync(OUT, JSON.stringify(index, null, 2), "utf-8");
  return { count: articles.length, out: OUT };
}

if (require.main === module) {
  const { count } = buildArticleIndex();
  console.log(`articleIndex.json: ${count} published articles`);
}

module.exports = { buildArticleIndex };
