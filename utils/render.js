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
  buildGoogleVerificationMeta,
  buildAnalyticsScript,
  injectHeadingIds,
  buildTableOfContents,
  estimateReadingMinutes,
  getOgImageUrl,
  optimizeSerpDescription,
} = require("./seoMeta");
const {
  slugifyTag,
  collectTagStats,
  collectCategoryStats,
  findRelatedArticles,
  getFeaturedArticles,
  getLearningPaths,
  listTopicSummaries,
} = require("./discovery");
const { applyInternalLinks, TOPIC_LABELS } = require("./internalLinks");

const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

const TEMPLATE_FILES = [
  "layout.html",
  "home.html",
  "knowledge.html",
  "course.html",
  "article.html",
  "admin.html",
  "privacy.html",
  "listing.html",
  "404.html",
  "topics.html",
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
    topicNavLinks: buildTopicNavLinks(),
    footerNav: buildFooterNavHtml(),
    adHeadScript: getAdHeadScript(),
    faviconLinks: buildFaviconLinks(),
    googleVerificationMeta: buildGoogleVerificationMeta(),
    analyticsScript: buildAnalyticsScript(),
    seoExtraHead: "",
  };
}

function buildTopicNavLinks() {
  return knowledgeStore
    .listTopics()
    .map((t) => {
      const label = TOPIC_LABELS[t] || t.charAt(0).toUpperCase() + t.slice(1);
      return `<a href="/knowledge/${escapeHtml(t)}">${escapeHtml(label)}</a>`;
    })
    .join("\n      ");
}

function buildFooterNavHtml() {
  return `<a href="/topics">講座一覧</a>
      <a href="/articles">全記事</a>
      <a href="/rss.xml">RSS</a>
      <a href="/sitemap.xml">サイトマップ</a>
      <a href="/privacy">プライバシーポリシー</a>`;
}

function buildArticleCardHtml(a) {
  const tags = (a.tags || [])
    .map((t) => `<a href="/tag/${slugifyTag(t)}" class="tag">${escapeHtml(t)}</a>`)
    .join("");
  const date = new Date(a.publishedAt || a.createdAt).toLocaleDateString("ja-JP");
  const readMin = estimateReadingMinutes(a.body);
  return `
      <article class="card" data-category="${escapeHtml(a.category)}" data-tags="${escapeHtml((a.tags || []).join(","))}">
        <a href="/article/${escapeHtml(a.slug)}" class="card__link">
          <span class="card__category">${escapeHtml(a.category)}</span>
          <h2 class="card__title">${escapeHtml(a.title)}</h2>
          <p class="card__summary">${escapeHtml(a.summary)}</p>
          <div class="card__meta-row">
            <time class="card__date">${date}</time>
            <span class="card__read">${readMin}分で読める</span>
          </div>
        </a>
        ${tags ? `<div class="card__tags">${tags}</div>` : ""}
      </article>`;
}

function buildShareHtml(article, canonical) {
  const url = encodeURIComponent(canonical);
  const title = encodeURIComponent(article.title);
  return `<div class="share-bar">
    <span class="share-bar__label">シェア</span>
    <a href="https://twitter.com/intent/tweet?url=${url}&text=${title}" class="share-bar__btn" rel="noopener noreferrer" target="_blank" aria-label="Xでシェア">X</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" class="share-bar__btn" rel="noopener noreferrer" target="_blank" aria-label="Facebookでシェア">Facebook</a>
    <a href="https://social-plugins.line.me/lineit/share?url=${url}" class="share-bar__btn" rel="noopener noreferrer" target="_blank" aria-label="LINEでシェア">LINE</a>
  </div>`;
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
  const related = findRelatedArticles(article, 6);
  if (!related.length) return "";
  return `<section class="related">
    <h2>関連記事</h2>
    <ul class="related__list">${related
      .map(
        (a) =>
          `<li><a href="/article/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a>
        <span class="related__meta">${escapeHtml(a.category)} · ${estimateReadingMinutes(a.body)}分</span></li>`
      )
      .join("")}</ul>
  </section>`;
}

