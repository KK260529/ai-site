/**
 * 記事間リンク候補 — internalLinkCandidates が空のときランタイム生成
 */
const { findRelatedArticles } = require("./discovery");
const { scoreSearchDemand } = require("./articleDemand");
const articleStore = require("./articleStore");

function reasonForLink(source, target) {
  if (source.category && source.category === target.category) return "同カテゴリの関連エラー";
  const sharedTag = (source.tags || []).find((t) => (target.tags || []).includes(t));
  if (sharedTag) return `「${sharedTag}」タグの関連記事`;
  if (source.knowledge?.topic && source.knowledge.topic === target.knowledge?.topic) {
    return "同じ技術分野";
  }
  return "関連する解説";
}

function buildLinkCandidates(article, limit = 8) {
  const related = findRelatedArticles(article, limit + 2);
  return related.slice(0, limit).map((a) => ({
    slug: a.slug,
    title: a.title,
    reason: reasonForLink(article, a),
  }));
}

function resolveLinkCandidates(article, minCount = 5) {
  const existing = (article.internalLinkCandidates || []).filter((c) => c?.slug && c?.title);
  if (existing.length >= minCount) return existing;
  const built = buildLinkCandidates(article, Math.max(minCount, 8));
  const seen = new Set(existing.map((c) => c.slug));
  for (const c of built) {
    if (seen.has(c.slug)) continue;
    existing.push(c);
    seen.add(c.slug);
    if (existing.length >= minCount) break;
  }
  return existing;
}

function findHighDemandOrphans(limit = 100) {
  const all = articleStore.getPublishedArticles();
  const inbound = new Map();
  for (const a of all) {
    for (const c of a.internalLinkCandidates || []) {
      if (!c?.slug) continue;
      inbound.set(c.slug, (inbound.get(c.slug) || 0) + 1);
    }
  }
  return all
    .filter((a) => {
      const tier = scoreSearchDemand(a).tier;
      const links = (a.internalLinkCandidates || []).filter((c) => c?.slug).length;
      const inCount = inbound.get(a.slug) || 0;
      return tier !== "low" && (links < 5 || inCount === 0);
    })
    .slice(0, limit);
}

module.exports = {
  buildLinkCandidates,
  resolveLinkCandidates,
  findHighDemandOrphans,
};
