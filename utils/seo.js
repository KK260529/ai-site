const { config } = require("./config");
const {
  optimizeSerpTitle,
  optimizeSerpDescription,
  getOgImageUrl,
  plainTextLength,
  buildOrganizationSchema,
} = require("./seoMeta");

/**
 * 記事データから SEO メタ情報を構築
 */
function buildSeo(article) {
  const metaTitle = optimizeSerpTitle(article.metaTitle || article.title, {
    category: article.category,
  });
  const metaDescription = optimizeSerpDescription(
    article.metaDescription,
    article.summary,
    { category: article.category }
  );

  const ogTitle = article.ogTitle || article.title;
  const ogDescription = optimizeSerpDescription(
    article.ogDescription || article.metaDescription,
    article.summary,
    { category: article.category }
  );
  const canonical = `${config.siteUrl}/article/${article.slug}`;
  const ogImage = getOgImageUrl(article);
  const wordCount = plainTextLength(article.body);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": article.knowledge ? "TechArticle" : "BlogPosting",
    headline: article.title,
    description: metaDescription,
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    author: buildOrganizationSchema(),
    publisher: {
      ...buildOrganizationSchema(),
      logo: config.siteLogo
        ? { "@type": "ImageObject", url: config.siteLogo }
        : undefined,
    },
    image: ogImage,
    inLanguage: "ja",
    wordCount,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    keywords: (article.tags || []).join(", "),
    articleSection: article.category,
    url: canonical,
  };

  if (article.knowledge) {
    jsonLd.learningResourceType = "tutorial";
    jsonLd.educationalLevel = "beginner";
  }

  return {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImage,
    canonical,
    jsonLd,
  };
}

function mergeSeoIntoArticle(article) {
  const seo = buildSeo(article);
  return {
    ...article,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    canonical: seo.canonical,
    jsonLd: seo.jsonLd,
  };
}

module.exports = { buildSeo, mergeSeoIntoArticle };
