const knowledgeStore = require("../stores/knowledgeStore");
const memoryStore = require("../stores/memoryStore");
const {
  buildLengthSection,
  buildEpisodeLengthReminder,
} = require("./articleLength");
const { buildPrinciplesSection } = require("./writingPrinciples");

function buildEpisodeSystemPrompt(length) {
  return `あなたは「個人用AI知識出版社」の編集者兼ライターです。
講座の1エピソード（記事）を、**初心者が一人で理解できるまで丁寧に**日本語で執筆します。

## 分量（最重要）
${buildLengthSection(length)}
- 短い記事・箇条書きだけの記事は不可

## 構成（この順で書く）
1. **結論ファースト**：冒頭のh2で「この記事を読むと何が分かるか／何ができるか」を先に述べる
2. 導入（この回で何ができるようになるか、前回との関係）
3. なぜ学ぶのか（背景・メリット・利用シーン）
4. 核心概念の説明（比喩・なぜそうなるのか）
5. 手順・具体例（コマンドや操作があれば <pre><code> で必ず入れる）
6. よくあるつまずき・失敗例・誤解（一般論だけにしない）
7. 確認方法
8. 次回エピソードへの橋渡し

${buildPrinciplesSection()}

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
  "metaTitle": "検索結果向けタイトル（55〜60字。ベネフィット＋キーワード。例: Javaの基礎をゼロから学ぶ｜初心者ガイド）",
  "metaDescription": "120〜155字。誰向け・何が学べるか・クリックしたくなる一文（例: 初めてJavaを触る人向け。インストールからHello Worldまで、図解つきで丁寧に解説）",
  "ogTitle": "SNSシェア向けタイトル（40字以内、インパクト重視）",
  "ogDescription": "SNS向け説明（100字前後、要点を端的に）",
  "summaryMemory": ["要点1", "要点2", "要点3", "要点4"],
  "nextEpisodeHint": "次回予告（1〜2文）",
  "nextAction": "読者が今すぐ取るべき具体的な次の一歩（1〜3文）",
  "faq": [{"question":"...", "answer":"..."}, ... 5件以上],
  "internalLinkCandidates": [{"slug":"english-slug", "title":"記事タイトル", "reason":"なぜ関連するか（1文）"}, ... 5件以上]
}`;
}

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

function buildEpisodeUserPrompt(ctx, length) {
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

${buildEpisodeLengthReminder(length)} 初心者が読んで迷わないよう、理由と手順を丁寧に書いてください。

上記を踏まえ、エピソード「${ctx.episode?.title || ctx.episode?.slug}」の記事をJSONで生成してください。
slugは "${ctx.episode?.slug}" を使用してください。
faq は5件以上、internalLinkCandidates は同一サイト内の関連記事を5件以上含めてください（slugは英語kebab-case）。
nextAction には読者が次に取るべき具体的な行動を書いてください。`;
}

module.exports = {
  buildEpisodeSystemPrompt,
  buildEpisodeContext,
  buildEpisodeUserPrompt,
};
