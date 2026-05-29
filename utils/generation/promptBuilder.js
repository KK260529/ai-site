const knowledgeStore = require("../stores/knowledgeStore");
const memoryStore = require("../stores/memoryStore");

const EPISODE_SYSTEM_PROMPT = `あなたは「個人用AI知識出版社」の編集者兼ライターです。
講座の1エピソード（記事）を、**初心者が一人で理解できるまで丁寧に**日本語で執筆します。

## 分量（最重要）
- body の HTML をタグ除去したテキストで **2500字以上**（目標 3000〜4500字）
- 短い記事・箇条書きだけの記事は不可
- h2 見出しは **5つ以上**、h3 は **3つ以上**
- 各 h2 セクションは **400字以上** で、理由・手順・例を含める

## 構成（この順で書く）
1. 導入（この回で何ができるようになるか、前回との関係）
2. なぜ学ぶのか（背景・メリット）
3. 核心概念の説明（比喩・図解的な言い換えを入れる）
4. 手順・具体例（コマンドや操作があれば <pre><code> で）
5. よくあるつまずき・誤解
6. 確認方法・次にやること
7. 次回エピソードへの橋渡し

## わかりやすさ
- 専門用語の直後に平易な説明を添える
- 1文は長くしすぎない（60字前後）
- 「ここがポイント」「よくある誤解」など h3 で区切る
- 具体例・比喩を各セクションに入れる

## 品質ルール
- 用語辞書に従い用語を統一
- AI臭い定型文を避ける
- 誇張・不自然なSEOを禁止
- 同じ説明の繰り返しを避ける（ただし重要概念は別角度で再説明してよい）

## HTML
使用可: h2, h3, p, ul, ol, li, code, pre, strong のみ

## 出力形式（JSONのみ）
{
  "title": "記事タイトル",
  "summary": "概要（140〜180字）",
  "body": "<h2>導入</h2><p>...</p>... 長めのHTML本文",
  "conclusion": "まとめ（4〜6文、学んだことと次の一歩）",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "category": "カテゴリ",
  "slug": "english-kebab-slug",
  "metaTitle": "SEOタイトル（60字以内）",
  "metaDescription": "SEO説明（120〜155字）",
  "summaryMemory": ["要点1", "要点2", "要点3", "要点4"],
  "nextEpisodeHint": "次回予告（1〜2文）",
  "faq": [{"question":"...", "answer":"..."}, {"question":"...", "answer":"..."}]
}`;

function buildEpisodeContext({ topic, courseId, slug, angle }) {
  const course = knowledgeStore.getCourse(topic, courseId);
  const episode = course?.episodes?.find((e) => e.slug === slug);
  const roadmap = knowledgeStore.getRoadmap(topic);
  const glossary = knowledgeStore.getGlossary(topic);
  const concepts = knowledgeStore.getConcepts(topic);
  const siteRules = memoryStore.getSiteRules();
  const writingRules = memoryStore.getWritingRules();
  const prevSummaries = episode
    ? knowledgeStore.getPreviousSummaries(topic, courseId, episode.episode)
    : [];

  return {
    topic,
    courseId,
    course,
    episode,
    roadmap,
    glossary,
    concepts,
    siteRules,
    writingRules,
    prevSummaries,
    angle,
  };
}

function buildEpisodeUserPrompt(ctx) {
  const glossaryText = Object.entries(ctx.glossary || {})
    .slice(0, 30)
    .map(([k, v]) => `${k}: ${v.definition}（関連: ${(v.related || []).join(", ")}）`)
    .join("\n");

  const prevText = (ctx.prevSummaries || [])
    .map((s) => `【${s.slug}】\n${(s.summaryMemory || []).join("\n")}`)
    .join("\n\n");

  return `【講座情報】
${JSON.stringify(
  {
    courseId: ctx.course?.courseId,
    title: ctx.course?.title,
    description: ctx.course?.description,
    target: ctx.course?.target,
    episode: ctx.episode,
  },
  null,
  2
)}

【学習ロードマップ】
${JSON.stringify(ctx.roadmap, null, 2)}

【用語辞書】
${glossaryText || "（なし）"}

【前回までの内容（要約メモリ）】
${prevText || "（初回エピソード）"}

【サイトルール】
${JSON.stringify(ctx.siteRules, null, 2)}

【執筆ルール】
${JSON.stringify(ctx.writingRules, null, 2)}

${ctx.angle ? `【切り口】\n${ctx.angle}` : ""}

【重要】本文はタグ除去後 **2500字以上**。薄い短い記事は不合格です。初心者が読んで迷わないよう、理由と手順を丁寧に書いてください。

上記を踏まえ、エピソード「${ctx.episode?.title || ctx.episode?.slug}」の記事をJSONで生成してください。
slugは "${ctx.episode?.slug}" を使用してください。faq は2件以上含めてください。`;
}

module.exports = {
  EPISODE_SYSTEM_PROMPT,
  buildEpisodeContext,
  buildEpisodeUserPrompt,
};
