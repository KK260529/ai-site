const { config } = require("./config");

function escapeAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function clipText(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trim() + "…";
}

function plainTextLength(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, "")
    .length;
}

function estimateReadingMinutes(html) {
  const chars = plainTextLength(html);
  return Math.max(1, Math.ceil(chars / 500));
}

function optimizeSerpTitle(title, { category, siteName = config.siteName } = {}) {
  let base = String(title || "").trim();
  if (!base) return siteName;
  if (!base.includes("|") && !base.includes("｜")) {
    if (category && base.length < 42) {
      base = `${base}｜${category}入門`;
    }
    base = `${base} | ${siteName}`;
  }
  return clipText(base, 60);
}

function optimizeSerpDescription(description, summary, { category } = {}) {
  let text = String(description || summary || "").trim();
  if (text.length < 90) {
    const lead = category ? `【${category}初心者向け】` : "【初心者向け】";
    text = `${lead}${text}`;
  }
  if (text.length < 110) {
    text = `${text} 図解・具体例つきで丁寧に解説します。`;
  }
  return clipText(text, 155);
}

function getOgImageUrl(article) {
  if (article?.ogImage) return article.ogImage;
  return config.siteOgImage;
}

function buildOrganizationSchema() {
  const org = {
    "@type": "Organization",
    name: config.siteName,
    url: config.siteUrl,
  };
  if (config.siteLogo) {
    org.logo = { "@type": "ImageObject", url: config.siteLogo };
  }
  return org;
}

function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(),
      {
        "@type": "WebSite",
        name: config.siteName,
        url: config.siteUrl,
        description: config.siteDescription,
        inLanguage: "ja",
        publisher: { "@id": `${config.siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${config.siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

function buildBreadcrumbSchema(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => {
      let itemUrl = item.url;
      if (!itemUrl && item.href) {
        itemUrl = item.href.startsWith("http") ? item.href : `${config.siteUrl}${item.href}`;
      }
      return {
        "@type": "ListItem",
        position: i + 1,
        name: item.label,
        ...(itemUrl ? { item: itemUrl } : {}),
      };
    }),
  };
}

function injectHeadingIds(html) {
  let h2 = 0;
  let h3 = 0;
  return String(html || "")
    .replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, attrs, inner) => {
      h2 += 1;
      const id = `section-${h2}`;
      const attrStr = attrs || "";
      if (/id\s*=/.test(attrStr)) return `<h2${attrStr}>${inner}</h2>`;
      return `<h2${attrStr} id="${id}">${inner}</h2>`;
    })
    .replace(/<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi, (_m, attrs, inner) => {
      h3 += 1;
      const id = `subsection-${h3}`;
      const attrStr = attrs || "";
      if (/id\s*=/.test(attrStr)) return `<h3${attrStr}>${inner}</h3>`;
      return `<h3${attrStr} id="${id}">${inner}</h3>`;
    });
}

function stripTags(html) {
  return String(html || "").replace(/<[^>]+>/g, "").trim();
}

function buildTableOfContents(html) {
  const items = [];
  const regex = /<h([23])[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const level = Number(match[1]);
    items.push({ level, id: match[2], text: stripTags(match[3]) });
  }
  if (items.length < 3) return "";

  const links = items
    .map(
      (item) =>
        `<li class="toc__item toc__item--h${item.level}"><a href="#${escapeAttr(item.id)}">${stripTags(item.text)}</a></li>`
    )
    .join("");

  return `<nav class="toc" aria-label="目次"><p class="toc__title">目次</p><ol class="toc__list">${links}</ol></nav>`;
}

function buildSeoHeadExtras({ robots, ogImage, article } = {}) {
  const lines = [];
  if (robots) {
    lines.push(`<meta name="robots" content="${escapeAttr(robots)}">`);
  }

  const image = ogImage || config.siteOgImage;
  if (image) {
    lines.push(`<meta property="og:image" content="${escapeAttr(image)}">`);
    lines.push(`<meta property="og:image:alt" content="${escapeAttr(config.siteName)}">`);
    lines.push(`<meta name="twitter:image" content="${escapeAttr(image)}">`);
  }

  lines.push('<meta property="og:locale" content="ja_JP">');

  if (config.twitterHandle) {
    const handle = config.twitterHandle.replace(/^@/, "");
    lines.push(`<meta name="twitter:site" content="@${escapeAttr(handle)}">`);
  }

  if (article) {
    const pub = article.publishedAt || article.createdAt;
    const mod = article.updatedAt || pub;
    if (pub) lines.push(`<meta property="article:published_time" content="${escapeAttr(pub)}">`);
    if (mod) lines.push(`<meta property="article:modified_time" content="${escapeAttr(mod)}">`);
    if (article.category) {
      lines.push(`<meta property="article:section" content="${escapeAttr(article.category)}">`);
    }
    for (const tag of article.tags || []) {
      lines.push(`<meta property="article:tag" content="${escapeAttr(tag)}">`);
    }
  }

  return lines.join("\n  ");
}

function buildFaviconLinks() {
  return [
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.svg">',
    `<meta name="theme-color" content="#0f172a">`,
  ].join("\n  ");
}

function buildAnalyticsScript() {
  const id = config.ga4MeasurementId;
  if (!id) return "";
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(id)}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${escapeAttr(id)}');</script>`;
}

module.exports = {
  clipText,
  plainTextLength,
  estimateReadingMinutes,
  optimizeSerpTitle,
  optimizeSerpDescription,
  getOgImageUrl,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildBreadcrumbSchema,
  injectHeadingIds,
  buildTableOfContents,
  buildSeoHeadExtras,
  buildFaviconLinks,
  buildAnalyticsScript,
  stripTags,
};
