const fs = require("fs");
const path = require("path");
const { config } = require("../config");
const articleStore = require("../articleStore");
const { mergeSeoIntoArticle } = require("../seo");
const { buildSeoExtended } = require("../seoExtended");
const knowledgeStore = require("../stores/knowledgeStore");
const sitemapGenerator = require("../seo/sitemapGenerator");
const robotsGenerator = require("../seo/robotsGenerator");
const rssGenerator = require("../rss/rssGenerator");
const { runHooks } = require("../automation");

const PUBLISH_LOG = path.join(config.logsDir, "publish.log");
const STATUS_FILE = path.join(config.dataDir, "publish-status.json");

function ensureDirs() {
  [config.logsDir, config.backupsDir, config.dataDir, config.publicDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function backupArticle(article) {
  ensureDirs();
  const date = new Date().toISOString().split("T")[0];
  const dir = path.join(config.backupsDir, date);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${article.slug}.json`);
  fs.writeFileSync(dest, JSON.stringify(article, null, 2), "utf-8");
  return dest;
}

function appendPublishLog(entry) {
  ensureDirs();
  const line = JSON.stringify({ ...entry, loggedAt: new Date().toISOString() }) + "\n";
  fs.appendFileSync(PUBLISH_LOG, line, "utf-8");
}

function readPublishStatus() {
  ensureDirs();
  if (!fs.existsSync(STATUS_FILE)) {
    return {
      siteUrl: config.siteUrl,
      nodeEnv: config.nodeEnv,
      sitemapUpdatedAt: null,
      rssUpdatedAt: null,
      robotsUpdatedAt: null,
      lastPublish: null,
    };
  }
  try {
    return { ...JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")), siteUrl: config.siteUrl };
  } catch {
    return { siteUrl: config.siteUrl, sitemapUpdatedAt: null, rssUpdatedAt: null };
  }
}

function savePublishStatus(partial) {
  const current = readPublishStatus();
  const next = { ...current, ...partial, siteUrl: config.siteUrl, nodeEnv: config.nodeEnv };
  fs.writeFileSync(STATUS_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

function refreshArticleSeo(article) {
  const now = new Date().toISOString();
  let base = {
    ...article,
    status: "published",
    updatedAt: now,
    publishedAt: article.publishedAt || now,
  };

  if (base.knowledge) {
    const ctx = {
      topic: base.knowledge.topic,
      courseId: base.knowledge.courseId,
      course: knowledgeStore.getCourse(base.knowledge.topic, base.knowledge.courseId),
    };
    base = { ...base, ...buildSeoExtended(base, ctx) };
  } else {
    base = mergeSeoIntoArticle(base);
  }

  return articleStore.writeArticleFile(base);
}

function regeneratePublicFiles() {
  const errors = [];
  let sitemap = null;
  let rss = null;
  let robots = null;

  try {
    sitemap = sitemapGenerator.writeToPublic();
  } catch (e) {
    errors.push({ step: "sitemap", message: e.message });
  }
  try {
    rss = rssGenerator.writeToPublic();
  } catch (e) {
    errors.push({ step: "rss", message: e.message });
  }
  try {
    robots = robotsGenerator.writeToPublic();
  } catch (e) {
    errors.push({ step: "robots", message: e.message });
  }

  const status = savePublishStatus({
    sitemapUpdatedAt: sitemap?.updatedAt || null,
    rssUpdatedAt: rss?.updatedAt || null,
    robotsUpdatedAt: robots?.updatedAt || null,
    sitemapUrl: `${config.siteUrl}/sitemap.xml`,
    rssUrl: `${config.siteUrl}/rss.xml`,
    robotsUrl: `${config.siteUrl}/robots.txt`,
  });

  return { sitemap, rss, robots, errors, status };
}

/**
 * 記事を本番公開し、sitemap / RSS / robots / バックアップ / ログを更新
 */
async function publishArticle(article) {
  ensureDirs();
  const errors = [];

  let published;
  try {
    published = refreshArticleSeo(article);
  } catch (e) {
    errors.push({ step: "article", message: e.message });
    throw e;
  }

  try {
    backupArticle(published);
  } catch (e) {
    errors.push({ step: "backup", message: e.message });
  }

  const publicFiles = regeneratePublicFiles();
  errors.push(...publicFiles.errors);

  const publicUrl = `${config.siteUrl}/article/${published.slug}`;
  const logEntry = {
    slug: published.slug,
    title: published.title,
    publishedAt: published.publishedAt,
    updatedAt: published.updatedAt,
    url: publicUrl,
    siteUrl: config.siteUrl,
    errors: errors.length ? errors : undefined,
  };

  appendPublishLog(logEntry);
  savePublishStatus({
    lastPublish: {
      slug: published.slug,
      title: published.title,
      url: publicUrl,
      at: published.publishedAt,
    },
  });

  await runHooks("onAfterPublish", { article: published, publicFiles, errors });
  await runHooks("onArticlePublished", published);

  return {
    article: published,
    publicUrl,
    publishStatus: readPublishStatus(),
    errors,
    sitemap: publicFiles.sitemap,
    rss: publicFiles.rss,
  };
}

/** 全公開ファイルを再生成（管理画面から手動実行用） */
function regenerateAll() {
  ensureDirs();
  return regeneratePublicFiles();
}

module.exports = {
  publishArticle,
  regenerateAll,
  readPublishStatus,
  backupArticle,
  appendPublishLog,
};
