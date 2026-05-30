const fs = require("fs");
const path = require("path");
const { config } = require("./config");
const { injectAds, getAdSlot, getAdHeadScript, injectAdsInCardList, injectAdsInEpisodeList, injectAdsInCourseCards } = require("./ads");
const articleStore = require("./articleStore");
const knowledgeStore = require("./stores/knowledgeStore");
const { buildSeo } = require("./seo");
const {
  buildWebSiteSchema,
  buildBreadcrumbSchema,
  buildSeoHeadExtras,
  buildFaviconLinks,
  injectHeadingIds,
  buildTableOfContents,
  estimateReadingMinutes,
  getOgImageUrl,
  optimizeSerpDescription,
} = require("./seoMeta");

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
    faviconLinks: buildFaviconLinks(),
    seoExtraHead: "",
  };
}

function pageMetaExtras({ robots, ogImage, article } = {}) {
  return {
    seoExtraHead: buildSeoHeadExtras({ robots, ogImage, article }),
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

function renderHome(articles, courses = [], { tag } = {}) {
  const content = loadTemplate("home.html");
  const cards = articles
    .map((a) => {
      const tags = (a.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
      const date = new Date(a.publishedAt || a.createdAt).toLocaleDateString("ja-JP");
      const readMin = estimateReadingMinutes(a.body);
      return `
      <article class="card" data-category="${escapeHtml(a.category)}" data-tags="${escapeHtml((a.tags || []).join(","))}">
        <a href="/article/${escapeHtml(a.slug)}" class="card__link">
          <span class="card__category">${escapeHtml(a.category)}</span>
          <h2 class="card__title">${escapeHtml(a.title)}</h2>
          <p class="card__summary">${escapeHtml(a.summary)}</p>
          <div class="card__tags">${tags}</div>
          <div class="card__meta-row">
            <time class="card__date">${date}</time>
            <span class="card__read">${readMin}分で読める</span>
          </div>
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

  const courseCardsWithAds = injectAdsInCourseCards(
    courseCards || "",
    2
  );

  const pageContent = replaceAll(content, {
    siteName: config.siteName,
    siteTagline: config.siteTagline,
    heroTitle: config.homeHeroTitle,
    articleCards: injectAdsInCardList(cards || '<p class="empty">まだ記事がありません。</p>'),
    courseCards: courseCardsWithAds,
    categoryOptions,
    articleCount: String(articles.length),
    adAfterHero: getAdSlot("home"),
    adBetweenSections: getAdSlot("top"),
    adBeforeArticles: getAdSlot("inline"),
  });

  const canonical = tag
    ? `${config.siteUrl}/?tag=${encodeURIComponent(tag)}`
    : config.siteUrl;
  const pageTitle = tag
    ? `「${tag}」の記事一覧 | ${config.siteName}`
    : config.homePageTitle;
  const metaDescription = tag
    ? `「${tag}」タグの技術記事 ${articles.length} 件。初心者向けにわかりやすく解説したまとめ記事一覧です。`
    : config.siteDescription;

  const jsonLd = tag
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `「${tag}」の記事一覧`,
        url: canonical,
        description: metaDescription,
        inLanguage: "ja",
      }
    : buildWebSiteSchema();

  return renderPage({
    pageTitle,
    metaDescription,
    canonical,
    ogTitle: tag ? `「${tag}」の記事一覧` : config.siteName,
    ogDescription: metaDescription,
    ogType: "website",
    jsonLd: JSON.stringify(jsonLd),
    bodyClass: "page-home",
    extraCss: "",
    extraJs: '<script src="/js/home.js" defer></script>',
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
    ...pageMetaExtras({ ogImage: getOgImageUrl() }),
  });
}

function renderKnowledge(topic, roadmap, courses) {
  const content = loadTemplate("knowledge.html");
  const roadmapTitle = roadmap.title || topic;
  const metaDescription = optimizeSerpDescription(
    roadmap.description,
    `${roadmapTitle}の学習ロードマップ。講座一覧から順番に学べる初心者向けカリキュラムです。`,
    { category: topic }
  );

  const breadcrumbItems = [
    { href: "/", label: "ホーム" },
    { href: `/knowledge/${topic}`, label: roadmapTitle },
  ];

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
    breadcrumb: buildBreadcrumbHtml(breadcrumbItems),
    topic: escapeHtml(topic),
    title: escapeHtml(roadmapTitle),
    description: escapeHtml(roadmap.description || metaDescription),
    courseList: injectAdsInCourseCards(courseList || "<p>講座がありません</p>"),
    adTop: getAdSlot("top"),
    adMid: getAdSlot("inline"),
    adBottom: getAdSlot("bottom"),
  });

  const canonical = `${config.siteUrl}/knowledge/${topic}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@context": "https://schema.org",
        ...buildBreadcrumbSchema(breadcrumbItems),
      },
      {
        "@type": "CollectionPage",
        name: roadmapTitle,
        description: metaDescription,
        url: canonical,
        inLanguage: "ja",
        hasPart: courses.map((c) => ({
          "@type": "Course",
          name: c.title,
          url: `${config.siteUrl}/course/${topic}/${c.courseId}`,
        })),
      },
    ],
  };

  return renderPage({
    pageTitle: `${roadmapTitle} 学習ロードマップ | ${config.siteName}`,
    metaDescription,
    canonical,
    ogTitle: `${roadmapTitle} — 講座一覧`,
    ogDescription: metaDescription,
    ogType: "website",
    jsonLd: JSON.stringify(jsonLd),
    bodyClass: "page-knowledge",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
    ...pageMetaExtras({ ogImage: getOgImageUrl() }),
  });
}

function renderCourse(topic, course, articles) {
  const content = loadTemplate("course.html");
  const publishedCount = (course.episodes || []).filter((ep) =>
    articles.some((a) => a.slug === ep.slug)
  ).length;

  const breadcrumbItems = [
    { href: "/", label: "ホーム" },
    { href: `/knowledge/${topic}`, label: topic },
    { href: `/course/${topic}/${course.courseId}`, label: course.title },
  ];

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

  const metaDescription = optimizeSerpDescription(
    course.description,
    `${course.title}の全${(course.episodes || []).length}回構成。${publishedCount}記事公開中。初心者向けに順番に学べる講座です。`,
    { category: topic }
  );

  const pageContent = replaceAll(content, {
    breadcrumb: buildBreadcrumbHtml(breadcrumbItems),
    topic: escapeHtml(topic),
    courseId: escapeHtml(course.courseId),
    title: escapeHtml(course.title),
    description: escapeHtml(course.description),
    target: escapeHtml(course.target),
    episodeCount: String((course.episodes || []).length),
    publishedCount: String(publishedCount),
    episodeList: injectAdsInEpisodeList(episodeList),
    adTop: getAdSlot("top"),
    adMid: getAdSlot("inline"),
    adBottom: getAdSlot("bottom"),
  });

  const canonical = `${config.siteUrl}/course/${topic}/${course.courseId}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@context": "https://schema.org",
        ...buildBreadcrumbSchema(breadcrumbItems),
      },
      {
        "@type": "Course",
        name: course.title,
        description: course.description,
        url: canonical,
        inLanguage: "ja",
        educationalLevel: "beginner",
        numberOfCredits: (course.episodes || []).length,
        provider: { "@type": "Organization", name: config.siteName, url: config.siteUrl },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "online",
          courseWorkload: `PT${(course.episodes || []).length}H`,
        },
        hasPart: (course.episodes || [])
          .filter((ep) => articles.some((a) => a.slug === ep.slug))
          .map((ep) => ({
            "@type": "LearningResource",
            name: ep.title,
            url: `${config.siteUrl}/article/${ep.slug}`,
          })),
      },
    ],
  };

  return renderPage({
    pageTitle: `${course.title} 全${(course.episodes || []).length}回 | ${config.siteName}`,
    metaDescription,
    canonical,
    ogTitle: `${course.title} — 初心者向け講座`,
    ogDescription: metaDescription,
    ogType: "website",
    jsonLd: JSON.stringify(jsonLd),
    bodyClass: "page-course",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
    ...pageMetaExtras({ ogImage: getOgImageUrl() }),
  });
}

function renderArticle(article, seriesNav = null) {
  const content = loadTemplate("article.html");
  const liveSeo = buildSeo(article);
  let jsonLd = article.jsonLd;
  if (!jsonLd?.["@graph"] && article.knowledge) {
    const { buildSeoExtended } = require("./seoExtended");
    const ctx = {
      topic: article.knowledge.topic,
      courseId: article.knowledge.courseId,
      course: knowledgeStore.getCourse(article.knowledge.topic, article.knowledge.courseId),
    };
    jsonLd = buildSeoExtended(article, ctx).jsonLd;
  } else if (!jsonLd) {
    jsonLd = liveSeo.jsonLd;
  }

  const tags = (article.tags || [])
    .map((t) => `<a href="/?tag=${encodeURIComponent(t)}" class="tag">${escapeHtml(t)}</a>`)
    .join("");
  const date = new Date(article.publishedAt || article.createdAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const updatedDate =
    article.updatedAt && article.updatedAt !== article.publishedAt
      ? new Date(article.updatedAt).toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
  const readingMinutes = estimateReadingMinutes(article.body);

  const breadcrumbItems = [{ href: "/", label: "ホーム" }];
  let courseTitle = "講座";
  if (article.knowledge) {
    const course = knowledgeStore.getCourse(
      article.knowledge.topic,
      article.knowledge.courseId
    );
    courseTitle = course?.title || article.knowledge.courseId;
    breadcrumbItems.push({
      href: `/knowledge/${article.knowledge.topic}`,
      label: article.knowledge.topic,
    });
    breadcrumbItems.push({
      href: `/course/${article.knowledge.topic}/${article.knowledge.courseId}`,
      label: courseTitle,
    });
  }
  breadcrumbItems.push({ href: `/article/${article.slug}`, label: article.title });

  const bodyWithIds = injectHeadingIds(article.body);
  const tableOfContents = buildTableOfContents(bodyWithIds);
  const bodyWithAds = injectAds(bodyWithIds);

  const episodeBadge =
    article.knowledge?.episode != null
      ? `<span class="article-page__episode">第${article.knowledge.episode}回</span>`
      : "";

  const faqHtml =
    article.faq?.length > 0
      ? `<section class="faq"><h2>よくある質問</h2>${article.faq
          .map(
            (f) =>
              `<details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
                <summary itemprop="name">${escapeHtml(f.question)}</summary>
                <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                  <p itemprop="text">${escapeHtml(f.answer)}</p>
                </div>
              </details>`
          )
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
    updatedDate: updatedDate
      ? `<span class="article-page__updated">更新: ${updatedDate}</span>`
      : "",
    readingTime: `${readingMinutes}分で読める`,
    episodeBadge,
    tableOfContents,
    seriesNav: buildSeriesNavHtml(seriesNav),
    relatedArticles: buildRelatedHtml(article),
    faq: faqHtml,
    adTop: getAdSlot("top"),
    adAfterSummary: getAdSlot("inline"),
    adMid: getAdSlot("inline"),
    adBeforeNav: getAdSlot("top"),
    adBeforeRelated: getAdSlot("inline"),
    adBottom: getAdSlot("bottom"),
  });

  return renderPage({
    pageTitle: liveSeo.metaTitle,
    metaDescription: liveSeo.metaDescription,
    canonical: liveSeo.canonical,
    ogTitle: liveSeo.ogTitle,
    ogDescription: liveSeo.ogDescription,
    ogType: "article",
    jsonLd: JSON.stringify(jsonLd),
    bodyClass: "page-article",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
    ...pageMetaExtras({
      ogImage: liveSeo.ogImage,
      article,
    }),
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
    ...pageMetaExtras({ robots: "noindex, nofollow" }),
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
    ...pageMetaExtras({ ogImage: getOgImageUrl() }),
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
