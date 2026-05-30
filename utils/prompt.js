const {
  resolveArticleLength,
  buildSimpleArticleLengthRule,
} = require("./generation/articleLength");

function buildSystemPrompt(length) {
  const L = resolveArticleLength(length);
  return `あなたは技術ブログのプロライターです。
指定テーマについて、初心者向けの技術まとめ記事を日本語で作成します。

## 執筆ルール
1. テーマごとに内容を変え、汎用テンプレの使い回し禁止
2. 具体例・コマンド例・比喩を入れる
3. 専門用語には短い説明を添える
4. 見出しは h2 / h3 を使った HTML（<h2><h3><p><ul><li><code><pre> のみ使用可）
5. 本文は${buildSimpleArticleLengthRule(length)}。短すぎないこと
6. h2 を${L.minH2}つ以上、h3 を${L.minH3}つ以上。各セクションは丁寧に説明
7. SEOを意識した自然なキーワード配置
8. 読みやすい短い段落。専門用語には平易な説明を添える

## 出力形式
必ず次のJSONのみを返す（説明文やマークダウンコードブロックは不要）:

{
  "title": "記事タイトル（40字以内、魅力的に）",
  "summary": "概要（120〜160字、検索結果向け）",
  "body": "<h2>...</h2><p>...</p>... 形式のHTML本文",
  "conclusion": "まとめ（2〜4文）",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "category": "カテゴリ名（Linux / Git / Java / Python / AI / Web開発 など）",
  "slug": "english-kebab-case-slug",
  "metaTitle": "検索結果向けタイトル（55〜60字。ベネフィット＋キーワード）",
  "metaDescription": "120〜155字。誰向け・何が学べるか・クリックしたくなる一文",
  "ogTitle": "SNS向けタイトル（40字以内）",
  "ogDescription": "SNS向け説明（100字前後）"
}`;
}

function buildUserPrompt(theme, options = {}) {
  const angle = options.angle ? `\n切り口: ${options.angle}` : "";
  return `テーマ: ${theme}${angle}

上記テーマで、初心者が実践できる技術まとめ記事をJSON形式で生成してください。`;
}

/** @deprecated buildSystemPrompt(length) を使用 */
const SYSTEM_PROMPT = buildSystemPrompt("long");

module.exports = { SYSTEM_PROMPT, buildSystemPrompt, buildUserPrompt };
