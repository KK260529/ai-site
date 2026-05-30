const express = require("express");
const { generateArticle, verifyApiKey } = require("../utils/groq");
const { config, validateGroqApiKey } = require("../utils/config");
const { listArticleLengthPresets } = require("../utils/generation/articleLength");
const articleStore = require("../utils/articleStore");
const { runHooks } = require("../utils/automation");
const { publishArticle } = require("../utils/publish/publishService");

const router = express.Router();

router.get("/health", async (req, res) => {
  const validation = validateGroqApiKey(process.env.GROQ_API_KEY);
  const payload = {
    ok: true,
    groqConfigured: validation.ok,
    articleLengthDefault: config.articleLength,
    articleLengthPresets: listArticleLengthPresets(),
  };

  if (req.query.verify === "true") {
    if (!validation.ok) {
      payload.groqValid = false;
      payload.groqError = validation.message;
    } else {
      const verification = await verifyApiKey();
      payload.groqValid = verification.ok;
      if (!verification.ok) payload.groqError = verification.message;
    }
  }

  res.json(payload);
});

router.get("/articles", (req, res) => {
  const { q, category, tag, all } = req.query;
  const list = articleStore.searchArticles(q, {
    category,
    tag,
    publishedOnly: all !== "true",
  });
  res.json({ articles: list.map(summarize) });
});

router.get("/articles/:slug", (req, res) => {
  const article = articleStore.readArticleFile(req.params.slug);
  if (!article) return res.status(404).json({ error: "記事が見つかりません" });
  res.json({ article });
});

router.post("/articles/generate", async (req, res) => {
  const theme = (req.body?.theme || "").trim();
  if (!theme) {
    return res.status(400).json({ error: "テーマを入力してください" });
  }

  try {
    const draft = await generateArticle(theme, {
      angle: req.body?.angle,
      length: req.body?.length,
    });
    res.json({ success: true, draft });
  } catch (err) {
    console.error("[generate]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/articles", async (req, res) => {
  const { draft, theme, publish } = req.body || {};
  if (!draft?.title) {
    return res.status(400).json({ error: "保存する記事データがありません" });
  }

  let article = articleStore.createArticleFromDraft(
    { ...draft, status: publish ? "published" : "draft" },
    theme
  );

  await runHooks("onArticleCreated", article);
  if (article.status === "published") {
    const result = await publishArticle(article);
    article = result.article;
    res.json({
      success: true,
      article: summarize(article),
      publicUrl: result.publicUrl,
      publishStatus: result.publishStatus,
      errors: result.errors,
    });
    return;
  }

  res.json({ success: true, article: summarize(article) });
});

router.patch("/articles/:slug", async (req, res) => {
  const article = articleStore.updateArticle(req.params.slug, req.body || {});
  if (!article) return res.status(404).json({ error: "記事が見つかりません" });

  if (req.body?.status === "published") {
    const result = await publishArticle(article);
    return res.json({
      success: true,
      article: summarize(result.article),
      publicUrl: result.publicUrl,
      publishStatus: result.publishStatus,
      errors: result.errors,
    });
  }

  res.json({ success: true, article: summarize(article) });
});

router.delete("/articles/:slug", (req, res) => {
  const ok = articleStore.deleteArticleFile(req.params.slug);
  if (!ok) return res.status(404).json({ error: "記事が見つかりません" });
  res.json({ success: true });
});

router.get("/seo/analytics", (req, res) => {
  const { getAnalyticsSummary } = require("../utils/searchConsoleAnalytics");
  res.json(getAnalyticsSummary());
});

router.get("/seo/demand", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const { config } = require("../utils/config");
  const { rankArticlesByDemand, TOPIC_EXPANSION_RANKING } = require("../utils/articleDemand");
  const demandPath = path.join(config.dataDir, "article-demand.json");

  if (fs.existsSync(demandPath)) {
    return res.json(JSON.parse(fs.readFileSync(demandPath, "utf-8")));
  }

  const all = articleStore.getPublishedArticles();
  const ranked = rankArticlesByDemand(all);
  const byTier = { high: 0, medium: 0, low: 0 };
  for (const { tier } of ranked) byTier[tier] += 1;

  res.json({
    generatedAt: null,
    totalArticles: all.length,
    tiers: byTier,
    topicExpansionRanking: TOPIC_EXPANSION_RANKING,
    hint: "node scripts/analyze-article-demand.js で詳細レポートを生成",
  });
});

function summarize(article) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    category: article.category,
    tags: article.tags,
    status: article.status,
    theme: article.theme,
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
  };
}

module.exports = router;
