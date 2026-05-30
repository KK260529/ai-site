/**
 * 記事の検索需要スコア（ヒューリスティック）
 * GSC データ連携前の優先度付けに使用
 */

const HIGH_PATTERNS = [
  /ModuleNotFoundError/i,
  /ImportError/i,
  /SyntaxError/i,
  /TypeError: Cannot read properties/i,
  /NullPointerException/i,
  /ClassNotFoundException/i,
  /fatal: not a git repository/i,
  /fatal: Authentication failed/i,
  /error: failed to push some refs/i,
  /CONFLICT \(content\)/i,
  /ECONNREFUSED/i,
  /EADDRINUSE/i,
  /502 Bad Gateway/i,
  /504 Gateway/i,
  /CORS policy/i,
  /permission denied/i,
  /command not found/i,
  /ERROR \d{4}/i,
  /npm ERR!/i,
  /Cannot find module/i,
  /docker: Error response from daemon/i,
  /nginx: \[emerg\]/i,
  /HTTP 40[0-9]/i,
  /HTTP 50[0-9]/i,
];

const LOW_PATTERNS = [
  /failed at step \d+/i,
  /unbound variable$/i,
  /FOO_\d+/i,
  /duplicate location.*conf:\d+/i,
  /upstream-\d+\.conf/i,
  /location "\/api\/v\d+"/i,
  /\/var\/log\/app-\d+/i,
  /job-\d+\.sh/i,
  /deploy-\d+\.sh/i,
  /backup-\d+\.tar\.gz/i,
  /Health check failed: service "api-\d+/i,
  /Script exited with status \d+/i,
  /failed with exit code \d+ on query SELECT \* FROM orders_\d+/i,
  /line \d+: \$\{?[A-Z_]+_\d+\}?/i,
  /upstream: http:\/\/127\.0\.0\.1:\d{4}/i,
  /Request failed with status code \d{3} for \/api\/v\d+\/users\/\d+/i,
  /token \d+ の原因/i,
  /char \d+: unknown command/i,
];

function scoreSearchDemand(article) {
  const title = String(article.title || "");
  const summary = String(article.summary || "");
  const text = `${title} ${summary}`;
  let score = 50;

  if (article.articleType === "error") score += 15;

  for (const re of HIGH_PATTERNS) {
    if (re.test(text)) {
      score += 25;
      break;
    }
  }

  for (const re of LOW_PATTERNS) {
    if (re.test(text)) {
      score -= 35;
      break;
    }
  }

  // 具体性: 数字・引用符・パスが多いほど検索意図が明確
  if (/['"`][^'"`]{3,}['"`]/.test(title)) score += 10;
  if (/\/[\w.-]+/.test(title)) score += 5;
  if (title.length > 80) score += 5;
  if (title.length < 35) score -= 10;

  // 汎用語のみ
  if (/^(bash|linux|docker|sql): /i.test(title) && !/Error|error|fatal|ERROR/.test(title)) {
    score -= 15;
  }

  if (score >= 70) return { tier: "high", score };
  if (score >= 45) return { tier: "medium", score };
  return { tier: "low", score };
}

function rankArticlesByDemand(articles) {
  return [...articles]
    .map((a) => ({ article: a, ...scoreSearchDemand(a) }))
    .sort((a, b) => b.score - a.score);
}

/** 1000記事追加時の期待アクセス順（日本語技術検索需要ベース） */
const TOPIC_EXPANSION_RANKING = [
  { rank: 1, topic: "Python", slug: "python", expectedShare: "22%", rationale: "ModuleNotFoundError・pip・venv 等の検索ボリューム最大級" },
  { rank: 2, topic: "Git", slug: "git", expectedShare: "18%", rationale: "push rejected・merge conflict・認証エラーは開発者全員が検索" },
  { rank: 3, topic: "Docker", slug: "docker", expectedShare: "15%", rationale: "build失敗・port bind・daemon 接続はインフラ初学者の定番" },
  { rank: 4, topic: "Node.js", slug: "javascript", expectedShare: "12%", rationale: "Cannot find module・npm ERESOLVE・ECONNREFUSED が多い" },
  { rank: 5, topic: "Linux", slug: "linux", expectedShare: "11%", rationale: "permission denied・command not found・systemctl 系" },
  { rank: 6, topic: "React", slug: "javascript", expectedShare: "9%", rationale: "Hooks・Hydration・Minified React error（既存JSカテゴリに追加）" },
  { rank: 7, topic: "Next.js", slug: "javascript", expectedShare: "7%", rationale: "SSR/CSR・build・App Router エラー（具体メッセージ限定推奨）" },
  { rank: 8, topic: "VSCode", slug: "vscode", expectedShare: "6%", rationale: "拡張機能・Python interpreter・ESLint 設定（新規トピック推奨）" },
];

module.exports = {
  scoreSearchDemand,
  rankArticlesByDemand,
  TOPIC_EXPANSION_RANKING,
  HIGH_PATTERNS,
  LOW_PATTERNS,
};
