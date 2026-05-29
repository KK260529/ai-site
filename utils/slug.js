/**
 * スラッグ生成・正規化
 */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u3040-\u30ff\u4e00-\u9faf-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function ensureUniqueSlug(baseSlug, existingSlugs) {
  let slug = baseSlug || "article";
  let n = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  return slug;
}

module.exports = { slugify, ensureUniqueSlug };
