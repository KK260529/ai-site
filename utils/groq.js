const OpenAI = require("openai");
const { config, isGroqConfigured, validateGroqApiKey, normalizeApiKey } = require("./config");
const { SYSTEM_PROMPT, buildUserPrompt } = require("./prompt");

function getClient() {
  const validation = validateGroqApiKey(config.groqApiKey);
  if (!validation.ok) return null;
  return new OpenAI({
    apiKey: validation.key,
    baseURL: config.groqBaseURL,
  });
}

function parseJsonResponse(raw) {
  const text = (raw || "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AIの応答をJSONとして解析できませんでした。");
  }
  return JSON.parse(jsonMatch[0]);
}

function toUserError(err) {
  const status = err.status || err.response?.status;
  const code = err.code || err.error?.code;

  if (status === 401 || code === "invalid_api_key") {
    return new Error(
      "Groq APIキーが無効です。.env の GROQ_API_KEY を確認し、https://console.groq.com/keys で新しいキーを作成して貼り直してください。その後サーバーを再起動してください。"
    );
  }
  if (status === 429) {
    return new Error("Groq APIの利用制限に達しました。しばらく待ってから再試行してください。");
  }
  if (status === 404 || (err.message && err.message.includes("model"))) {
    return new Error(
      `モデル「${config.groqModel}」が使えません。.env の GROQ_MODEL を確認してください。`
    );
  }
  return new Error(err.message || "記事の生成に失敗しました。");
}

async function verifyApiKey() {
  const validation = validateGroqApiKey(config.groqApiKey);
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  const client = getClient();
  if (!client) {
    return { ok: false, message: "GROQ_API_KEY が未設定です" };
  }
  try {
    await client.models.list();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: toUserError(err).message };
  }
}

async function generateArticle(theme, options = {}) {
  const client = getClient();
  if (!client) {
    throw new Error(
      "Groq API キーが未設定です。.env に GROQ_API_KEY を設定してサーバーを再起動してください。"
    );
  }

  try {
    const completion = await client.chat.completions.create({
      model: config.groqModel,
      temperature: 0.65,
      max_tokens: config.groqMaxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(theme, options) },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AIからの応答が空でした。");
    }

    const parsed = parseJsonResponse(content);
    validateArticlePayload(parsed);
    return parsed;
  } catch (err) {
    if (err.message?.includes("必須フィールド") || err.message?.includes("JSON")) {
      throw err;
    }
    throw toUserError(err);
  }
}

function validateArticlePayload(data) {
  const required = ["title", "summary", "body", "conclusion", "tags", "category"];
  for (const key of required) {
    if (!data[key]) {
      throw new Error(`AI応答に必須フィールド「${key}」がありません。`);
    }
  }
  if (!Array.isArray(data.tags)) {
    throw new Error("tags は配列である必要があります。");
  }
}

module.exports = {
  getClient,
  generateArticle,
  verifyApiKey,
  isGroqConfigured,
  parseJsonResponse,
  toUserError,
};
