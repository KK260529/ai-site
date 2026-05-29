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
  const { siteUrl } = config;

  const extraUrls = topics.map((topic) => ({
    loc: `${siteUrl}/knowledge/${topic}`,
    priority: "0.85",
  }));

  let xml = buildSitemapXml(articles, courses);

  if (extraUrls.length) {
    const extraBody = extraUrls
      .map(
        (u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`
      )
      .join("\n");
    xml = xml.replace("</urlset>", `${extraBody}\n</urlset>`);
  }

  if (config.isProduction) {
    xml = xml.replace(/<url>\s*<loc>[^<]*\/admin[^<]*<\/loc>[\s\S]*?<\/url>\s*/g, "");
  }

  return xml;
}

function writeToPublic() {
  const dir = config.publicDir;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const xml = generateXml();
  const filePath = path.join(dir, "sitemap.xml");
  fs.writeFileSync(filePath, xml, "utf-8");
  return { filePath, updatedAt: new Date().toISOString(), urlCount: (xml.match(/<url>/g) || []).length };
}

module.exports = { generateXml, writeToPublic, collectUrls };
