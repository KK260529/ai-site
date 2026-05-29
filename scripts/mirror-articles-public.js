#!/usr/bin/env node
/** 公開記事を public/articles/ にミラー（Vercel デプロイ用） */
const articleStore = require("../utils/articleStore");

articleStore.ensurePublicArticlesDir();
const articles = articleStore.listAllArticles().filter((a) => a.status === "published");
for (const article of articles) {
  articleStore.mirrorPublishedArticle(article);
}
console.log(`Mirrored ${articles.length} articles → public/articles/`);
