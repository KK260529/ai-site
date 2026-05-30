/**
 * Google Search Console データ取込・分析
 * data/gsc/ に CSV または JSON を配置して利用
 */
const fs = require("fs");
const path = require("path");
const { config } = require("./config");

const GSC_DIR = path.join(config.dataDir, "gsc");

function ensureGscDir() {
  if (!fs.existsSync(GSC_DIR)) fs.mkdirSync(GSC_DIR, { recursive: true });
}

function listGscFiles() {
  ensureGscDir();
  return fs.readdirSync(GSC_DIR).filter((f) => f.endsWith(".json") || f.endsWith(".csv"));
}

function loadGscRows() {
  ensureGscDir();
  const rows = [];
  for (const f of fs.readdirSync(GSC_DIR)) {
    const fp = path.join(GSC_DIR, f);
    if (f.endsWith(".json")) {
      try {
        const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
        const list = Array.isArray(data) ? data : data.rows || data.data || [];
        rows.push(...list);
      } catch {
        /* skip */
      }
    }
  }
  return rows;
}

function normalizeRow(row) {
  return {
    page: row.page || row.url || row.keys?.[0] || "",
    query: row.query || row.keys?.[1] || "",
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || row.ctrPercent || 0),
    position: Number(row.position || row.avgPosition || 0),
  };
}

function getTopPages(limit = 20) {
  const byPage = new Map();
  for (const raw of loadGscRows()) {
    const r = normalizeRow(raw);
    if (!r.page) continue;
    const cur = byPage.get(r.page) || { page: r.page, clicks: 0, impressions: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    byPage.set(r.page, cur);
  }
  return [...byPage.values()]
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit);
}

function getTopQueries(limit = 20) {
  const byQuery = new Map();
  for (const raw of loadGscRows()) {
    const r = normalizeRow(raw);
    if (!r.query) continue;
    const cur = byQuery.get(r.query) || { query: r.query, clicks: 0, impressions: 0, position: 0, n: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.position += r.position;
    cur.n += 1;
    byQuery.set(r.query, cur);
  }
  return [...byQuery.values()]
    .map((x) => ({ ...x, position: x.n ? x.position / x.n : 0 }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);
}

/** 表示多・CTR低 → タイトル/description 改善候補 */
function getCtrImprovementCandidates(minImpressions = 50, maxCtr = 0.03, limit = 20) {
  const byPage = new Map();
  for (const raw of loadGscRows()) {
    const r = normalizeRow(raw);
    if (!r.page) continue;
    const cur = byPage.get(r.page) || { page: r.page, clicks: 0, impressions: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    byPage.set(r.page, cur);
  }
  return [...byPage.values()]
    .map((x) => ({ ...x, ctr: x.impressions ? x.clicks / x.impressions : 0 }))
    .filter((x) => x.impressions >= minImpressions && x.ctr <= maxCtr)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, limit);
}

/** 表示回数上位 → コンテンツ強化優先 */
function getStrengthenPriority(limit = 20) {
  return getTopPages(limit * 2)
    .filter((x) => x.impressions >= 10)
    .slice(0, limit);
}

function getAnalyticsSummary() {
  const files = listGscFiles();
  const topPages = getTopPages(10);
  const topQueries = getTopQueries(10);
  const ctrCandidates = getCtrImprovementCandidates();
  return {
    hasData: files.length > 0,
    fileCount: files.length,
    gscDir: GSC_DIR,
    topPages,
    topQueries,
    ctrImprovementCandidates: ctrCandidates,
    strengthenPriority: getStrengthenPriority(10),
    importHint:
      "Search Console → 検索結果 → エクスポート → data/gsc/performance.json に保存（[{page,query,clicks,impressions,ctr,position}] 形式）",
  };
}

module.exports = {
  getTopPages,
  getTopQueries,
  getCtrImprovementCandidates,
  getStrengthenPriority,
  getAnalyticsSummary,
  GSC_DIR,
};
