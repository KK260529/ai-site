#!/usr/bin/env node
/**
 * 全記事の検索需要スコアを分析し data/article-demand.json に出力
 */
const fs = require("fs");
const path = require("path");
const { config } = require("../utils/config");
const articleStore = require("../utils/articleStore");
const { scoreSearchDemand, rankArticlesByDemand, TOPIC_EXPANSION_RANKING } = require("../utils/articleDemand");
const { findHighDemandOrphans } = require("../utils/linkCandidates");

const outPath = path.join(config.dataDir, "article-demand.json");

function main() {
  const all = articleStore.getPublishedArticles();
  const ranked = rankArticlesByDemand(all);
  const byTier = { high: [], medium: [], low: [] };

  for (const { article, tier, score } of ranked) {
    byTier[tier].push({
      slug: article.slug,
      title: article.title,
      category: article.category,
      score,
      articleType: article.articleType || null,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalArticles: all.length,
    tiers: {
      high: byTier.high.length,
      medium: byTier.medium.length,
      low: byTier.low.length,
    },
    highDemandSamples: byTier.high.slice(0, 30),
    lowDemandSamples: byTier.low.slice(-30).reverse(),
    topicExpansionRanking: TOPIC_EXPANSION_RANKING,
    orphanHighDemand: findHighDemandOrphans(50).map((a) => ({
      slug: a.slug,
      title: a.title,
      linkCount: (a.internalLinkCandidates || []).length,
    })),
  };

  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`分析完了: ${all.length} 記事`);
  console.log(`  high: ${summary.tiers.high} / medium: ${summary.tiers.medium} / low: ${summary.tiers.low}`);
  console.log(`  出力: ${outPath}`);
  console.log("\n1000記事追加 期待アクセス順:");
  for (const r of TOPIC_EXPANSION_RANKING) {
    console.log(`  ${r.rank}. ${r.topic} (${r.expectedShare}) — ${r.rationale}`);
  }
}

main();
