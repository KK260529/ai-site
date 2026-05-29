const fs = require("fs");
const path = require("path");
const { config } = require("../config");

function generateText() {
  const lines = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${config.siteUrl}/sitemap.xml`,
  ];
  if (config.isProduction) {
    lines.push("Disallow: /admin");
  }
  return lines.join("\n") + "\n";
}

function writeToPublic() {
  const dir = config.publicDir;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "robots.txt");
  fs.writeFileSync(filePath, generateText(), "utf-8");
  return { filePath, updatedAt: new Date().toISOString() };
}

module.exports = { generateText, writeToPublic };
