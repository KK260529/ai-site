const fs = require("fs");
const path = require("path");
const { config } = require("./config");
const { injectAds, getAdSlot, getAdHeadScript, injectAdsInCardList } = require("./ads");
const articleStore = require("./articleStore");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

const TEMPLATE_FILES = [
  "layout.html",
  "home.html",
  "knowledge.html",
  "course.html",
  "article.html",
  "admin.html",
  "privacy.html",
];

const templateCache = {};
for (const file of TEMPLATE_FILES) {
  try {
    templateCache[file] = fs.readFileSync(path.join(TEMPLATES_DIR, file), "utf-8");
  } catch {
    /* Vercel bundle warm-up; fallback read at runtime */
  }
}

function loadTemplate(name) {
  if (templateCache[name]) return templateCache[name];
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), "utf-8");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function replaceAll(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{{${key}}}`).join(value ?? "");
  }
  return result;
}

function layoutDefaults() {
  return {
    siteName: config.siteName,
    siteTagline: config.siteTagline,
    siteUrl: config.siteUrl,
    adminNavLink: config.isProduction ? "" : '<a href="/admin">管理</a>',
    adHeadScript: getAdHeadScript(),
  };
}

function renderPage(layoutVars) {
  const layout = loadTemplate("layout.html");
  return replaceAll(layout, { ...layoutDefaults(), ...layoutVars });
}

function buildBreadcrumbHtml(items) {
  return `<nav class="breadcrumb" aria-label="パンくず">${items
    .map(
      (item, i) =>
        i < items.length - 1
          ? `<a href="${item.href}">${escapeHtml(item.label)}</a> <span>/</span> `
          : `<span>${escapeHtml(item.label)}</span>`
    )
    .join("")}</nav>`;
}

function buildSeriesNavHtml(seriesNav) {
  if (!seriesNav) return "";
  const { course, prev, next } = seriesNav;
  return `<nav class="series-nav">
    ${prev ? `<a href="/article/${escapeHtml(prev.slug)}" class="series-nav__link">← 前回: ${escapeHtml(prev.title)}</a>` : "<span></span>"}
    <a href="/course/${escapeHtml(course.topic || "java")}/${escapeHtml(course.courseId)}" class="series-nav__center">講座一覧</a>
    ${next ? `<a href="/article/${escapeHtml(next.slug)}" class="series-nav__link">次回: ${escapeHtml(next.title)} →</a>` : "<span></span>"}
  </nav>`;
}

function buildRelatedHtml(article) {
  const related = articleStore
    .getPublishedArticles()
    .filter(
      (a) =>
        a.slug !== article.slug &&
        (a.knowledge?.courseId === article.knowledge?.courseId ||
          a.category === article.category)
    )
    .slice(0, 4);
  if (!related.length) return "";
  return `<section class="related">
    <h2>関連記事</h2>
    <ul>${related.map((a) => `<li><a href="/article/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a></li>`).join("")}</ul>
  </section>`;
}

function renderHome(articles, courses = []) {
  const content = loadTemplate("home.html");
  const cards = articles
    .map((a) => {
      const tags = (a.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      const date = new Date(a.publishedAt || a.createdAt).toLocaleDateString("ja-JP");
      return `
      <article class="card" data-category="${escapeHtml(a.category)}" data-tags="${escapeHtml((a.tags || []).join(","))}">
        <a href="/article/${escapeHtml(a.slug)}" class="card__link">
          <span class="card__category">${escapeHtml(a.category)}</span>
          <h2 class="card__title">${escapeHtml(a.title)}</h2>
          <p class="card__summary">${escapeHtml(a.summary)}</p>
          <div class="card__tags">${tags}</div>
          <time class="card__date">${date}</time>
        </a>
      </article>`;
    })
    .join("");

  const courseCards = courses
    .map(
      (c) => `
    <article class="card card--course">
      <a href="/course/${escapeHtml(c.topic)}/${escapeHtml(c.courseId)}" class="card__link">
        <span class="card__category">講座</span>
        <h2 class="card__title">${escapeHtml(c.title)}</h2>
        <p class="card__summary">${escapeHtml(c.description)}</p>
      </a>
    </article>`
    )
    .join("");

  const categories = [...new Set(articles.map((a) => a.category))];
  const categoryOptions = categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  const pageContent = replaceAll(content, {
    siteName: config.siteName,
    siteTagline: config.siteTagline,
    articleCards: injectAdsInCardList(cards || '<p class="empty">まだ記事がありません。</p>'),
    courseCards: courseCards || "",
    categoryOptions,
    articleCount: String(articles.length),
    adAfterHero: getAdSlot("home"),
  });

  return renderPage({
    pageTitle: config.siteName,
    metaDescription: config.siteDescription,
    canonical: config.siteUrl,
    ogTitle: config.siteName,
    ogDescription: config.siteDescription,
    ogType: "website",
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: config.siteName,
      url: config.siteUrl,
    }),
    bodyClass: "page-home",
    extraCss: "",
    extraJs: '<script src="/js/home.js" defer></script>',
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
  });
}

function renderKnowledge(topic, roadmap, courses) {
  const content = loadTemplate("knowledge.html");
  const courseList = courses
    .map(
      (c) => `
    <article class="card">
      <a href="/course/${escapeHtml(topic)}/${escapeHtml(c.courseId)}" class="card__link">
        <h2>${escapeHtml(c.title)}</h2>
        <p>${escapeHtml(c.description)}</p>
        <span class="card__meta">${(c.episodes || []).length} エピソード</span>
      </a>
    </article>`
    )
    .join("");

  const pageContent = replaceAll(content, {
    topic: escapeHtml(topic),
    title: escapeHtml(roadmap.title || topic),
    courseList: courseList || "<p>講座がありません</p>",
    adBottom: getAdSlot("bottom"),
  });

  return renderPage({
    pageTitle: `${roadmap.title || topic} | ${config.siteName}`,
    metaDescription: `${topic} の学習ロードマップと講座一覧`,
    canonical: `${config.siteUrl}/knowledge/${topic}`,
    ogTitle: roadmap.title || topic,
    ogDescription: `${topic} 知識体系`,
    ogType: "website",
    jsonLd: "{}",
    bodyClass: "page-knowledge",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
  });
}

function renderCourse(topic, course, articles) {
  const content = loadTemplate("course.html");
  const episodeList = (course.episodes || [])
    .map((ep) => {
      const published = articles.find((a) => a.slug === ep.slug);
      const status = published ? "公開済み" : "未公開";
      const href = published ? `/article/${ep.slug}` : "#";
      return `<li class="episode-item ${published ? "" : "episode-item--draft"}">
        <span class="episode-num">#${ep.episode}</span>
        <a href="${href}">${escapeHtml(ep.title)}</a>
        <span class="episode-status">${status}</span>
      </li>`;
    })
    .join("");

  const pageContent = replaceAll(content, {
    topic: escapeHtml(topic),
    courseId: escapeHtml(course.courseId),
    title: escapeHtml(course.title),
    description: escapeHtml(course.description),
    target: escapeHtml(course.target),
    episodeList,
    adBottom: getAdSlot("bottom"),
  });

  return renderPage({
    pageTitle: `${course.title} | ${config.siteName}`,
    metaDescription: course.description,
    canonical: `${config.siteUrl}/course/${topic}/${course.courseId}`,
    ogTitle: course.title,
    ogDescription: course.description,
    ogType: "website",
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Course",
      name: course.title,
      description: course.description,
    }),
    bodyClass: "page-course",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
  });
}

function renderArticle(article, seriesNav = null) {
  const content = loadTemplate("article.html");
  const tags = (article.tags || [])
    .map((t) => `<a href="/?tag=${encodeURIComponent(t)}" class="tag">${escapeHtml(t)}</a>`)
    .join("");
  const date = new Date(article.publishedAt || article.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const breadcrumbItems = [{ href: "/", label: "ホーム" }];
  if (article.knowledge) {
    breadcrumbItems.push({
      href: `/knowledge/${article.knowledge.topic}`,
      label: article.knowledge.topic,
    });
    breadcrumbItems.push({
      href: `/course/${article.knowledge.topic}/${article.knowledge.courseId}`,
      label: "講座",
    });
  }
  breadcrumbItems.push({ href: `/article/${article.slug}`, label: article.title });

  const bodyWithAds = injectAds(article.body);

  const faqHtml =
    article.faq?.length > 0
      ? `<section class="faq"><h2>よくある質問</h2>${article.faq
          .map((f) => `<details><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer)}</p></details>`)
          .join("")}</section>`
      : "";

  const pageContent = replaceAll(content, {
    breadcrumb: buildBreadcrumbHtml(breadcrumbItems),
    title: escapeHtml(article.title),
    category: escapeHtml(article.category),
    summary: escapeHtml(article.summary),
    body: bodyWithAds,
    conclusion: escapeHtml(article.conclusion),
    tags,
    date,
    seriesNav: buildSeriesNavHtml(seriesNav),
    relatedArticles: buildRelatedHtml(article),
    faq: faqHtml,
    adTop: getAdSlot("top"),
    adBottom: getAdSlot("bottom"),
  });

  return renderPage({
    pageTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    canonical: article.canonical,
    ogTitle: article.ogTitle,
    ogDescription: article.ogDescription,
    ogType: "article",
    jsonLd: JSON.stringify(article.jsonLd),
    bodyClass: "page-article",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
  });
}

function renderAdmin() {
  const content = loadTemplate("admin.html");
  return renderPage({
    pageTitle: `管理画面 | ${config.siteName}`,
    metaDescription: "知識CMS管理",
    canonical: `${config.siteUrl}/admin`,
    ogTitle: `管理画面 | ${config.siteName}`,
    ogDescription: "知識CMS管理",
    ogType: "website",
    jsonLd: "{}",
    bodyClass: "page-admin",
    extraCss: '<link rel="stylesheet" href="/css/admin.css">',
    extraJs: '<script src="/js/admin-cms.js" defer></script>',
    content,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
  });
}

function buildContactBlock() {
  if (!config.contactEmail) {
    return "<p>現在、お問い合わせ用の連絡先は準備中です。</p>";
  }
  const email = escapeHtml(config.contactEmail);
  return `<p>メール: <a href="mailto:${email}">${email}</a></p>`;
}

function renderPrivacy() {
  const content = loadTemplate("privacy.html");
  const updatedAt = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const pageContent = replaceAll(content, {
    siteName: escapeHtml(config.siteName),
    siteUrl: escapeHtml(config.siteUrl),
    updatedAt,
    contactBlock: buildContactBlock(),
  });

  return renderPage({
    pageTitle: `プライバシーポリシー | ${config.siteName}`,
    metaDescription: `${config.siteName} のプライバシーポリシー。Cookie・広告配信・個人情報の取り扱いについて。`,
    canonical: `${config.siteUrl}/privacy`,
    ogTitle: `プライバシーポリシー | ${config.siteName}`,
    ogDescription: `${config.siteName} のプライバシーポリシー`,
    ogType: "website",
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "プライバシーポリシー",
      url: `${config.siteUrl}/privacy`,
    }),
    bodyClass: "page-legal",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
  });
}

module.exports = {
  renderHome,
  renderKnowledge,
  renderCourse,
  renderArticle,
  renderAdmin,
  renderPrivacy,
  escapeHtml,
};
