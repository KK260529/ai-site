#!/usr/bin/env node
/**
 * errors トピックの knowledge/ をセットアップ
 */
const fs = require("fs");
const path = require("path");
const techDefs = require("./errors-tech-def");

const ROOT = path.join(__dirname, "..", "knowledge", "errors");

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function loadCatalog(tech) {
  const p = path.join(__dirname, "errors-catalog", "data", `${tech}.json`);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

function main() {
  const allSlugs = [];

  writeJson(path.join(ROOT, "roadmap.json"), {
    topic: "errors",
    title: "エラー・トラブル集",
    description:
      "プログラミング言語・インフラ技術ごとのエラーメッセージと解決法を検索しやすくまとめたトラブルシューティング集。実際のコンソール出力をそのまま掲載し、原因・確認手順・解決策を解説します。",
    beginnerPath: techDefs.map((t) => `${t.tech}-errors-hub`),
  });

  writeJson(path.join(ROOT, "glossary.json"), {
    terms: {
      エラーメッセージ: { aliases: ["error message", "例外"], description: "実行時に表示される問題の説明" },
      スタックトレース: { aliases: ["stack trace", "traceback"], description: "エラー発生箇所の呼び出し履歴" },
      トラブルシューティング: { aliases: ["障害対応", "デバッグ"], description: "原因を切り分けて修正する作業" },
      "exit code": { aliases: ["終了コード", "ステータスコード"], description: "プロセス終了時の数値" },
      CORS: { aliases: ["Cross-Origin"], description: "ブラウザのオリジン間通信制限" },
    },
  });

  writeJson(path.join(ROOT, "concepts.json"), {
    concepts: [
      { id: "error-lookup", title: "エラー検索", description: "メッセージ全文で検索して該当記事を見つける" },
      { id: "root-cause", title: "根本原因", description: "表面のエラーではなく発生条件を特定する" },
    ],
  });

  for (const def of techDefs) {
    const catalog = loadCatalog(def.tech);
    const episodes = catalog.map((e, i) => ({
      episode: i + 1,
      title: e.title || `${e.errorMessage} の原因と解決法`,
      slug: e.slug,
    }));

    allSlugs.push(...episodes.map((e) => e.slug));

    writeJson(path.join(ROOT, "courses", `${def.courseId}.json`), {
      courseId: def.courseId,
      title: def.title,
      description: `${def.label} で遭遇する具体的なエラーメッセージ ${episodes.length} 件と解決法。検索エンジンでエラー全文を調べたときにヒットしやすい構成です。`,
      target: `${def.label} 開発者・運用担当者`,
      topic: "errors",
      episodes,
    });
  }

  console.log(`✓ knowledge/errors セットアップ完了（${techDefs.length} コース, ${allSlugs.length} エピソード）`);
}

main();
