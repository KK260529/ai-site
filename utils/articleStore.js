const fs = require("fs");
const path = require("path");
const { config } = require("./config");
const { slugify, ensureUniqueSlug } = require("./slug");
const { mergeSeoIntoArticle } = require("./seo");
const { buildSeoExtended } = require("./seoExtended");
const { sanitizeHtml } = require("./sanitize");
const { canWriteToDisk } = require("./runtime");

const ARTICLES_DIR = path.join(config.rootDir, config.articlesDir);
const PUBLIC_ARTICLES_DIR = path.join(config.publicDir, "articles");
const ARTICLE_INDEX = path.join(config.rootDir, "utils", "articleIndex.json");

let articleIndexCache = null;

function loadArticleIndex() {
  if (articleIndexCache) return articleIndexCache;
  try {
    articleIndexCache = require("./articleIndex.json");
  } catch {
    try {
      articleIndexCache = JSON.parse(fs.readFileSync(ARTICLE_INDEX, "utf-8"));
    } catch {
      articleIndexCache = {};
    }
  }
  return articleIndexCache;
}

function ensurePublicArticlesDir() {
  if (!canWriteToDisk()) return;
  try {
    if (!fs.existsSync(PUBLIC_ARTICLES_DIR)) {
      fs.mkdirSync(PUBLIC_ARTICLES_DIR, { recursive: true });
    }
  } catch {
    /* read-only FS */
  }
}

function mirrorPublishedArticle(article) {
  if (article.status !== "published") return;
  ensurePublicArticlesDir();
  try {
    const dest = path.join(PUBLIC_ARTICLES_DIR, `${article.slug}.json`);
    fs.writeFileSync(dest, JSON.stringify(article, null, 2), "utf-8");
  } catch {
    /* ignore on read-only */
  }
}

function removePublicArticle(slug) {
  const dest = path.join(PUBLIC_ARTICLES_DIR, `${slug}.json`);
  if (fs.existsSync(dest)) {
    fs.unlinkSync(dest);
    return true;
  }
  return false;
}

function articleDirsForRead() {
  const dirs = [PUBLIC_ARTICLES_DIR, ARTICLES_DIR];
  return [...new Set(dirs)];
}

function ensureDir() {
  if (!canWriteToDisk()) return;
  try {
    if (!fs.existsSync(ARTICLES_DIR)) {
      fs.mkdirSync(ARTICLES_DIR, { recursive: true });
    }
  } catch {
    /* read-only FS */
  }
}

function getFilePath(slug) {
  return path.join(ARTICLES_DIR, `${slug}.json`);
}

function findArticlePath(slug) {
  for (const dir of articleDirsForRead()) {
    const filePath = path.join(dir, `${slug}.json`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function readArticleFile(slug) {
  const fromIndex = loadArticleIndex()[slug];
  if (fromIndex) return fromIndex;

  const filePath = findArticlePath(slug);
  if (!filePath) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeArticleFile(article) {
  if (!canWriteToDisk()) {
    throw new Error("この環境（Vercel 等）では記事を保存できません。Railway / VPS をご利用ください。");
  }
  ensureDir();
  const filePath = getFilePath(article.slug);
  fs.writeFileSync(filePath, JSON.stringify(article, null, 2), "utf-8");
  mirrorPublishedArticle(article);
  articleIndexCache = null;
  return article;
}

function deleteArticleFile(slug) {
  let ok = false;
  const filePath = getFilePath(slug);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    ok = true;
  }
  if (removePublicArticle(slug)) ok = true;
  return ok;
}

function listAllArticles() {
  const bySlug = new Map(Object.entries(loadArticleIndex()));

  for (const dir of articleDirsForRead()) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
        if (article?.slug && !bySlug.has(article.slug)) {
          bySlug.set(article.slug, article);
        }
      } catch {
        /* skip bad file */
      }
    }
  }
  return [...bySlug.values()].sort(
    (a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)
  );
}

function getExistingSlugs() {
  return listAllArticles().map((a) => a.slug);
}

function createArticleFromDraft(draft, theme) {
  const now = new Date().toISOString();
  const baseSlug = slugify(draft.slug || draft.title) || slugify(theme) || "article";
  const slug = ensureUniqueSlug(baseSlug, getExistingSlugs());

  const base = {
    id: `art_${Date.now()}`,
    slug,
    title: draft.title,
    summary: draft.summary,
    body: sanitizeHtml(draft.body),
    conclusion: draft.conclusion,
    tags: draft.tags,
    category: draft.category,
    theme: theme || draft.category,
    status: draft.status || "draft",
    createdAt: now,
    updatedAt: now,
    publishedAt: draft.status === "published" ? now : null,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    ogTitle: draft.ogTitle || draft.title,
    ogDescription: draft.ogDescription || draft.metaDescription,
    knowledge: draft.knowledge || null,
    faq: draft.faq || [],
    nextEpisodeHint: draft.nextEpisodeHint || "",
  };

  const article = draft.canonical
    ? { ...base, metaTitle: draft.metaTitle, metaDescription: draft.metaDescription, canonical: draft.canonical, jsonLd: draft.jsonLd, ogTitle: draft.ogTitle, ogDescription: draft.ogDescription }
    : mergeSeoIntoArticle(
        draft.knowledge
          ? buildSeoExtended(base, { topic: draft.knowledge.topic, courseId: draft.knowledge.courseId })
          : base
      );

  return writeArticleFile(article);
}

function updateArticle(slug, updates) {
  const article = readArticleFile(slug);
  if (!article) return null;

  const now = new Date().toISOString();
  let merged = {
    ...article,
    ...updates,
    slug: article.slug,
    updatedAt: now,
  };

  if (updates.status === "published" && !article.publishedAt) {
    merged.publishedAt = now;
  }
  if (updates.status === "draft") {
    merged.publishedAt = null;
  }

  if (merged.knowledge) {
    const { buildSeoExtended } = require("./seoExtended");
    const knowledgeStore = require("./stores/knowledgeStore");
    const ctx = {
      topic: merged.knowledge.topic,
      courseId: merged.knowledge.courseId,
      course: knowledgeStore.getCourse(merged.knowledge.topic, merged.knowledge.courseId),
    };
    merged = { ...merged, ...buildSeoExtended(merged, ctx) };
  } else {
    merged = mergeSeoIntoArticle(merged);
  }

  return writeArticleFile(merged);
}

function getPublishedArticles() {
  return listAllArticles().filter((a) => a.status === "published");
}

function searchArticles(query, { category, tag, publishedOnly = false } = {}) {
  let list = publishedOnly ? getPublishedArticles() : listAllArticles();
  const q = (query || "").trim().toLowerCase();

  if (category) {
    list = list.filter((a) => a.category === category);
  }
  if (tag) {
    list = list.filter((a) => (a.tags || []).includes(tag));
  }
  if (q) {
    list = list.filter((a) => {
      const hay = [a.title, a.summary, a.category, ...(a.tags || [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
}

module.exports = {
  ensureDir,
  ensurePublicArticlesDir,
  mirrorPublishedArticle,
  listAllArticles,
  getPublishedArticles,
  readArticleFile,
  writeArticleFile,
  deleteArticleFile,
  createArticleFromDraft,
  updateArticle,
  searchArticles,
};
