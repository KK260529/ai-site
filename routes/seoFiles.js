const fs = require("fs");
const path = require("path");
const { config } = require("../utils/config");
const articleStore = require("../utils/articleStore");
const knowledgeStore = require("../utils/stores/knowledgeStore");
const { buildSitemapXml } = require("../utils/seoExtended");
const { collectTagStats, collectCategoryStats } = require("../utils/discovery");

function readPublicFile(filename) {
  const filePath = path.join(config.publicDir, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

function handleSitemap(_req, res) {
  const body = readPublicFile("sitemap.xml");
  if (body) {
    return res
      .type("application/xml; charset=utf-8")
      .set("Cache-Control", "public, max-age=3600")
      .send(body);
  }
  const articles = articleStore.listAllArticles();
  const courses = knowledgeStore.listTopics().flatMap((t) =>
    knowledgeStore.listCourses(t).map((c) => ({ ...c, topic: t }))
  );
  const xml = buildSitemapXml(articles, courses, knowledgeStore.listTopics(), {
    tags: collectTagStats(2),
    categories: collectCategoryStats(),
  });
  return res
    .type("application/xml; charset=utf-8")
    .set("Cache-Control", "public, max-age=3600")
    .send(xml);
}

function handleRobots(_req, res) {
  const body = readPublicFile("robots.txt");
  if (body) {
    return res
      .type("text/plain; charset=utf-8")
      .set("Cache-Control", "public, max-age=3600")
      .send(body);
  }
  const { generateText } = require("../utils/seo/robotsGenerator");
  return res.type("text/plain; charset=utf-8").send(generateText());
}

function handleRss(_req, res) {
  const body = readPublicFile("rss.xml");
  if (body) {
    return res
      .type("application/xml; charset=utf-8")
      .set("Cache-Control", "public, max-age=3600")
      .send(body);
  }
  const { generateXml } = require("../utils/rss/rssGenerator");
  return res.type("application/xml; charset=utf-8").send(generateXml());
}

module.exports = { handleSitemap, handleRobots, handleRss };
