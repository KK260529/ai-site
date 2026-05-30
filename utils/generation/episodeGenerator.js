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
  buildEpisodeSystemPrompt,
  buildEpisodeContext,
  buildEpisodeUserPrompt,
} = require("./promptBuilder");
const {
  resolveArticleLength,
  getMaxTokensForLength,
  buildRetryUserMessage,
} = require("./articleLength");

function plainTextLength(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .length;
}

async function callGroq(client, messages, length) {
  const completion = await client.chat.completions.create({
    model: config.groqModel,
    temperature: 0.6,
    max_tokens: getMaxTokensForLength(length),
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

async function generateEpisodeArticle({ topic, courseId, slug, angle, length }) {
  const client = getClient();
  if (!client) {
    throw new Error("Groq API キーが未設定です。.env を確認しサーバーを再起動してください。");
  }

  const lengthKey = length || config.articleLength;
  const lengthOpts = resolveArticleLength(lengthKey);

  const ctx = buildEpisodeContext({ topic, courseId, slug, angle });
  if (!ctx.episode) {
    throw new Error(`エピソードが見つかりません: ${topic}/${courseId}/${slug}`);
  }

  const userPrompt = buildEpisodeUserPrompt(ctx, lengthKey);

  const messages = [
    { role: "system", content: buildEpisodeSystemPrompt(lengthKey) },
    { role: "user", content: userPrompt },
  ];

  let groqResult = await callGroq(client, messages, lengthKey);
  let rawContent = groqResult.content;
  let parsed = parseJsonResponse(rawContent);
  validateEpisodePayload(parsed);

  if (plainTextLength(parsed.body) < lengthOpts.minChars) {
    const actual = plainTextLength(parsed.body);
    console.log(`[episode] 本文が短い (${actual}字 / 目標${lengthOpts.minChars}字) → 再生成`);
    messages.push(
      { role: "assistant", content: rawContent },
      {
        role: "user",
        content: buildRetryUserMessage(lengthKey, actual),
      }
    );
    groqResult = await callGroq(client, messages, lengthKey);
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
