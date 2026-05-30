/**
 * 回遊・SEOハブ — 人気記事、タグ/カテゴリ説明、次に読む記事
 */
const articleStore = require("./articleStore");
const knowledgeStore = require("./stores/knowledgeStore");
const { getTopicLabel } = require("./topicLabels");
const { rankArticlesByDemand, scoreSearchDemand } = require("./articleDemand");
const { getLearningPaths, collectTagStats, collectCategoryStats, findRelatedArticles } = require("./discovery");

const CURATED_ERROR_QUERIES = [
  "ModuleNotFoundError",
  "failed to push some refs",
  "ECONNREFUSED",
  "502 Bad Gateway",
  "CORS policy",
  "npm ERR! code ERESOLVE",
  "Cannot connect to the Docker daemon",
  "Permission denied",
  "fatal: not a git repository",
  "SyntaxError",
  "ClassNotFoundException",
  "duplicate key value",
];

const TAG_DESCRIPTIONS = {
  ModuleNotFoundError: "Pythonでモジュールが見つからないときの原因と pip / venv の解決法。",
  npm: "Node.js の npm install・依存関係エラーのトラブルシューティング。",
  Docker: "コンテナビルド・起動・ネットワーク関連の Docker エラー集。",
  Git: "push / pull / merge / 認証失敗など Git 操作のエラー解説。",
  GitHub: "GitHub 連携・PR・権限・PAT 関連のエラー。",
  nginx: "nginx 設定・502/504・SSL のエラーログと対処法。",
  TypeError: "JavaScript / Node.js の TypeError と null/undefined 参照。",
  SyntaxError: "シェル・Python・JS の構文エラーと修正手順。",
  HTTP: "HTTP ステータスコード・API・CORS 関連。",
  SQL: "MySQL / PostgreSQL / SQLite のエラーコードと SQL 文法エラー。",
};

const CATEGORY_HUB = {
  "Pythonエラー": {
    intro: "Python 実行時に表示される例外・pip エラーの解決法を、エラーメッセージ全文で検索できます。",
    courseHref: "/course/errors/python-errors",
    beginnerHint: "まず ModuleNotFoundError・SyntaxError・ImportError から確認してください。",
  },
  "JavaScriptエラー": {
    intro: "Node.js / ブラウザ / npm / TypeScript のエラーを具体例つきで解説。",
    courseHref: "/course/errors/javascript-errors",
    beginnerHint: "Cannot find module・ECONNREFUSED・npm ERR から。",
  },
  "Dockerエラー": {
    intro: "docker run / build / compose の失敗原因とログの読み方。",
    courseHref: "/course/errors/docker-errors",
    beginnerHint: "daemon 未起動・port 競合・no space left から。",
  },
  "Gitエラー": {
    intro: "Git / GitHub の fatal・error・CONFLICT メッセージ別の対処法。",
    courseHref: "/course/errors/git-errors",
    beginnerHint: "push rejected・merge conflict・Authentication failed から。",
  },
  "Linuxエラー": {
    intro: "permission denied・command not found・systemd などサーバー運用エラー。",
    courseHref: "/course/errors/linux-errors",
    beginnerHint: "bash: xxx: command not found から。",
  },
  Python: { intro: "Python 入門講座。インストールから例外処理まで順番に学べます。", courseHref: "/course/python/python" },
  Git: { intro: "Git / GitHub 入門。基本操作から PR まで。", courseHref: "/course/git/git" },
  Docker: { intro: "Docker 入門。コンテナの基本から compose まで。", courseHref: "/course/docker/docker" },
};

function getPopularArticles(limit = 12) {
  return rankArticlesByDemand(articleStore.getPublishedArticles())
    .filter((x) => x.tier !== "low")
    .slice(0, limit)
    .map((x) => x.article);
}

function getTrendingErrorLinks(limit = 12) {
  const ranked = rankArticlesByDemand(
    articleStore.getPublishedArticles().filter((a) => a.articleType === "error" || a.knowledge?.topic === "errors")
  );
  const links = [];
  for (const q of CURATED_ERROR_QUERIES) {
    const hit = ranked.find(({ article }) => article.title.includes(q) || (article.summary || "").includes(q));
    if (hit && !links.some((l) => l.href === `/article/${hit.article.slug}`)) {
      links.push({ label: q, href: `/article/${hit.article.slug}`, title: hit.article.title });
    }
    if (links.length >= limit) return links;
  }
  for (const { article } of ranked) {
    if (links.some((l) => l.href === `/article/${article.slug}`)) continue;
    links.push({
      label: article.title.length > 52 ? article.title.slice(0, 49) + "…" : article.title,
      href: `/article/${article.slug}`,
      title: article.title,
    });
    if (links.length >= limit) break;
  }
  return links;
}

function getPopularCategories(limit = 10) {
  return collectCategoryStats().slice(0, limit);
}

