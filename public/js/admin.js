const THEMES = [
  "Linux", "Git", "Java", "Python", "AI", "Web開発",
  "TypeScript", "REST API", "セキュリティ", "クラウド",
];

let currentDraft = null;
let currentTheme = "";

const $ = (id) => document.getElementById(id);

function toast(msg, duration = 2800) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("toast--show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("toast--show"), duration);
}

function showApiError(msg) {
  let box = document.getElementById("apiErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "apiErrorBox";
    box.className = "api-error";
    $("apiStatus").after(box);
  }
  box.textContent = msg;
  box.hidden = !msg;
}

async function checkHealth() {
  const el = $("apiStatus");
  try {
    const res = await fetch("/api/health?verify=true", { credentials: "same-origin" });
    const data = await res.json();
    if (!data.groqConfigured) {
      el.textContent = "⚠ GROQ_API_KEY 未設定";
      el.className = "admin__status admin__status--warn";
      showApiError(".env に GROQ_API_KEY=gsk_xxxxx を設定し、start.bat で再起動してください。");
    } else if (data.groqValid === false) {
      el.textContent = "✕ APIキーが無効";
      el.className = "admin__status admin__status--warn";
      showApiError(data.groqError || "Groq APIキーを https://console.groq.com/keys で再取得してください。");
    } else {
      el.textContent = "● Groq API 接続OK";
      el.className = "admin__status admin__status--ok";
      showApiError("");
    }
  } catch {
    el.textContent = "⚠ サーバーに接続できません";
    el.className = "admin__status admin__status--warn";
    showApiError("start.bat でサーバーを起動してからページを再読み込みしてください。");
  }
}

function renderChips() {
  const wrap = $("themeChips");
  THEMES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = t;
    btn.addEventListener("click", () => {
      $("themeInput").value = t;
    });
    wrap.appendChild(btn);
  });
}

async function loadArticles() {
  const res = await fetch("/api/articles?all=true");
  const data = await res.json();
  const list = $("articleList");
  const count = $("listCount");

  count.textContent = String(data.articles.length);

  if (!data.articles.length) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">記事がありません</p>';
    return;
  }

  list.innerHTML = data.articles
    .map(
      (a) => `
    <div class="list-item" data-slug="${escapeAttr(a.slug)}">
      <div class="list-item__title">${escapeHtml(a.title)}</div>
      <div class="list-item__meta">${escapeHtml(a.category)} · ${formatDate(a.publishedAt || a.createdAt)}</div>
      <span class="list-item__status list-item__status--${a.status}">${a.status === "published" ? "公開" : "下書き"}</span>
      <div class="list-item__actions">
        ${a.status === "published" ? `<a href="/article/${escapeAttr(a.slug)}" class="btn btn--ghost" target="_blank">表示</a>` : ""}
        <button type="button" class="btn btn--ghost" data-toggle="${escapeAttr(a.slug)}">${a.status === "published" ? "下書きに" : "公開"}</button>
        <button type="button" class="btn btn--danger" data-delete="${escapeAttr(a.slug)}">削除</button>
      </div>
    </div>`
    )
    .join("");

  list.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => togglePublish(btn.dataset.toggle));
  });
  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteArticle(btn.dataset.delete));
  });
}

async function generateArticle() {
  const theme = $("themeInput").value.trim();
  if (!theme) {
    toast("テーマを入力してください");
    return;
  }

  currentTheme = theme;
  $("generateBtn").disabled = true;
  $("loading").hidden = false;
  $("preview").hidden = true;

  try {
    const res = await fetch("/api/articles/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme,
        angle: $("angleInput").value.trim() || undefined,
      }),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* non-JSON response */
    }
    if (!res.ok) throw new Error(data.error || `生成に失敗しました（${res.status}）`);

    currentDraft = data.draft;
    showPreview(data.draft);
    showApiError("");
    toast("記事を生成しました");
  } catch (e) {
    showApiError(e.message);
    toast(e.message, 6000);
  } finally {
    $("loading").hidden = true;
    $("generateBtn").disabled = false;
  }
}

function showPreview(draft) {
  $("preview").hidden = false;
  $("previewMeta").innerHTML = `
    <strong>${escapeHtml(draft.title)}</strong>
    カテゴリ: ${escapeHtml(draft.category)}<br>
    タグ: ${(draft.tags || []).map(escapeHtml).join(", ")}<br>
    概要: ${escapeHtml(draft.summary)}
  `;
  $("previewBody").innerHTML = draft.body;
  $("previewConclusion").textContent = "まとめ: " + (draft.conclusion || "");
}

async function saveArticle(publish) {
  if (!currentDraft) {
    toast("先に記事を生成してください");
    return;
  }

  try {
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: currentDraft,
        theme: currentTheme,
        publish,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "保存に失敗しました");

    toast(publish ? "公開しました" : "下書き保存しました");
    currentDraft = null;
    $("preview").hidden = true;
    loadArticles();
  } catch (e) {
    toast(e.message);
  }
}

async function togglePublish(slug) {
  const res = await fetch(`/api/articles/${slug}`);
  const { article } = await res.json();
  const newStatus = article.status === "published" ? "draft" : "published";

  await fetch(`/api/articles/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  });

  toast(newStatus === "published" ? "公開しました" : "下書きにしました");
  loadArticles();
}

async function deleteArticle(slug) {
  if (!confirm("この記事を削除しますか？")) return;
  await fetch(`/api/articles/${slug}`, { method: "DELETE" });
  toast("削除しました");
  loadArticles();
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

$("generateBtn").addEventListener("click", generateArticle);
$("saveDraftBtn").addEventListener("click", () => saveArticle(false));
$("savePublishBtn").addEventListener("click", () => saveArticle(true));

$("themeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateArticle();
});

renderChips();
checkHealth();
loadArticles();
