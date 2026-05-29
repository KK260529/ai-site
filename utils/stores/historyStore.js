const path = require("path");
const { ensureDir, readJson, writeJson } = require("../fsJson");

const ROOT = path.join(process.cwd(), "generation-history");

function historyDir(slug) {
  return path.join(ROOT, slug);
}

function saveGenerationHistory(slug, { prompt, rawResponse, final }) {
  const dir = historyDir(slug);
  ensureDir(dir);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  if (prompt) {
    const fs = require("fs");
    fs.writeFileSync(path.join(dir, `prompt-${ts}.txt`), prompt, "utf-8");
    fs.writeFileSync(path.join(dir, "prompt.txt"), prompt, "utf-8");
  }
  if (rawResponse) {
    writeJson(path.join(dir, `raw-${ts}.json`), rawResponse);
    writeJson(path.join(dir, "raw-response.json"), rawResponse);
  }
  if (final) {
    writeJson(path.join(dir, `final-${ts}.json`), final);
    writeJson(path.join(dir, "final.json"), final);
  }

  return { slug, dir, savedAt: new Date().toISOString() };
}

function getLatestHistory(slug) {
  const fs = require("fs");
  const dir = historyDir(slug);
  const promptPath = path.join(dir, "prompt.txt");
  return {
    prompt: fs.existsSync(promptPath) ? fs.readFileSync(promptPath, "utf-8") : null,
    raw: readJson(path.join(dir, "raw-response.json")),
    final: readJson(path.join(dir, "final.json")),
  };
}

module.exports = { saveGenerationHistory, getLatestHistory, historyDir };
