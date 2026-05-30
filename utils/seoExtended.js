const { config } = require("./config");
const { buildSeo } = require("./seo");
const { buildBreadcrumbSchema } = require("./seoMeta");
const { getTopicLabel } = require("./internalLinks");

function buildSeoExtended(article, ctx) {
  const base = buildSeo(article);
  const topic = ctx?.topic || article.knowledge?.topic;
  const courseId = ctx?.courseId || article.knowledge?.courseId;
  const courseTitle = ctx?.course?.title || courseId;
  const topicTitle = topic ? getTopicLabel(topic) || topic : "";

  const breadcrumbItems = [{ label: "ホーム", href: "/" }];
  if (topic) {
    breadcrumbItems.push({
      label: topicTitle,
      href: `/knowledge/${topic}`,
    });
  }
  if (topic && courseId) {
    breadcrumbItems.push({
      label: courseTitle,
      href: `/course/${topic}/${courseId}`,
    });
  }
  breadcrumbItems.push({ label: article.title, href: `/article/${article.slug}` });

  const breadcrumb = {
    "@context": "https://schema.org",
    ...buildBreadcrumbSchema(breadcrumbItems),
  };

  const courseSchema = ctx?.course
    ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: ctx.course.title,
        description: ctx.course.description,
        provider: { "@type": "Organization", name: config.siteName, url: config.siteUrl },
        url: `${config.siteUrl}/course/${topic}/${courseId}`,
        inLanguage: "ja",
        educationalLevel: "beginner",
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "online",
          courseWorkload: "PT1H",
        },
      }
    : null;

  const faqSchema =
    article.faq?.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: article.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const jsonLdGraph = [base.jsonLd, breadcrumb];
  if (courseSchema) jsonLdGraph.push(courseSchema);
  if (faqSchema) jsonLdGraph.push(faqSchema);

  return {
    ...base,
    jsonLd: { "@context": "https://schema.org", "@graph": jsonLdGraph },
    breadcrumb,
    courseSchema,
    faqSchema,
  };
}

function buildSitemapXml(articles, courses = [], topics = [], { tags = [], categories = [] } = {}) {
  const { siteUrl } = config;
  const urls = [
    { loc: siteUrl, priority: "1.0", changefreq: "daily" },
    { loc: `${siteUrl}/topics`, priority: "0.9", changefreq: "weekly" },
    { loc: `${siteUrl}/articles`, priority: "0.9", changefreq: "daily" },
    { loc: `${siteUrl}/search`, priority: "0.5", changefreq: "monthly" },
    { loc: `${siteUrl}/privacy`, priority: "0.4", changefreq: "monthly" },
  ];

  if (!config.isProduction) {
    urls.push({ loc: `${siteUrl}/admin`, priority: "0.3", changefreq: "monthly" });
  }

  for (const topic of topics) {
    urls.push({
      loc: `${siteUrl}/knowledge/${topic}`,
      priority: "0.85",
      changefreq: "weekly",
    });
  }

  for (const c of courses) {
    urls.push({
      loc: `${siteUrl}/course/${c.topic}/${c.courseId}`,
      priority: "0.8",
      changefreq: "weekly",
    });
  }

  for (const { url } of tags) {
    urls.push({
      loc: `${siteUrl}${url}`,
      priority: "0.65",
      changefreq: "weekly",
    });
  }

  for (const { url } of categories) {
    urls.push({
      loc: `${siteUrl}${url}`,
      priority: "0.65",
      changefreq: "weekly",
    });
  }

  for (const a of articles) {
    if (a.status !== "published") continue;
    urls.push({
      loc: `${siteUrl}/article/${a.slug}`,
      lastmod: a.updatedAt || a.publishedAt,
      priority: "0.7",
      changefreq: "monthly",
    });
  }

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod.split("T")[0]}</lastmod>` : ""}
    ${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

module.exports = { buildSeoExtended, buildSitemapXml };
