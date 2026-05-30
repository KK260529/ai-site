const memoryStore = require("../stores/memoryStore");

function getPrinciplesConfig() {
  const path = require("path");
  const { readJson } = require("../fsJson");
  const { config } = require("../config");
  const defaults = {
    disclaimer:
      "以下は記事制作の原則です。ただしあくまで原則であり、記事の内容の正確さ・自然さ・読みやすさを最優先してください。",
    items: memoryStore.DEFAULTS?.site?.principles || [],
  };
  return readJson(
    path.join(config.rootDir, "memory", "writing", "principles.json"),
    defaults
  );
}

function formatPrinciplesForPrompt() {
  const { disclaimer, items } = getPrinciplesConfig();
  const numbered = (items || [])
    .map((item, i) => `${i + 1}. ${item}`)
    .join("\n");
  return `${disclaimer}\n\n${numbered}`;
}

function buildPrinciplesSection() {
  return `## 記事制作の原則（ガイドライン）
${formatPrinciplesForPrompt()}

※ 上記は原則であり、内容の正確さ・自然さ・読みやすさが常に最優先です。`;
}

module.exports = {
  getPrinciplesConfig,
  formatPrinciplesForPrompt,
  buildPrinciplesSection,
};
