const fs = require("fs");
const path = require("path");
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
} = require("../utils/render");
const { buildSitemapXml } = require("../utils/seoExtended");
const { config } = require("../utils/config");
const { requireAdminAuth } = require("../utils/auth/adminAuth");

function sendPublicFile(res, filename, contentType) {
  const filePath = path.join(config.publicDir, filename);
  if (fs.existsSync(filePath)) {
    return res.type(contentType).sendFile(filePath);
  }
  return null;
}

const router = express.Router();

router.get("/", (req, res) => {
  const { tag } = req.query;
  let articles = articleStore.getPublishedArticles();
  if (tag) {
    articles = articles.filter((a) => (a.tags || []).includes(tag));
  }
  const courses = knowledgeStore.listTopics().flatMap((t) =>
    knowledgeStore.listCourses(t).map((c) => ({ ...c, topic: t }))
  );
  res.send(renderHome(articles, courses));
});

router.get("/knowledge/:topic", (req, res) => {
  const { topic } = req.params;
  const courses = knowledgeStore.listCourses(topic);
  const roadmap = knowledgeStore.getRoadmap(topic);
  res.send(renderKnowledge(topic, roadmap, courses));
});

router.get("/course/:topic/:courseId", (req, res) => {
  const { topic, courseId } = req.params;
  const course = knowledgeStore.getCourse(topic, courseId);
  if (!course) return res.status(404).send("講座が見つかりません");
  const articles = articleStore
    .getPublishedArticles()
    .filter((a) => a.knowledge?.topic === topic && a.knowledge?.courseId === courseId);
  res.send(renderCourse(topic, course, articles));
});

router.get("/article/:slug", (req, res) => {
  const article = articleStore.readArticleFile(req.params.slug);
  if (!article || article.status !== "published") {
    return res.status(404).send("記事が見つかりません");
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

router.get("/sitemap.xml", (_req, res) => {
  if (sendPublicFile(res, "sitemap.xml", "application/xml")) return;
  const articles = articleStore.listAllArticles();
  const courses = knowledgeStore.listTopics().flatMap((t) =>
    knowledgeStore.listCourses(t).map((c) => ({ ...c, topic: t }))
  );
  res.type("application/xml").send(buildSitemapXml(articles, courses));
});

router.get("/robots.txt", (_req, res) => {
  if (sendPublicFile(res, "robots.txt", "text/plain")) return;
  const { generateText } = require("../utils/seo/robotsGenerator");
  res.type("text/plain").send(generateText());
});

router.get("/rss.xml", (_req, res) => {
  if (sendPublicFile(res, "rss.xml", "application/xml")) return;
  const { generateXml } = require("../utils/rss/rssGenerator");
  res.type("application/xml").send(generateXml());
});

module.exports = router;
