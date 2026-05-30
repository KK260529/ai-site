const { config } = require("../config");
const { buildSeoExtended } = require("../seoExtended");
const crypto = require("crypto");

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugHash(text) {
  return crypto.createHash("md5").update(String(text)).digest("hex").slice(0, 6);
}

function slugify(text, maxLen = 80) {
  const base = String(text || "")
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/, "");
  return base;
}

function makeErrorSlug(tech, errorMessage) {
  return `${slugify(`${tech}-${errorMessage}`, 80)}-${slugHash(errorMessage)}`;
}

function buildErrorBody(entry, techDef) {
  const err = escapeHtml(entry.errorMessage);
  const env = (entry.environment || []).join(" / ") || "Windows / macOS / Linux";
  const causes = entry.causes || [];
  const diagnostics = entry.diagnosticSteps || [];
  const fixes = entry.fixes || [];
  const prevention = entry.prevention || [];

  let html = `
<h2>エラーメッセージ（全文）</h2>
<pre><code>${err}</code></pre>

<h2>このエラーとは</h2>
<p>${escapeHtml(entry.summary || `${entry.errorMessage} は ${techDef.label} 開発でよく遭遇するエラーです。`)}</p>
<p><strong>想定環境:</strong> ${escapeHtml(env)}</p>
${entry.context ? `<p><strong>よく出る状況:</strong> ${escapeHtml(entry.context)}</p>` : ""}

<h2>よくある原因</h2>
<ul>
${causes.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n")}
</ul>`;

  if (diagnostics.length) {
    html += `
<h2>確認手順（切り分け）</h2>
<ol>
${diagnostics.map((d) => `<li>${escapeHtml(d)}</li>`).join("\n")}
</ol>`;
  }

  html += `<h2>解決方法</h2>`;
  fixes.forEach((fix, i) => {
    html += `<h3>方法${i + 1}: ${escapeHtml(fix.title)}</h3>`;
    html += `<p>${escapeHtml(fix.description)}</p>`;
    if (fix.code) {
      html += `<pre><code>${escapeHtml(fix.code)}</code></pre>`;
    }
  });

  if (prevention.length) {
    html += `
<h2>再発防止</h2>
<ul>
${prevention.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n")}
</ul>`;
  }

  html += `
<h2>それでも直らないとき</h2>
<p>バージョン情報（${escapeHtml(techDef.label)} のバージョン、OS、実行コマンド）を添えて、エラーメッセージ全文と直前に変更した点を確認してください。ログの数行上にも原因の手がかりが残っていることが多いです。</p>`;

  return html.trim();
}

function buildErrorFaq(entry, techDef) {
  const err = entry.errorMessage;
  const shortErr = err.length > 80 ? err.slice(0, 77) + "…" : err;
  const faq = [
    {
      question: `${shortErr} とは何ですか？`,
      answer: entry.summary || `${err} は ${techDef.label} 実行時に表示されるエラーです。${(entry.causes || [])[0] || "設定や環境の不一致が原因であることが多いです。"}`,
    },
    {
      question: `${shortErr} の原因は？`,
      answer: (entry.causes || []).slice(0, 3).join("。") + "。",
    },
    {
      question: `${shortErr} の直し方は？`,
      answer: (entry.fixes || [])
        .slice(0, 2)
        .map((f) => f.title + "：" + f.description)
        .join(" ") || "ログ全文を確認し、直前の変更を戻してから再実行してください。",
    },
    {
      question: `${techDef.label} で ${entry.errorCode || "このエラー"} が出るのはなぜ？`,
      answer: entry.context || `${techDef.label} のバージョン差異、パスの問題、権限不足、設定ミスが典型的な原因です。`,
    },
    {
      question: `${shortErr} を防ぐには？`,
      answer: (entry.prevention || []).slice(0, 2).join("。") + "。",
    },
  ];
  if (entry.extraFaq) faq.push(...entry.extraFaq);
  return faq.slice(0, 7);
}

function buildErrorArticle(entry, techDef, index) {
  const title = entry.title || `${entry.errorMessage} の原因と解決法`;
  const metaTitle = `${entry.errorMessage} の原因と解決法 | ${techDef.category}`;
  const metaDescription = `${entry.errorMessage} が出たときの原因・確認手順・解決策を解説。${entry.context || techDef.label + "のトラブルシューティング"}。`;
  const tags = [
    techDef.tech,
    techDef.category,
    entry.errorCode || "エラー",
    ...(entry.tags || []),
    entry.errorMessage.slice(0, 40),
  ].filter(Boolean);

  const body = buildErrorBody(entry, techDef);
  const faq = buildErrorFaq(entry, techDef);
  const now = new Date().toISOString();

  const base = {
    id: `art_errors_${entry.slug}`,
    slug: entry.slug,
    title,
    summary: entry.summary || `${entry.errorMessage} の原因と具体的な解決手順をまとめました。`,
    body,
    conclusion: entry.conclusion || `「${entry.errorMessage}」は ${(entry.causes || [])[0] || "環境や設定"} が原因のことが多いです。上記の手順で切り分けてください。`,
    tags: [...new Set(tags)].slice(0, 12),
    category: techDef.category,
    theme: `errors - ${techDef.title}`,
    articleType: "error",
    status: "published",
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    metaTitle,
    metaDescription,
    ogTitle: title,
    ogDescription: metaDescription,
    knowledge: {
      topic: "errors",
      courseId: techDef.courseId,
      episode: index + 1,
    },
    faq,
    nextAction: entry.nextAction || `同じ ${techDef.label} カテゴリの関連エラーもあわせて確認してください。`,
    internalLinkCandidates: entry.relatedSlugs || [],
  };

  const ctx = {
    topic: "errors",
    courseId: techDef.courseId,
    course: { title: techDef.title, description: techDef.title },
    episode: { episode: index + 1, slug: entry.slug, title },
  };

  return { ...base, ...buildSeoExtended(base, ctx) };
}

module.exports = {
  slugify,
  slugHash,
  makeErrorSlug,
  buildErrorArticle,
  buildErrorBody,
  buildErrorFaq,
};
