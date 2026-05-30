#!/usr/bin/env node
/**
 * internalLinkCandidates が不足している高需要記事に関連リンクを付与
 * 用法: node scripts/strengthen-internal-links.js [--dry-run] [--limit=500]
 */
const articleStore = require("../utils/articleStore");
const { buildLinkCandidates, findHighDemandOrphans } = require("../utils/linkCandidates");
const { scoreSearchDemand } = require("../utils/articleDemand");

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;

function main() {
  const targets = findHighDemandOrphans(limit * 2).slice(0, limit);
  let updated = 0;

  for (const article of targets) {
    const candidates = buildLinkCandidates(article, 8);
    if (candidates.length < 3) continue;

    const merged = [...(article.internalLinkCandidates || [])];
    const seen = new Set(merged.map((c) => c.slug));
    for (const c of candidates) {
      if (seen.has(c.slug)) continue;
      merged.push(c);
      seen.add(c.slug);
      if (merged.length >= 8) break;
    }

    if (merged.length === (article.internalLinkCandidates || []).length) continue;

    if (!dryRun) {
      articleStore.updateArticle(article.slug, { internalLinkCandidates: merged });
    }
    updated += 1;
    const tier = scoreSearchDemand(article).tier;
    console.log(`[${tier}] ${article.slug} → ${merged.length} links`);
  }

  console.log(`\n${dryRun ? "(dry-run) " : ""}更新: ${updated} / 対象候補: ${targets.length}`);
}

main();