function getErrorCategoryCards() {
  return [
    { label: "Python", href: "/course/errors/python-errors", count: 500 },
    { label: "JavaScript", href: "/course/errors/javascript-errors", count: 500 },
    { label: "Docker", href: "/course/errors/docker-errors", count: 500 },
    { label: "Git", href: "/course/errors/git-errors", count: 500 },
    { label: "Linux", href: "/course/errors/linux-errors", count: 500 },
    { label: "SQL", href: "/course/errors/sql-errors", count: 500 },
    { label: "HTTP / API", href: "/course/errors/http-errors", count: 500 },
    { label: "nginx", href: "/course/errors/nginx-errors", count: 500 },
    { label: "Java", href: "/course/errors/java-errors", count: 500 },
    { label: "Bash", href: "/course/errors/bash-errors", count: 500 },
  ];
}

function getTagDescription(tag) {
  if (TAG_DESCRIPTIONS[tag]) return TAG_DESCRIPTIONS[tag];
  if (/Error|error|ERR|fatal/i.test(tag)) {
    return `「${tag}」に関連する技術エラー記事一覧。エラーメッセージ全文で検索しやすい解説を掲載しています。`;
  }
  return `「${tag}」タグの記事一覧。関連するエラー解決・技術解説をまとめています。`;
}

function getCategoryHub(category) {
  return (
    CATEGORY_HUB[category] || {
      intro: `「${category}」カテゴリの技術記事。エラー解決から入門講座まで幅広く掲載しています。`,
      courseHref: null,
      beginnerHint: "人気記事から読み始めることをおすすめします。",
    }
  );
}

function getPopularInTag(tag, limit = 6) {
  const articles = articleStore.getPublishedArticles().filter((a) => (a.tags || []).includes(tag));
  return rankArticlesByDemand(articles)
    .slice(0, limit)
    .map((x) => x.article);
}

function getPopularInCategory(category, limit = 6) {
  const articles = articleStore.getPublishedArticles().filter((a) => a.category === category);
  return rankArticlesByDemand(articles)
    .slice(0, limit)
    .map((x) => x.article);
}

function getBeginnerArticlesInCategory(category, limit = 5) {
  const articles = articleStore
    .getPublishedArticles()
    .filter((a) => a.category === category && a.knowledge?.episode != null && a.knowledge.episode <= 3);
  return articles
    .sort((a, b) => (a.knowledge?.episode || 99) - (b.knowledge?.episode || 99))
    .slice(0, limit);
}

function getNextReadArticles(article, limit = 5) {
  const next = [];
  if (article.knowledge?.topic && article.knowledge?.courseId) {
    const course = knowledgeStore.getCourse(article.knowledge.topic, article.knowledge.courseId);
    const ep = article.knowledge.episode;
    if (course?.episodes && ep) {
      const nearby = course.episodes.filter((e) => e.episode > ep && e.episode <= ep + 3);
      const all = articleStore.getPublishedArticles();
      for (const e of nearby) {
        const a = all.find((x) => x.slug === e.slug);
        if (a) next.push(a);
      }
    }
  }
  const related = findRelatedArticles(article, limit + next.length);
  for (const a of related) {
    if (next.length >= limit) break;
    if (!next.some((x) => x.slug === a.slug)) next.push(a);
  }
  return next.slice(0, limit);
}

function getSameCategoryArticles(article, limit = 6) {
  if (!article.category) return [];
  return rankArticlesByDemand(
    articleStore.getPublishedArticles().filter((a) => a.category === article.category && a.slug !== article.slug)
  )
    .slice(0, limit)
    .map((x) => x.article);
}

function getLearningRouteForArticle(article) {
  if (article.knowledge?.topic === "errors") {
    const label = getTopicLabel("errors");
    return { title: `${label}で続きを探す`, href: `/course/${article.knowledge.topic}/${article.knowledge.courseId}` };
  }
  for (const path of getLearningPaths()) {
    for (const step of path.steps) {
      if (article.knowledge && step.href.includes(article.knowledge.topic)) {
        return { title: path.title, href: path.steps[0].href };
      }
    }
  }
  return { title: "講座一覧", href: "/topics" };
}

function findOrphanArticles(minLinks = 0) {
  const all = articleStore.getPublishedArticles();
  const linkedSlugs = new Set();
  for (const a of all) {
    for (const c of a.internalLinkCandidates || []) {
      if (c.slug) linkedSlugs.add(c.slug);
    }
  }
  return all.filter((a) => !linkedSlugs.has(a.slug) && scoreSearchDemand(a).tier === "high").slice(0, 100);
}

module.exports = {
  getPopularArticles,
  getTrendingErrorLinks,
  getPopularCategories,
  getErrorCategoryCards,
  getTagDescription,
  getCategoryHub,
  getPopularInTag,
  getPopularInCategory,
  getBeginnerArticlesInCategory,
  getNextReadArticles,
  getSameCategoryArticles,
  getLearningRouteForArticle,
  findOrphanArticles,
  CURATED_ERROR_QUERIES,
};
