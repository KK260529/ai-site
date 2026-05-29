# AIまとめサイト自動生成システム

Groq API（無料枠あり）を使い、テーマから技術まとめ記事を自動生成して JSON 保存・サイト公開するシステムです。

将来的に **複数サイトの自動量産** へ拡張できる構成になっています。

## 機能

- **記事生成**: テーマ → タイトル / 概要 / 本文 / まとめ / タグ / カテゴリ（Groq AI）
- **記事管理**: 一覧・詳細・検索・カテゴリフィルタ・公開/下書き
- **SEO**: meta title / description / slug / OGP / JSON-LD 自動生成
- **管理画面**: `/admin` で生成・保存・削除・公開切替

## 技術構成

| 層 | 技術 |
|----|------|
| Frontend | HTML / CSS / Vanilla JavaScript |
| Backend | Node.js / Express |
| AI | Groq API (`llama-3.3-70b-versatile`) |
| 保存 | `/articles/*.json` |

## ディレクトリ構成

```
├── articles/          # 記事JSON（自動生成）
├── data/              # CSV一括用サンプル（将来）
├── public/            # 静的CSS・JS
├── routes/            # Expressルート
├── templates/         # HTMLテンプレート（SSR）
├── utils/             # Groq・保存・SEO・描画
│   └── automation/    # 将来の自動化フック
├── server.js
├── package.json
└── .env.example
```

## インストール

### 1. 必要環境

- [Node.js](https://nodejs.org/) 18 以上
- Groq アカウント（無料登録可）

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
copy .env.example .env
```

`.env` を編集:

```env
GROQ_API_KEY=gsk_xxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile
SITE_NAME=TechMatome AI
SITE_URL=http://localhost:3000
PORT=3000
```

### 4. 起動

**Windows（おすすめ）**: エクスプローラーで `start.bat` をダブルクリック

または:

```bash
npm start
```

> ブラウザで `index.html` を直接開いても動きません。必ずサーバーを起動してください。

### うまく開けないとき

| 症状 | 対処 |
|------|------|
| ページが表示されない | `npm install` → `npm start` または `start.bat` を実行 |
| `Cannot find module 'express'` | `npm install` が未実行。プロジェクトフォルダで実行 |
| `npm` が見つからない | [Node.js LTS](https://nodejs.org/) をインストール（npm 同梱） |
| ポート使用中 | `.env` の `PORT=3001` などに変更 |

| URL | 内容 |
|-----|------|
| http://localhost:3000 | ホーム（記事一覧） |
| http://localhost:3000/admin | 管理画面 |
| http://localhost:3000/article/:slug | 記事ページ |

## Groq API キーの取得方法（無料で始める）

1. [Groq Console](https://console.groq.com/) にアクセス
2. アカウント登録（Google/GitHub など）
3. **API Keys** → **Create API Key**
4. 表示された `gsk_...` を `.env` の `GROQ_API_KEY` に貼り付け

> Groq は無料枠があり、個人の学習・検証用途では OpenAI より始めやすいです。  
> 利用制限・料金は [Groq のドキュメント](https://console.groq.com/docs) で確認してください。

## 使い方

1. `/admin` を開く
2. テーマを入力（例: `Docker入門`）
3. **AIで記事を生成** をクリック
4. プレビューを確認 → **公開して保存** または **下書き保存**
5. ホーム `/` で公開記事が表示される

## 記事の保存形式

`/articles/{slug}.json` 例:

```json
{
  "slug": "linux-basic-commands",
  "title": "…",
  "summary": "…",
  "body": "<h2>…</h2><p>…</p>",
  "conclusion": "…",
  "tags": ["Linux", "初心者"],
  "category": "Linux",
  "status": "published",
  "metaTitle": "…",
  "metaDescription": "…",
  "jsonLd": { … }
}
```

## Vercel への公開方法

### 注意（重要）

Vercel のサーバーレス環境では **ローカルファイル（articles/）への書き込みが永続化されません**。  
本番で記事保存が必要な場合は、次のいずれかを検討してください。

- **Railway / Render / VPS** など常時起動サーバーにデプロイ（JSON保存がそのまま使える）
- Vercel + **Supabase / PlanetScale / Vercel Blob** など外部ストレージへ `articleStore.js` を差し替え

### Vercel 手順（実験・デモ向け）

1. GitHub にリポジトリを push
2. [Vercel](https://vercel.com/) で Import
3. 環境変数に `GROQ_API_KEY`, `SITE_URL`, `SITE_NAME` を設定
4. `vercel.json` を使う場合はプロジェクトルートに配置

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

5. Deploy 後、`SITE_URL` を本番URLに更新して再デプロイ

## 将来的な自動化方法

コードは拡張ポイントを用意済みです。

| 機能 | 拡張場所 |
|------|----------|
| cron 自動生成 | `utils/automation/index.js` + 外部 cron |
| CSV 一括生成 | `utils/automation/bulkGenerate.js` + `data/keywords.csv` |
| 予約投稿 | `articleStore` に `scheduledAt` 追加 + cron |
| RSS 取得 | 新規 `utils/rss.js` + automation hooks |
| SEO 強化 | `utils/seo.js` 拡張 |
| 内部リンク自動化 | 記事保存後 hook で関連記事挿入 |
| AI 画像生成 | `onArticlePublished` hook |
| SNS 自動投稿 | `onArticlePublished` hook |
| 複数サイト量産 | `config/sites.json` + サイト別 `articles/` ディレクトリ |
| ジャンル別テンプレ | `utils/prompt.js` に `getTemplate(genre)` 追加 |

### CSV 一括生成（準備済み・スタブ）

```bash
# 将来実装後の想定コマンド
node utils/automation/bulkGenerate.js data/keywords.csv
```

`data/keywords.example.csv` を参考にキーワードリストを作成します。

### 自動化フックの登録例

`server.js` または起動スクリプトで:

```javascript
const { registerHook } = require("./utils/automation");
registerHook("onArticlePublished", async (article) => {
  console.log("公開:", article.slug);
  // ここに SNS投稿・サイトマップ更新など
});
```

## API 一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/health` | API状態 |
| GET | `/api/articles` | 記事一覧（`?q=&category=&tag=&all=true`） |
| POST | `/api/articles/generate` | AI生成 `{ theme, angle? }` |
| POST | `/api/articles` | 保存 `{ draft, theme, publish }` |
| PATCH | `/api/articles/:slug` | 更新（公開切替など） |
| DELETE | `/api/articles/:slug` | 削除 |

## ライセンス

MIT（学習・個人利用自由）
