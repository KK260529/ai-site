const { config } = require("./config");

/**
 * 記事データから SEO メタ情報を構築
 */
function buildSeo(article) {
  const metaTitle = article.metaTitle || `${article.title} | ${config.siteName}`;
  const metaDescription =
    article.metaDescription ||
    article.summary?.slice(0, 155) ||
    config.siteDescription;

  const ogTitle = article.ogTitle || article.title;
  const ogDescription = article.ogDescription || metaDescription;
  const canonical = `${config.siteUrl}/article/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: metaDescription,
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    author: {
      "@type": "Organization",
      name: config.siteName,
    },
    publisher: {
      "@type": "Organization",
      name: config.siteName,
      url: config.siteUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    keywords: (article.tags || []).join(", "),
    articleSection: article.category,
    url: canonical,
  };

  return {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
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
    canonical: seo.canonical,
    jsonLd: seo.jsonLd,
  };
}

module.exports = { buildSeo, mergeSeoIntoArticle };
