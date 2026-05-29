const { getClient, parseJsonResponse, toUserError } = require("../groq");
const { config } = require("../config");
const knowledgeStore = require("../stores/knowledgeStore");
const draftStore = require("../stores/draftStore");
const historyStore = require("../stores/historyStore");
const articleStore = require("../articleStore");
const { sanitizeHtml } = require("../sanitize");
const { applyInternalLinks } = require("../internalLinks");
const { buildSeoExtended } = require("../seoExtended");
const {
  EPISODE_SYSTEM_PROMPT,
  buildEpisodeContext,
  buildEpisodeUserPrompt,
} = require("./promptBuilder");

function plainTextLength(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .length;
}

async function callGroq(client, messages) {
  const completion = await client.chat.completions.create({
    model: config.groqModel,
    temperature: 0.6,
    max_tokens: config.groqMaxTokens,
    response_format: { type: "json_object" },
    messages,
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AIからの応答が空でした。");
  return { content: raw, usage: completion.usage };
}

function validateEpisodePayload(data) {
  const required = [
    "title",
    "summary",
    "body",
    "conclusion",
    "tags",
    "category",
    "slug",
    "summaryMemory",
  ];
  for (const key of required) {
    if (!data[key]) throw new Error(`AI応答に必須フィールド「${key}」がありません。`);
  }
  if (!Array.isArray(data.tags)) throw new Error("tags は配列である必要があります。");
  if (!Array.isArray(data.summaryMemory)) {
    throw new Error("summaryMemory は配列である必要があります。");
  }
}

async function generateEpisodeArticle({ topic, courseId, slug, angle }) {
  const client = getClient();
  if (!client) {
    throw new Error("Groq API キーが未設定です。.env を確認しサーバーを再起動してください。");
  }

  const ctx = buildEpisodeContext({ topic, courseId, slug, angle });
  if (!ctx.episode) {
    throw new Error(`エピソードが見つかりません: ${topic}/${courseId}/${slug}`);
  }

  const userPrompt = buildEpisodeUserPrompt(ctx);

  const messages = [
    { role: "system", content: EPISODE_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  let groqResult = await callGroq(client, messages);
  let rawContent = groqResult.content;
  let parsed = parseJsonResponse(rawContent);
  validateEpisodePayload(parsed);

  const minChars = 2200;
  if (plainTextLength(parsed.body) < minChars) {
    console.log(`[episode] 本文が短い (${plainTextLength(parsed.body)}字) → 再生成`);
    messages.push(
      { role: "assistant", content: rawContent },
      {
        role: "user",
        content: `前回の body が短すぎます（${plainTextLength(parsed.body)}字）。同じ slug で、body をタグ除去後2500字以上になるよう、h2を5つ以上、具体例・手順・よくある誤解を増やして書き直してください。JSONのみ返してください。`,
      }
    );
    groqResult = await callGroq(client, messages);
    rawContent = groqResult.content;
    parsed = parseJsonResponse(rawContent);
    validateEpisodePayload(parsed);
  }

  parsed.slug = slug;
  parsed.body = applyInternalLinks(sanitizeHtml(parsed.body), topic, slug);

  const now = new Date().toISOString();
  const articleMeta = {
    ...parsed,
    knowledge: { topic, courseId, episode: ctx.episode.episode },
    theme: `${topic} - ${ctx.course.title}`,
    status: "review-needed",
    createdAt: now,
    updatedAt: now,
  };

  const seo = buildSeoExtended(articleMeta, ctx);
  const finalArticle = { ...articleMeta, ...seo };

  historyStore.saveGenerationHistory(slug, {
    prompt: userPrompt,
    rawResponse: { content: rawContent, usage: groqResult.usage },
    final: finalArticle,
  });

  knowledgeStore.saveSummary(topic, {
    slug,
    courseId,
    episode: ctx.episode.episode,
    summaryMemory: parsed.summaryMemory,
    nextEpisodeHint: parsed.nextEpisodeHint || "",
    updatedAt: now,
  });

  draftStore.saveDraft("review", slug, finalArticle);

  return {
    draft: finalArticle,
    ctx,
    userPrompt,
    rawContent,
  };
}

async function publishFromDraft(slug, { publish = false } = {}) {
  const { publishArticle } = require("../publish/publishService");
  let fromBucket = "review";
  let draft = draftStore.readDraft("review", slug);
  if (!draft) {
    draft = draftStore.readDraft("ready", slug);
    fromBucket = "ready";
  }
  if (!draft) throw new Error("下書きが見つかりません");

  if (publish) {
    const article = articleStore.createArticleFromDraft(
      { ...draft, status: "published" },
      draft.theme
    );
    draftStore.deleteDraft("review", slug);
    draftStore.deleteDraft("ready", slug);
    const result = await publishArticle(article);
    return result.article;
  }

  const article = articleStore.createArticleFromDraft({ ...draft, status: "draft" }, draft.theme);
  if (fromBucket === "review") {
    draftStore.moveDraft(slug, "review", "ready");
  }
  return article;
}

module.exports = { generateEpisodeArticle, publishFromDraft, validateEpisodePayload };
