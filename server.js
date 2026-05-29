const path = require("path");
const express = require("express");
const { config, validateGroqApiKey } = require("./utils/config");
const articleStore = require("./utils/articleStore");
const pagesRouter = require("./routes/pages");
const apiRouter = require("./routes/api");
const knowledgeApiRouter = require("./routes/knowledgeApi");
const publishApiRouter = require("./routes/publishApi");
const memoryStore = require("./utils/stores/memoryStore");
const { registerHook } = require("./utils/automation");
const { regenerateAll } = require("./utils/publish/publishService");
const {
  requireAdminAuth,
  protectAdminApi,
  validateProductionAuthConfig,
} = require("./utils/auth/adminAuth");
const { canWriteToDisk, isServerless } = require("./utils/runtime");

registerHook("onArticlePublished", async (article) => {
  console.log(`[publish] ${article.slug} → ${config.siteUrl}/article/${article.slug}`);
});

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

if (canWriteToDisk()) {
  articleStore.ensureDir();
}
memoryStore.getSiteRules();

app.use("/api/knowledge", requireAdminAuth, knowledgeApiRouter);
app.use("/api/publish", requireAdminAuth, publishApiRouter);
app.use("/api", protectAdminApi, apiRouter);
app.use(pagesRouter);

app.use((_req, res) => {
  res.status(404).send("ページが見つかりません");
});

function startServer() {
  if (config.isProduction && !isServerless()) {
    const authCheck = validateProductionAuthConfig();
    if (!authCheck.ok) {
      console.error(`\n  [エラー] ${authCheck.message}\n`);
      process.exit(1);
    }
  }

  const server = app.listen(config.port, async () => {
    console.log(`\n  ${config.siteName}`);
    console.log(`  環境        → ${config.nodeEnv}`);
    console.log(`  サイトURL   → ${config.siteUrl}`);
    console.log(`  ローカル    → http://localhost:${config.port}`);
    console.log(`  管理画面    → http://localhost:${config.port}/admin`);
    if (config.isProduction) {
      console.log(`  管理認証    → 有効（ADMIN_USER / ADMIN_PASSWORD）`);
    }

    try {
      regenerateAll();
      console.log(`  SEOファイル  → public/sitemap.xml, rss.xml, robots.txt`);
    } catch (e) {
      console.log(`  ⚠ SEOファイル生成: ${e.message}`);
    }

    const keyCheck = validateGroqApiKey(config.groqApiKey);
    if (!keyCheck.ok) {
      console.log(`  ⚠ ${keyCheck.message}\n`);
      return;
    }

    const { verifyApiKey } = require("./utils/groq");
    const verified = await verifyApiKey();
    if (verified.ok) {
      console.log(`  Groq API    → OK (${config.groqModel})`);
    } else {
      console.log(`  ⚠ Groq API  → ${verified.message}`);
    }
    console.log("");
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n  [エラー] ポート ${config.port} は既に使用中です。`);
      console.error("  対処: restart.bat を実行してください。\n");
    } else {
      console.error("\n  [エラー]", err.message, "\n");
    }
    process.exit(1);
  });

  return server;
}

if (config.isProduction) {
  const authCheck = validateProductionAuthConfig();
  if (!authCheck.ok) {
    console.error(`[auth] ${authCheck.message}`);
  }
}

module.exports = app;

if (require.main === module) {
  startServer();
}

