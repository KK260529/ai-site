const fs = require("fs");
const path = require("path");
const { config } = require("./config");
const { slugify, ensureUniqueSlug } = require("./slug");
const { mergeSeoIntoArticle } = require("./seo");
const { buildSeoExtended } = require("./seoExtended");
const { sanitizeHtml } = require("./sanitize");

const ARTICLES_DIR = path.join(process.cwd(), config.articlesDir);

function ensureDir() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  }
}

function getFilePath(slug) {
  return path.join(ARTICLES_DIR, `${slug}.json`);
}

function readArticleFile(slug) {
  const filePath = getFilePath(slug);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeArticleFile(article) {
  ensureDir();
  const filePath = getFilePath(article.slug);
  fs.writeFileSync(filePath, JSON.stringify(article, null, 2), "utf-8");
  return article;
}

function deleteArticleFile(slug) {
  const filePath = getFilePath(slug);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function listAllArticles() {
  ensureDir();
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"));
  const articles = files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return articles.sort(
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
  const merged = mergeSeoIntoArticle({
    ...article,
    ...updates,
    slug: article.slug,
    updatedAt: now,
  });

  if (updates.status === "published" && !article.publishedAt) {
    merged.publishedAt = now;
  }
  if (updates.status === "draft") {
    merged.publishedAt = null;
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
  listAllArticles,
  getPublishedArticles,
  readArticleFile,
  writeArticleFile,
  deleteArticleFile,
  createArticleFromDraft,
  updateArticle,
  searchArticles,
};
