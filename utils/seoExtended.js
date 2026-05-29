const { config } = require("./config");
const { buildSeo } = require("./seo");

function buildSeoExtended(article, ctx) {
  const base = buildSeo(article);
  const topic = ctx?.topic || article.knowledge?.topic;
  const courseId = ctx?.courseId || article.knowledge?.courseId;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: config.siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: topic || "Knowledge",
        item: `${config.siteUrl}/knowledge/${topic}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: ctx?.course?.title || courseId,
        item: `${config.siteUrl}/course/${topic}/${courseId}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: article.title,
        item: base.canonical,
      },
    ],
  };

  const courseSchema = ctx?.course
    ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: ctx.course.title,
        description: ctx.course.description,
        provider: { "@type": "Organization", name: config.siteName },
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

function buildSitemapXml(articles, courses = []) {
  const { siteUrl } = config;
  const urls = [
    { loc: siteUrl, priority: "1.0" },
    { loc: `${siteUrl}/admin`, priority: "0.3" },
  ];

  for (const c of courses) {
    urls.push({
      loc: `${siteUrl}/course/${c.topic}/${c.courseId}`,
      priority: "0.8",
    });
  }

  for (const a of articles) {
    if (a.status !== "published") continue;
    urls.push({
      loc: `${siteUrl}/article/${a.slug}`,
      lastmod: a.updatedAt || a.publishedAt,
      priority: "0.7",
    });
  }

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod.split("T")[0]}</lastmod>` : ""}
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
