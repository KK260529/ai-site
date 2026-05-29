const knowledgeStore = require("./stores/knowledgeStore");
const articleStore = require("./articleStore");

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyInternalLinks(html, topic, currentSlug) {
  let result = html;
  const links = new Map();

  const glossary = knowledgeStore.getGlossary(topic);
  for (const [term, data] of Object.entries(glossary)) {
    const aliases = [term, ...(data.aliases || [])];
    for (const alias of aliases) {
      if (alias.length < 2) continue;
      const related = (data.related || []).find((r) => {
        const articles = articleStore.getPublishedArticles();
        return articles.some((a) => a.slug.includes(r) || (a.tags || []).includes(r));
      });
      if (related) {
        const target = articleStore.getPublishedArticles().find(
          (a) => a.slug.includes(related) || (a.tags || []).includes(related)
        );
        if (target && target.slug !== currentSlug) {
          links.set(alias.toLowerCase(), `/article/${target.slug}`);
        }
      }
    }
  }

  const published = articleStore.getPublishedArticles().filter((a) => a.slug !== currentSlug);
  for (const a of published.slice(0, 20)) {
    if (a.knowledge?.topic === topic) {
      links.set(a.title.toLowerCase(), `/article/${a.slug}`);
    }
  }

  for (const [term, url] of links) {
    const regex = new RegExp(`(?<![<\\/a-zA-Z0-9])(${escapeRegex(term)})(?![^<]*>)`, "gi");
    result = result.replace(regex, (match) => {
      if (result.includes(`href="${url}"`)) return match;
      return `<a href="${url}">${match}</a>`;
    });
  }

  return result;
}

module.exports = { applyInternalLinks };