function buildNextActionHtml(nextAction) {
  if (!nextAction) return "";
  return `<section class="article-page__next">
    <h2>次にやること</h2>
    <p>${escapeHtml(nextAction)}</p>
  </section>`;
}

function buildInternalLinkSuggestionsHtml(candidates) {
  const items = (candidates || []).filter((c) => c?.slug && c?.title).slice(0, 8);
  if (!items.length) return "";
  return `<section class="internal-suggestions">
    <h2>あわせて読みたい</h2>
    <ul class="internal-suggestions__list">${items
      .map(
        (c) =>
          `<li><a href="/article/${escapeHtml(c.slug)}">${escapeHtml(c.title)}</a>${
            c.reason ? `<span class="internal-suggestions__reason">${escapeHtml(c.reason)}</span>` : ""
          }</li>`
      )
      .join("")}</ul>
  </section>`;
}

function renderHome(articles, courses = [], { tag } = {}) {
  const content = loadTemplate("home.html");
  const cards = articles.map((a) => buildArticleCardHtml(a)).join("");

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
  const categoryOptions = categories
    .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
    .join("");

  const learningPaths = getLearningPaths()
    .map(
      (p) => `
    <article class="learning-path">
      <h3 class="learning-path__title">${escapeHtml(p.title)}</h3>
      <p class="learning-path__desc">${escapeHtml(p.description)}</p>
      <div class="learning-path__steps">${p.steps
        .map((s, i) => {
          const arrow = i > 0 ? '<span class="learning-path__arrow">→</span>' : "";
          return `${arrow}<a href="${escapeHtml(s.href)}" class="learning-path__step">${escapeHtml(s.label)}</a>`;
        })
        .join("")}</div>
    </article>`
    )
    .join("");

  const tagCloud = collectTagStats(2)
    .slice(0, 24)
    .map(
      ({ tag: t, count }) =>
        `<a href="/tag/${slugifyTag(t)}" class="tag tag--cloud">${escapeHtml(t)} <span class="tag__count">${count}</span></a>`
    )
    .join("");

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
    learningPaths,
    tagCloud,
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
    .map((t) => `<a href="/tag/${slugifyTag(t)}" class="tag">${escapeHtml(t)}</a>`)
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

  const bodyLinked = applyInternalLinks(
    article.body,
    article.knowledge?.topic,
    article.slug
  );
  const bodyWithIds = injectHeadingIds(bodyLinked);
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
    category: `<a href="/category/${slugifyTag(article.category)}" class="article-page__category-link">${escapeHtml(article.category)}</a>`,
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
    shareBar: buildShareHtml(article, liveSeo.canonical),
    nextAction: buildNextActionHtml(article.nextAction),
    internalLinkSuggestions: buildInternalLinkSuggestionsHtml(article.internalLinkCandidates),
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

function renderListingPage({
  title,
  description,
  countLabel,
  articles,
  breadcrumbItems,
  extraTop = "",
  relatedLinks = "",
  bodyClass,
  canonical,
  pageTitle,
  metaDescription,
  ogTitle,
}) {
  const content = loadTemplate("listing.html");
  const cards = articles.length
    ? articles.map((a) => buildArticleCardHtml(a)).join("")
    : '<p class="empty">該当する記事がありません。</p>';

  const pageContent = replaceAll(content, {
    breadcrumb: buildBreadcrumbHtml(breadcrumbItems),
    title: escapeHtml(title),
    description: escapeHtml(description),
    countLabel: escapeHtml(countLabel),
    articleCards: injectAdsInCardList(cards),
    extraTop,
    relatedLinks,
    adTop: getAdSlot("top"),
    adBottom: getAdSlot("bottom"),
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: canonical,
    description: metaDescription,
    inLanguage: "ja",
    numberOfItems: articles.length,
  };

  return renderPage({
    pageTitle,
    metaDescription,
    canonical,
    ogTitle: ogTitle || title,
    ogDescription: metaDescription,
    ogType: "website",
    jsonLd: JSON.stringify(jsonLd),
    bodyClass: bodyClass || "page-listing",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
    ...pageMetaExtras({ ogImage: getOgImageUrl() }),
  });
}

function renderTagPage(tag, articles) {
  const canonical = `${config.siteUrl}/tag/${slugifyTag(tag)}`;
  const metaDescription = `「${tag}」タグの技術記事 ${articles.length} 件。初心者向けにわかりやすく解説したまとめ一覧です。`;
  const relatedTags = collectTagStats(2)
    .filter((t) => t.tag !== tag)
    .slice(0, 12)
    .map(
      ({ tag: t, count }) =>
        `<a href="/tag/${slugifyTag(t)}" class="tag tag--cloud">${escapeHtml(t)} <span class="tag__count">${count}</span></a>`
    )
    .join("");

  return renderListingPage({
    title: `「${tag}」の記事`,
    description: `タグ「${tag}」が付いた記事一覧です。`,
    countLabel: `${articles.length} 件`,
    articles,
    breadcrumbItems: [
      { href: "/", label: "ホーム" },
      { href: "/articles", label: "全記事" },
      { href: `/tag/${slugifyTag(tag)}`, label: tag },
    ],
    relatedLinks: relatedTags
      ? `<section class="listing-related"><h2>関連タグ</h2><div class="tag-cloud">${relatedTags}</div></section>`
      : "",
    bodyClass: "page-tag",
    canonical,
    pageTitle: `「${tag}」の記事一覧 | ${config.siteName}`,
    metaDescription,
    ogTitle: `「${tag}」の記事一覧`,
  });
}

function renderCategoryPage(category, articles) {
  const canonical = `${config.siteUrl}/category/${slugifyTag(category)}`;
  const metaDescription = `「${category}」カテゴリの技術記事 ${articles.length} 件。`;
  const otherCats = collectCategoryStats()
    .filter((c) => c.category !== category)
    .slice(0, 8)
    .map(
      (c) =>
        `<a href="/category/${slugifyTag(c.category)}" class="tag">${escapeHtml(c.category)} (${c.count})</a>`
    )
    .join(" ");

  return renderListingPage({
    title: category,
    description: `カテゴリ「${category}」の記事一覧です。`,
    countLabel: `${articles.length} 件`,
    articles,
    breadcrumbItems: [
      { href: "/", label: "ホーム" },
      { href: "/articles", label: "全記事" },
      { href: `/category/${slugifyTag(category)}`, label: category },
    ],
    relatedLinks: otherCats
      ? `<section class="listing-related"><h2>他のカテゴリ</h2><div class="tag-cloud">${otherCats}</div></section>`
      : "",
    bodyClass: "page-category",
    canonical,
    pageTitle: `${category} の記事一覧 | ${config.siteName}`,
    metaDescription,
    ogTitle: `${category} の記事一覧`,
  });
}

function renderSearchPage(query, articles) {
  const q = String(query || "").trim();
  const canonical = `${config.siteUrl}/search?q=${encodeURIComponent(q)}`;
  const metaDescription = q
    ? `「${q}」の検索結果 ${articles.length} 件。`
    : "記事をキーワードで検索できます。";

  const searchForm = `<form class="listing-search" action="/search" method="get">
    <input type="search" name="q" class="input" value="${escapeHtml(q)}" placeholder="キーワードで検索…" aria-label="検索">
    <button type="submit" class="btn btn--primary">検索</button>
  </form>`;

  return renderListingPage({
    title: q ? `「${q}」の検索結果` : "記事検索",
    description: q ? `キーワード「${q}」に一致する記事です。` : "タイトル・概要・タグから記事を探せます。",
    countLabel: `${articles.length} 件`,
    articles,
    breadcrumbItems: [
      { href: "/", label: "ホーム" },
      { href: "/search", label: "検索" },
      ...(q ? [{ href: canonical, label: q }] : []),
    ],
    extraTop: searchForm,
    bodyClass: "page-search",
    canonical,
    pageTitle: q ? `「${q}」の検索結果 | ${config.siteName}` : `記事検索 | ${config.siteName}`,
    metaDescription,
    ogTitle: q ? `「${q}」の検索結果` : "記事検索",
  });
}

function renderArticlesPage(articles) {
  const canonical = `${config.siteUrl}/articles`;
  return renderListingPage({
    title: "全記事",
    description: "公開中の技術記事を新しい順に一覧表示しています。",
    countLabel: `${articles.length} 件`,
    articles,
    breadcrumbItems: [
      { href: "/", label: "ホーム" },
      { href: "/articles", label: "全記事" },
    ],
    bodyClass: "page-articles",
    canonical,
    pageTitle: `全記事一覧 | ${config.siteName}`,
    metaDescription: `公開記事 ${articles.length} 件。Linux・Git・Python・Java など初心者向け技術まとめ。`,
    ogTitle: "全記事一覧",
  });
}

function renderTopicsPage() {
  const content = loadTemplate("topics.html");
  const learningPaths = getLearningPaths()
    .map(
      (p) => `
    <article class="learning-path">
      <h3 class="learning-path__title">${escapeHtml(p.title)}</h3>
      <p class="learning-path__desc">${escapeHtml(p.description)}</p>
      <div class="learning-path__steps">${p.steps
        .map((s, i) => {
          const arrow = i > 0 ? '<span class="learning-path__arrow">→</span>' : "";
          return `${arrow}<a href="${escapeHtml(s.href)}" class="learning-path__step">${escapeHtml(s.label)}</a>`;
        })
        .join("")}</div>
    </article>`
    )
    .join("");

  const topicGrid = listTopicSummaries()
    .map(
      (t) => `
    <article class="topic-card">
      <a href="${escapeHtml(t.href)}" class="topic-card__link">
        <h3>${escapeHtml(t.title)}</h3>
        <p>${escapeHtml(t.description)}</p>
        <span class="topic-card__meta">${t.articleCount} 記事 · ${t.courseCount} 講座</span>
      </a>
    </article>`
    )
    .join("");

  const tagCloud = collectTagStats(2)
    .slice(0, 30)
    .map(
      ({ tag, count }) =>
        `<a href="/tag/${slugifyTag(tag)}" class="tag tag--cloud">${escapeHtml(tag)} <span class="tag__count">${count}</span></a>`
    )
    .join("");

  const pageContent = replaceAll(content, {
    learningPaths,
    topicGrid,
    tagCloud,
    adMid: getAdSlot("inline"),
  });

  const canonical = `${config.siteUrl}/topics`;
  const metaDescription =
    "Python・Git・Linux・SQL・Web・Docker など、初心者向け技術講座をテーマ別に学べます。";

  return renderPage({
    pageTitle: `講座一覧 | ${config.siteName}`,
    metaDescription,
    canonical,
    ogTitle: "講座一覧",
    ogDescription: metaDescription,
    ogType: "website",
    jsonLd: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "講座一覧",
      url: canonical,
      description: metaDescription,
      inLanguage: "ja",
    }),
    bodyClass: "page-topics",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
    ...pageMetaExtras({ ogImage: getOgImageUrl() }),
  });
}

