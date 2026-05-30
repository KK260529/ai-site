const express = require("express");
const articleStore = require("../utils/articleStore");
const knowledgeStore = require("../utils/stores/knowledgeStore");
const {
  renderHome,
  renderArticle,
  renderAdmin,
  renderCourse,
  renderKnowledge,
  renderPrivacy,
  renderTagPage,
  renderCategoryPage,
  renderSearchPage,
  renderArticlesPage,
  renderTopicsPage,
  render404,
} = require("../utils/render");
const { decodeTagParam, buildLlmsTxt } = require("../utils/discovery");
const { requireAdminAuth } = require("../utils/auth/adminAuth");

function sortArticlesNewest(articles) {
  return [...articles].sort(
    (a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)
  );
}

function searchArticles(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  return sortArticlesNewest(
    articleStore.getPublishedArticles().filter((a) => {
      const hay = [
        a.title,
        a.summary,
        a.category,
        ...(a.tags || []),
        a.body?.slice(0, 500),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
  );
}

const router = express.Router();

router.get("/", (req, res) => {
  const { tag } = req.query;
  if (tag) {
    const decoded = decodeTagParam(tag);
    const articles = sortArticlesNewest(
      articleStore.getPublishedArticles().filter((a) => (a.tags || []).includes(decoded))
    );
    return res.send(renderTagPage(decoded, articles));
  }
  const articles = sortArticlesNewest(articleStore.getPublishedArticles());
  const courses = knowledgeStore.listTopics().flatMap((t) =>
    knowledgeStore.listCourses(t).map((c) => ({ ...c, topic: t }))
  );
  res.send(renderHome(articles, courses));
});

router.get("/topics", (_req, res) => {
  res.send(renderTopicsPage());
});

router.get("/articles", (_req, res) => {
  res.send(renderArticlesPage(sortArticlesNewest(articleStore.getPublishedArticles())));
});

router.get("/search", (req, res) => {
  const q = req.query.q || "";
  res.send(renderSearchPage(q, searchArticles(q)));
});

router.get("/tag/:tag", (req, res) => {
  const tag = decodeTagParam(req.params.tag);
  const articles = sortArticlesNewest(
    articleStore.getPublishedArticles().filter((a) => (a.tags || []).includes(tag))
  );
  res.send(renderTagPage(tag, articles));
});

router.get("/category/:category", (req, res) => {
  const category = decodeTagParam(req.params.category);
  const articles = sortArticlesNewest(
    articleStore.getPublishedArticles().filter((a) => a.category === category)
  );
  res.send(renderCategoryPage(category, articles));
});

router.get("/knowledge/:topic", (req, res) => {
  const { topic } = req.params;
  const courses = knowledgeStore.listCourses(topic);
  const roadmap = knowledgeStore.getRoadmap(topic);
  if (!roadmap && !courses.length) {
    return res.status(404).send(render404());
  }
  res.send(renderKnowledge(topic, roadmap, courses));
});

router.get("/course/:topic/:courseId", (req, res) => {
  const { topic, courseId } = req.params;
  const course = knowledgeStore.getCourse(topic, courseId);
  if (!course) return res.status(404).send(render404());
  const articles = articleStore
    .getPublishedArticles()
    .filter((a) => a.knowledge?.topic === topic && a.knowledge?.courseId === courseId);
  res.send(renderCourse(topic, course, articles));
});

router.get("/article/:slug", (req, res) => {
  const article = articleStore.readArticleFile(req.params.slug);
  if (!article || article.status !== "published") {
    return res.status(404).send(render404());
  }
  let seriesNav = null;
  if (article.knowledge) {
    seriesNav = knowledgeStore.getSeriesNav(
      article.knowledge.topic,
      article.knowledge.courseId,
      article.slug
    );
  }
  res.send(renderArticle(article, seriesNav));
});

router.get("/admin", requireAdminAuth, (_req, res) => {
  res.send(renderAdmin());
});

router.get("/privacy", (_req, res) => {
  res.send(renderPrivacy());
});

router.get("/llms.txt", (_req, res) => {
  res.type("text/plain; charset=utf-8").send(buildLlmsTxt());
});

module.exports = router;
