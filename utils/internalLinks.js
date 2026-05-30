const articleStore = require("./articleStore");
const knowledgeStore = require("./stores/knowledgeStore");

const TOPIC_LABELS = {
  python: "Python",
  java: "Java",
  git: "Git",
  linux: "Linux",
  sql: "SQL",
  web: "Web",
  docker: "Docker",
  ai: "AI",
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyInternalLinks(html, topic, currentSlug) {
  const parts = html.split(/(<pre[\s\S]*?<\/pre>)/gi);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return linkifyTextPart(part, topic, currentSlug);
    })
    .join("");
}

function linkifyTextPart(html, topic, currentSlug) {
  let result = html;
  const links = new Map();
  const published = articleStore.getPublishedArticles().filter((a) => a.slug !== currentSlug);

  const glossary = topic ? knowledgeStore.getGlossary(topic) : {};
  for (const [term, data] of Object.entries(glossary)) {
    for (const alias of [term, ...(data.aliases || [])]) {
      if (alias.length < 2) continue;
      const target = published.find(
        (a) =>
          a.slug.includes(alias.toLowerCase()) ||
          (a.tags || []).some((t) => t.toLowerCase() === alias.toLowerCase())
      );
      if (target) links.set(alias.toLowerCase(), `/article/${target.slug}`);
    }
  }

  const current = articleStore.readArticleFile(currentSlug);
  if (current?.tags) {
    for (const tag of current.tags) {
      if (tag.length < 2) continue;
      const target = published.find(
        (a) => (a.tags || []).includes(tag) && a.slug !== currentSlug
      );
      if (target) links.set(tag.toLowerCase(), `/article/${target.slug}`);
    }
  }

  const sorted = [...links.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [term, url] of sorted) {
    if (result.includes(`href="${url}"`)) continue;
    const regex = new RegExp(`(?<![a-zA-Z0-9"=/])(${escapeRegex(term)})(?![^<]*>)`, "gi");
    let linked = 0;
    result = result.replace(regex, (match) => {
      if (linked >= 1) return match;
      linked += 1;
      return `<a href="${url}">${match}</a>`;
    });
  }

  return result;
}

module.exports = { applyInternalLinks, TOPIC_LABELS };
