const path = require("path");
const { ensureDir, readJson, writeJson } = require("../fsJson");
const { canWriteToDisk } = require("../runtime");

const { config } = require("../config");
const ROOT = path.join(config.rootDir, "memory");

const DEFAULTS = {
  site: {
    tone: "初心者向け・丁寧・具体例重視",
    avoid: ["誇張表現", "AI臭い定型", "不自然なSEO", "同じ説明の繰り返し"],
    principles: ["用語統一", "前回との繋がり", "次回予告", "実践可能な手順"],
  },
  writing: {
    maxLength: "1500-2500字",
    structure: "h2/h3見出し、短い段落、具体例",
    htmlTags: ["h2", "h3", "p", "ul", "li", "code", "pre"],
  },
};

function getSiteRules() {
  return readJson(path.join(ROOT, "site", "rules.json"), DEFAULTS.site);
}

function getWritingRules() {
  return readJson(path.join(ROOT, "writing", "rules.json"), DEFAULTS.writing);
}

function getWritingPrinciples() {
  return readJson(path.join(ROOT, "writing", "principles.json"), {
    disclaimer:
      "以下は記事制作の原則です。ただしあくまで原則であり、記事の内容の正確さ・自然さ・読みやすさを最優先してください。",
    items: [],
  });
}

function initDefaults() {
  if (!canWriteToDisk()) return;
  ensureDir(path.join(ROOT, "site"));
  ensureDir(path.join(ROOT, "writing"));
  ensureDir(path.join(ROOT, "prompts"));
  if (!readJson(path.join(ROOT, "site", "rules.json"))) {
    writeJson(path.join(ROOT, "site", "rules.json"), DEFAULTS.site);
  }
  if (!readJson(path.join(ROOT, "writing", "rules.json"))) {
    writeJson(path.join(ROOT, "writing", "rules.json"), DEFAULTS.writing);
  }
}

initDefaults();

module.exports = { getSiteRules, getWritingRules, getWritingPrinciples, DEFAULTS };
