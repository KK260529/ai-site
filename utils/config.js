const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: true });

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

let siteUrl = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

if (isProduction && /localhost|127\.0\.0\.1/i.test(siteUrl)) {
  console.warn(
    "[config] NODE_ENV=production ですが SITE_URL が localhost です。.env の SITE_URL を本番ドメインに設定してください。"
  );
}

const config = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 3000,
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  groqMaxTokens: Number(process.env.GROQ_MAX_TOKENS) || 8192,
  groqBaseURL: "https://api.groq.com/openai/v1",
  siteName: process.env.SITE_NAME || "StackShelf",
  siteTagline: process.env.SITE_TAGLINE || "技術を、ひとつずつ積み上げる。",
  adminUser: (process.env.ADMIN_USER || "admin").trim() || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  siteUrl,
  siteDescription:
    process.env.SITE_DESCRIPTION ||
    "StackShelf — Linux・Git・Docker・Python など、初心者にもわかる技術まとめ。AI編集と構造化メモリで組み立てた学習サイト。",
  articlesDir: "articles",
  publicDir: path.join(process.cwd(), "public"),
  backupsDir: path.join(process.cwd(), "backups"),
  logsDir: path.join(process.cwd(), "logs"),
  dataDir: path.join(process.cwd(), "data"),
};

function normalizeApiKey(key) {
  return String(key || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function validateGroqApiKey(key) {
  const k = normalizeApiKey(key);
  if (!k || k === "gsk_your-api-key-here") {
    return { ok: false, message: "GROQ_API_KEY が未設定です" };
  }
  if (!k.startsWith("gsk_")) {
    return { ok: false, message: "APIキーは gsk_ で始まる必要があります" };
  }
  if (k.length < 40) {
    return {
      ok: false,
      message: `APIキーが短すぎます（現在 ${k.length} 文字）。Groqで表示されたキー全文（通常50文字以上）を .env に貼り付けてください。`,
    };
  }
  if (k.includes("...")) {
    return { ok: false, message: "APIキーに「...」が含まれています。キー全文をコピーしてください。" };
  }
  return { ok: true, key: k };
}

function isGroqConfigured() {
  return validateGroqApiKey(config.groqApiKey).ok;
}

module.exports = { config, isGroqConfigured, validateGroqApiKey, normalizeApiKey };
