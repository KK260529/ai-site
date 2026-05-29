const fs = require("fs");
const path = require("path");
const { config } = require("../config");
const articleStore = require("../articleStore");

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateXml() {
  const articles = articleStore
    .getPublishedArticles()
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .slice(0, 50);

  const lastBuild = articles[0]?.publishedAt || new Date().toISOString();
  const items = articles
    .map((a) => {
      const link = `${config.siteUrl}/article/${a.slug}`;
      const pubDate = new Date(a.publishedAt || a.createdAt).toUTCString();
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(a.summary)}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.siteName)}</title>
    <link>${escapeXml(config.siteUrl)}</link>
    <description>${escapeXml(config.siteDescription)}</description>
    <language>ja</language>
    <lastBuildDate>${new Date(lastBuild).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(config.siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

function writeToPublic() {
  const xml = generateXml();
  const filePath = path.join(config.publicDir, "rss.xml");
  const { canWriteToDisk } = require("../runtime");
  if (canWriteToDisk()) {
    const dir = config.publicDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, xml, "utf-8");
  }
  const count = articleStore.getPublishedArticles().length;
  return { filePath, updatedAt: new Date().toISOString(), itemCount: Math.min(count, 50) };
}

module.exports = { generateXml, writeToPublic };