function render404() {
  const content = loadTemplate("404.html");
  const topicLinks = knowledgeStore
    .listTopics()
    .map((t) => {
      const label = TOPIC_LABELS[t] || t;
      return `<a href="/knowledge/${escapeHtml(t)}" class="topic-pill">${escapeHtml(label)}</a>`;
    })
    .join("");

  const recentArticles = getFeaturedArticles(8)
    .map((a) => `<li><a href="/article/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a></li>`)
    .join("");

  const pageContent = replaceAll(content, {
    topicLinks,
    recentArticles,
  });

  return renderPage({
    pageTitle: `ページが見つかりません | ${config.siteName}`,
    metaDescription: "お探しのページは見つかりませんでした。",
    canonical: config.siteUrl,
    ogTitle: "404 Not Found",
    ogDescription: "ページが見つかりません",
    ogType: "website",
    jsonLd: "{}",
    bodyClass: "page-404",
    extraCss: "",
    extraJs: "",
    content: pageContent,
    siteName: config.siteName,
    siteUrl: config.siteUrl,
    ...pageMetaExtras({ robots: "noindex, nofollow" }),
  });
}

module.exports = {
  renderHome,
  renderKnowledge,
  renderCourse,
  renderArticle,
  renderAdmin,
  renderPrivacy,
  renderTagPage,
  renderCategoryPage,
  renderSearchPage,
  renderArticlesPage,
  renderTopicsPage,
  render404,
  escapeHtml,
};
