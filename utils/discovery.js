const articleStore = require("./articleStore");
const knowledgeStore = require("./stores/knowledgeStore");
const { getTopicLabel } = require("./topicLabels");

function slugifyTag(tag) {
  return encodeURIComponent(String(tag || "").trim());
}

function decodeTagParam(param) {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

function collectTagStats(minCount = 2) {
  const counts = new Map();
  for (const a of articleStore.getPublishedArticles()) {
    for (const tag of a.tags || []) {
      const key = String(tag).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count, url: `/tag/${slugifyTag(tag)}` }));
}

function collectCategoryStats() {
  const counts = new Map();
  for (const a of articleStore.getPublishedArticles()) {
    const cat = String(a.category || "").trim();
    if (!cat) continue;
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      url: `/category/${slugifyTag(category)}`,
    }));
}

function scoreRelatedArticle(article, candidate) {
  if (candidate.slug === article.slug) return -1;
  let score = 0;
  if (
    article.knowledge?.courseId &&
    candidate.knowledge?.courseId === article.knowledge.courseId &&
    candidate.knowledge?.topic === article.knowledge.topic
  ) {
    score += 12;
  }
  if (candidate.category === article.category) score += 5;
  const tags = new Set(article.tags || []);
  for (const t of candidate.tags || []) {
    if (tags.has(t)) score += 4;
  }
  if (candidate.knowledge?.topic === article.knowledge?.topic) score += 2;
  if (article.articleType === "error" && candidate.articleType === "error") {
    const errA = (article.title || "").split(":")[0];
    const errB = (candidate.title || "").split(":")[0];
    if (errA && errA === errB) score += 8;
  }
  return score;
}

function findRelatedArticles(article, limit = 8) {
  return articleStore
    .getPublishedArticles()
    .map((a) => ({ article: a, score: scoreRelatedArticle(article, a) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.article.publishedAt) - new Date(a.article.publishedAt))
    .slice(0, limit)
    .map((x) => x.article);
}

function getFeaturedArticles(limit = 6) {
  return articleStore
    .getPublishedArticles()
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))
    .slice(0, limit);
}

function getLearningPaths() {
  return [
    {
      title: "エラー解決コース",
      description: "開発・運用で遭遇する具体的なエラーメッセージから解決法を検索",
      steps: [
        { label: "Python エラー", href: "/course/errors/python-errors" },
        { label: "JavaScript エラー", href: "/course/errors/javascript-errors" },
        { label: "Docker エラー", href: "/course/errors/docker-errors" },
        { label: "Git エラー", href: "/course/errors/git-errors" },
        { label: "全エラー集", href: "/knowledge/errors" },
      ],
    },
    {
      title: "インフラ・ドキュメントコース",
      description: "Markdown → HTTP → nginx → Bash → 正規表現",
      steps: [
        { label: "Markdown", href: "/knowledge/markdown" },
        { label: "HTTP", href: "/knowledge/http" },
        { label: "nginx", href: "/knowledge/nginx" },
        { label: "Bash", href: "/knowledge/bash" },
        { label: "正規表現", href: "/knowledge/regex" },
      ],
    },
    {
      title: "Web開発コース",
      description: "Python → Git → HTML/CSS → Docker の順で学ぶ",
      steps: [
        { label: "Python", href: "/knowledge/python" },
        { label: "Git", href: "/knowledge/git" },
        { label: "Web制作", href: "/knowledge/web" },
        { label: "Docker", href: "/knowledge/docker" },
      ],
    },
    {
      title: "バックエンドコース",
      description: "Linux → SQL → Java → Python",
      steps: [
        { label: "Linux", href: "/knowledge/linux" },
        { label: "SQL", href: "/knowledge/sql" },
        { label: "Java", href: "/knowledge/java" },
        { label: "Python", href: "/knowledge/python" },
      ],
    },
    {
      title: "AI・データコース",
      description: "Python基礎 → AI入門（順次公開）",
      steps: [
        { label: "Python", href: "/course/python/python" },
        { label: "AI入門", href: "/knowledge/ai" },
      ],
    },
  ];
}

function listTopicSummaries() {
  return knowledgeStore.listTopics().map((topic) => {
    const roadmap = knowledgeStore.getRoadmap(topic);
    const courses = knowledgeStore.listCourses(topic);
    const published = articleStore
      .getPublishedArticles()
      .filter((a) => a.knowledge?.topic === topic).length;
    return {
      topic,
      title: getTopicLabel(topic) || roadmap.title || topic,
      description: roadmap.description || "",
      courseCount: courses.length,
      articleCount: published,
      href: `/knowledge/${topic}`,
    };
  });
}

function buildLlmsTxt() {
  const lines = [
    `# ${require("./config").config.siteName}`,
    "",
    require("./config").config.siteDescription,
    "",
    "## 主要ページ",
    `- ホーム: /`,
    `- 講座一覧: /topics`,
    `- 全記事: /articles`,
    `- RSS: /rss.xml`,
    "",
    "## 講座トピック",
  ];
  for (const t of listTopicSummaries()) {
    lines.push(`- ${t.title} (${t.articleCount}記事): ${t.href}`);
  }
  lines.push("", "## 人気タグ");
  for (const { tag, count, url } of collectTagStats(3).slice(0, 20)) {
    lines.push(`- ${tag} (${count}): ${url}`);
  }
  return lines.join("\n");
}

module.exports = {
  slugifyTag,
  decodeTagParam,
  collectTagStats,
  collectCategoryStats,
  findRelatedArticles,
  getFeaturedArticles,
  getLearningPaths,
  listTopicSummaries,
  buildLlmsTxt,
};
