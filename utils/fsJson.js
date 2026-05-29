const fs = require("fs");
const path = require("path");
const { canWriteToDisk } = require("./runtime");

function ensureDir(dirPath) {
  if (!canWriteToDisk()) return;
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    /* read-only FS (Vercel 等) */
  }
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  if (!canWriteToDisk()) {
    throw new Error("この環境（Vercel 等）ではファイルを保存できません。Railway / VPS をご利用ください。");
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  return data;
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));
}

function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

module.exports = { ensureDir, readJson, writeJson, listJsonFiles, deleteFile };
