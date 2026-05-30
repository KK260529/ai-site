/**
 * 記事の文章量プリセット（生成プロンプト・再生成しきい値・max_tokens）
 */
const PRESETS = {
  short: {
    id: "short",
    label: "短め",
    description: "約800〜1200字（Groq節約向け）",
    minChars: 700,
    targetMin: 800,
    targetMax: 1200,
    minH2: 3,
    minH3: 2,
    sectionMinChars: 180,
    maxTokens: 2048,
  },
  medium: {
    id: "medium",
    label: "標準",
    description: "約1500〜2200字（バランス型）",
    minChars: 1300,
    targetMin: 1500,
    targetMax: 2200,
    minH2: 4,
    minH3: 3,
    sectionMinChars: 280,
    maxTokens: 4096,
  },
  long: {
    id: "long",
    label: "長め",
    description: "約2500〜4000字（丁寧な解説）",
    minChars: 2200,
    targetMin: 2500,
    targetMax: 4500,
    minH2: 5,
    minH3: 3,
    sectionMinChars: 400,
    maxTokens: 8192,
  },
};

const PRESET_IDS = Object.keys(PRESETS);

function resolveArticleLength(input) {
  const key = String(input || process.env.ARTICLE_LENGTH || "medium")
    .trim()
    .toLowerCase();

  const base = PRESETS[key] || PRESETS.medium;

  const minChars = Number(process.env.ARTICLE_MIN_CHARS);
  const targetMin = Number(process.env.ARTICLE_TARGET_MIN);
  const targetMax = Number(process.env.ARTICLE_TARGET_MAX);

  return {
    ...base,
    ...(Number.isFinite(minChars) && minChars > 0 ? { minChars, targetMin: minChars } : {}),
    ...(Number.isFinite(targetMin) && targetMin > 0 ? { targetMin } : {}),
    ...(Number.isFinite(targetMax) && targetMax > 0 ? { targetMax } : {}),
  };
}

function listArticleLengthPresets() {
  return PRESET_IDS.map((id) => ({
    id,
    label: PRESETS[id].label,
    description: PRESETS[id].description,
    targetMin: PRESETS[id].targetMin,
    targetMax: PRESETS[id].targetMax,
    maxTokens: PRESETS[id].maxTokens,
  }));
}

function getMaxTokensForLength(length) {
  const L = resolveArticleLength(length);
  const envMax = Number(process.env.GROQ_MAX_TOKENS);
  if (Number.isFinite(envMax) && envMax > 0) {
    return Math.min(envMax, L.maxTokens);
  }
  return L.maxTokens;
}

function buildLengthSection(length) {
  const L = resolveArticleLength(length);
  return `- body の HTML をタグ除去したテキストで **${L.targetMin}字以上**（目標 ${L.targetMin}〜${L.targetMax}字）
- h2 見出しは **${L.minH2}つ以上**、h3 は **${L.minH3}つ以上**
- 各 h2 セクションは **${L.sectionMinChars}字以上** で、理由・手順・例を含める`;
}

function buildEpisodeLengthReminder(length) {
  const L = resolveArticleLength(length);
  return `【重要】本文はタグ除去後 **${L.targetMin}字以上**（目標 ${L.targetMin}〜${L.targetMax}字）。h2は${L.minH2}つ以上。薄い短い記事は不合格です。`;
}

function buildRetryUserMessage(length, actualChars) {
  const L = resolveArticleLength(length);
  return `前回の body が短すぎます（${actualChars}字）。同じ slug で、body をタグ除去後${L.targetMin}字以上になるよう、h2を${L.minH2}つ以上、具体例・手順・よくある誤解を増やして書き直してください。JSONのみ返してください。`;
}

function buildSimpleArticleLengthRule(length) {
  const L = resolveArticleLength(length);
  return `${L.targetMin}〜${L.targetMax}字程度（タグ除去後。h2 ${L.minH2}つ以上）`;
}

module.exports = {
  PRESETS,
  PRESET_IDS,
  resolveArticleLength,
  listArticleLengthPresets,
  getMaxTokensForLength,
  buildLengthSection,
  buildEpisodeLengthReminder,
  buildRetryUserMessage,
  buildSimpleArticleLengthRule,
};
