const fs = require("fs");
const path = require("path");
const { config } = require("../config");
const articleStore = require("../articleStore");
const knowledgeStore = require("../stores/knowledgeStore");
const { buildSitemapXml } = require("../seoExtended");

function collectUrls() {
  const articles = articleStore.listAllArticles();
  const courses = knowledgeStore.listTopics().flatMap((t) =>
    knowledgeStore.listCourses(t).map((c) => ({ ...c, topic: t }))
  );
  const topics = knowledgeStore.listTopics();
  return { articles, courses, topics };
}

function generateXml() {
  const { articles, courses, topics } = collectUrls();
  return buildSitemapXml(articles, courses, topics);
}

function writeToPublic() {
  const xml = generateXml();
  const filePath = path.join(config.publicDir, "sitemap.xml");
  const { canWriteToDisk } = require("../runtime");
  if (canWriteToDisk()) {
    const dir = config.publicDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, xml, "utf-8");
  }
  return { filePath, updatedAt: new Date().toISOString(), urlCount: (xml.match(/<url>/g) || []).length };
}

module.exports = { generateXml, writeToPublic, collectUrls };
