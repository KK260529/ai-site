const fs = require("fs");
const path = require("path");
const { config } = require("../config");

function generateText() {
  const lines = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${config.siteUrl}/sitemap.xml`,
    "",
    "# LLM / AI crawlers",
    "User-agent: GPTBot",
    "Allow: /",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    `# Site overview for LLMs: ${config.siteUrl}/llms.txt`,
  ];
  if (config.isProduction) {
    lines.push("Disallow: /admin");
  }
  return lines.join("\n") + "\n";
}

function writeToPublic() {
  const filePath = path.join(config.publicDir, "robots.txt");
  const { canWriteToDisk } = require("../runtime");
  if (canWriteToDisk()) {
    const dir = config.publicDir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, generateText(), "utf-8");
  }
  return { filePath, updatedAt: new Date().toISOString() };
}

module.exports = { generateText, writeToPublic };
