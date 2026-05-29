/**
 * Knowledge CMS — Vanilla JS 管理画面
 */
const state = {
  topics: [],
  selectedTopic: "",
  selectedCourseId: null,
  editingCourse: null,
  jsonTab: "roadmap",
  draftFilter: "all",
  modalSlug: null,
  genEpisodes: [],
};

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

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok) throw new Error(data.error || `エラー (${res.status})`);
  return data;
}

function showSection(name) {
  document.querySelectorAll(".admin__section").forEach((s) => {
    s.classList.toggle("admin__section--hidden", s.dataset.section !== name);
  });
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("nav-btn--active", b.dataset.section === name);
  });
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.section));
});

async function checkHealth() {
  const el = $("apiStatus");
  try {
    const data = await api("/api/health?verify=true");
    if (!data.groqConfigured) {
      el.textContent = "⚠ GROQ_API_KEY 未設定";
      el.className = "admin__status admin__status--warn";
      showApiError(".env に GROQ_API_KEY を設定し再起動してください。");
    } else if (data.groqValid === false) {
      el.textContent = "✕ APIキーが無効";
      el.className = "admin__status admin__status--warn";
      showApiError(data.groqError || "APIキーを確認してください。");
    } else {
      el.textContent = "● Groq API 接続OK";
      el.className = "admin__status admin__status--ok";
      showApiError("");
    }
  } catch {
    el.textContent = "⚠ サーバー未接続";
    el.className = "admin__status admin__status--warn";
    showApiError("restart.bat でサーバーを起動してください。");
  }
}

// --- Topics ---
async function loadTopics() {
  const data = await api("/api/knowledge/topics");
  state.topics = data.topics || [];
  if (!state.selectedTopic && state.topics.length) {
    state.selectedTopic = state.topics[0];
  }
  renderTopicList();
  refreshTopicSelects();
  if (state.selectedTopic) loadJsonEditor();
}

function renderTopicList() {
  const list = $("topicList");
  if (!state.topics.length) {
    list.innerHTML = '<p class="empty-hint">トピックがありません。新規作成してください。</p>';
    return;
  }
  list.innerHTML = state.topics
    .map(
      (t) => `
    <div class="list-item list-item--clickable ${t === state.selectedTopic ? "list-item--active" : ""}" data-topic="${escapeAttr(t)}">
      <div class="list-item__title">${escapeHtml(t)}</div>
      <div class="list-item__meta">/knowledge/${escapeHtml(t)}</div>
    </div>`
    )
    .join("");
  list.querySelectorAll("[data-topic]").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedTopic = el.dataset.topic;
      renderTopicList();
      loadJsonEditor();
      loadCourses();
      syncGenerateSelects();
    });
  });
}

function refreshTopicSelects() {
  const html = state.topics.map((t) => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join("");
  ["courseTopicSelect", "genTopicSelect"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = html || '<option value="">（なし）</option>';
    if (state.topics.includes(prev)) el.value = prev;
    else if (state.selectedTopic) el.value = state.selectedTopic;
  });
}

async function createTopic() {
  const topic = $("newTopicId").value.trim().toLowerCase();
  const title = $("newTopicTitle").value.trim();
  if (!topic) return toast("topic ID を入力してください");
  try {
    await api("/api/knowledge/topics/create", {
      method: "POST",
      body: JSON.stringify({ topic, title: title || topic }),
    });
    toast(`トピック「${topic}」を作成しました`);
    $("newTopicId").value = "";
    $("newTopicTitle").value = "";
    state.selectedTopic = topic;
    await loadTopics();
    loadCourses();
  } catch (e) {
    toast(e.message, 5000);
  }
}

async function loadJsonEditor() {
  if (!state.selectedTopic) return;
  $("jsonEditTopicLabel").textContent = state.selectedTopic;
  const data = await api(`/api/knowledge/${encodeURIComponent(state.selectedTopic)}`);
  const map = { roadmap: data.roadmap, glossary: data.glossary, concepts: data.concepts };
  $("jsonEditor").value = JSON.stringify(map[state.jsonTab] || {}, null, 2);
}

async function saveJson() {
  if (!state.selectedTopic) return toast("トピックを選択してください");
  let parsed;
  try {
    parsed = JSON.parse($("jsonEditor").value);
  } catch {
    return toast("JSONの形式が正しくありません");
  }
  const body = {};
  body[state.jsonTab] = parsed;
  try {
    await api(`/api/knowledge/topics/${encodeURIComponent(state.selectedTopic)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    toast(`${state.jsonTab}.json を保存しました`);
  } catch (e) {
    toast(e.message, 5000);
  }
}

async function deleteTopic() {
  if (!state.selectedTopic) return;
  if (!confirm(`トピック「${state.selectedTopic}」を削除しますか？`)) return;
  try {
    await api(`/api/knowledge/topics/${encodeURIComponent(state.selectedTopic)}`, {
      method: "DELETE",
    });
    toast("削除しました");
    state.selectedTopic = state.topics[0] || "";
    state.editingCourse = null;
    await loadTopics();
    loadCourses();
  } catch (e) {
    toast(e.message, 5000);
  }
}

document.querySelectorAll("[data-json]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-json]").forEach((t) => t.classList.remove("tab--active"));
    tab.classList.add("tab--active");
    state.jsonTab = tab.dataset.json;
    loadJsonEditor();
  });
});

// --- Courses ---
async function loadCourses() {
  const topic = $("courseTopicSelect")?.value || state.selectedTopic;
  if (!topic) {
    $("courseList").innerHTML = '<p class="empty-hint">トピックを作成してください</p>';
    return;
  }
  state.selectedTopic = topic;
  const data = await api(`/api/knowledge/${encodeURIComponent(topic)}`);
  const courses = data.courses || [];
  const list = $("courseList");
  if (!courses.length) {
    list.innerHTML = '<p class="empty-hint">講座がありません</p>';
    clearCourseEditor();
    return;
  }
  list.innerHTML = courses
    .map(
      (c) => `
    <div class="list-item list-item--clickable ${c.courseId === state.selectedCourseId ? "list-item--active" : ""}" data-course="${escapeAttr(c.courseId)}">
      <div class="list-item__title">${escapeHtml(c.title)}</div>
      <div class="list-item__meta">${escapeHtml(c.courseId)} · ${(c.episodes || []).length} 話</div>
    </div>`
    )
    .join("");
  list.querySelectorAll("[data-course]").forEach((el) => {
    el.addEventListener("click", () => selectCourse(el.dataset.course));
  });
  if (state.selectedCourseId && courses.some((c) => c.courseId === state.selectedCourseId)) {
    selectCourse(state.selectedCourseId);
  } else if (courses.length) {
    selectCourse(courses[0].courseId);
  }
  syncGenerateSelects();
}

async function selectCourse(courseId) {
  const topic = $("courseTopicSelect").value;
  state.selectedCourseId = courseId;
  const { course } = await api(
    `/api/knowledge/${encodeURIComponent(topic)}/courses/${encodeURIComponent(courseId)}`
  );
  state.editingCourse = JSON.parse(JSON.stringify(course));
  renderCourseEditor();
  document.querySelectorAll("#courseList [data-course]").forEach((el) => {
    el.classList.toggle("list-item--active", el.dataset.course === courseId);
  });
}

function clearCourseEditor() {
  state.editingCourse = null;
  state.selectedCourseId = null;
  $("courseEditLabel").textContent = "未選択";
  $("editCourseId").value = "";
  $("editCourseTitle").value = "";
  $("editCourseDesc").value = "";
  $("editCourseTarget").value = "";
  $("episodeEditor").innerHTML = "";
}

function renderCourseEditor() {
  const c = state.editingCourse;
  if (!c) return clearCourseEditor();
  $("courseEditLabel").textContent = c.courseId;
  $("editCourseId").value = c.courseId;
  $("editCourseTitle").value = c.title || "";
  $("editCourseDesc").value = c.description || "";
  $("editCourseTarget").value = c.target || "";
  renderEpisodeEditor();
}

function renderEpisodeEditor() {
  const wrap = $("episodeEditor");
  const eps = state.editingCourse?.episodes || [];
  if (!eps.length) {
    wrap.innerHTML = '<p class="empty-hint">エピソードがありません</p>';
    return;
  }
  wrap.innerHTML = eps
    .map(
      (ep, i) => `
    <div class="ep-row" data-idx="${i}">
      <span class="ep-row__num">${ep.episode}</span>
      <input type="text" class="input ep-row__title" data-field="title" value="${escapeAttr(ep.title)}">
      <input type="text" class="input ep-row__slug" data-field="slug" value="${escapeAttr(ep.slug)}">
      <div class="ep-row__actions">
        <button type="button" class="btn btn--ghost btn--xs" data-move="up" data-slug="${escapeAttr(ep.slug)}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="btn btn--ghost btn--xs" data-move="down" data-slug="${escapeAttr(ep.slug)}" ${i === eps.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="btn btn--danger btn--xs" data-del="${escapeAttr(ep.slug)}">削除</button>
      </div>
    </div>`
    )
    .join("");

  wrap.querySelectorAll(".ep-row__title, .ep-row__slug").forEach((inp) => {
    inp.addEventListener("change", syncEpisodesFromDom);
  });
  wrap.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => moveEpisode(btn.dataset.slug, btn.dataset.move));
  });
  wrap.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => removeEpisodeLocal(btn.dataset.del));
  });
}

function syncEpisodesFromDom() {
  const rows = $("episodeEditor").querySelectorAll(".ep-row");
  state.editingCourse.episodes = [...rows].map((row, i) => ({
    episode: i + 1,
    title: row.querySelector('[data-field="title"]').value.trim(),
    slug: row.querySelector('[data-field="slug"]').value.trim().toLowerCase(),
  }));
}

async function saveCourse() {
  if (!state.editingCourse) return toast("講座を選択してください");
  syncEpisodesFromDom();
  const topic = $("courseTopicSelect").value;
  const newCourseId = $("editCourseId").value.trim();
  try {
    const data = await api(
      `/api/knowledge/${encodeURIComponent(topic)}/courses/${encodeURIComponent(state.editingCourse.courseId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: $("editCourseTitle").value.trim(),
          description: $("editCourseDesc").value.trim(),
          target: $("editCourseTarget").value.trim(),
          episodes: state.editingCourse.episodes,
          newCourseId: newCourseId !== state.editingCourse.courseId ? newCourseId : undefined,
        }),
      }
    );
    state.selectedCourseId = data.course.courseId;
    state.editingCourse = data.course;
    toast("講座を保存しました");
    loadCourses();
    syncGenerateSelects();
  } catch (e) {
    toast(e.message, 5000);
  }
}

async function deleteCourse() {
  if (!state.editingCourse) return;
  if (!confirm(`講座「${state.editingCourse.title}」を削除しますか？`)) return;
  const topic = $("courseTopicSelect").value;
  try {
    await api(
      `/api/knowledge/${encodeURIComponent(topic)}/courses/${encodeURIComponent(state.editingCourse.courseId)}`,
      { method: "DELETE" }
    );
    toast("講座を削除しました");
    state.selectedCourseId = null;
    state.editingCourse = null;
    loadCourses();
  } catch (e) {
    toast(e.message, 5000);
  }
}

function addEpisodeLocal() {
  if (!state.editingCourse) return toast("講座を選択してください");
  const n = (state.editingCourse.episodes?.length || 0) + 1;
  state.editingCourse.episodes = [
    ...(state.editingCourse.episodes || []),
    { episode: n, slug: `episode-${n}`, title: `第${n}回` },
  ];
  renderEpisodeEditor();
}

function removeEpisodeLocal(slug) {
  if (!confirm("このエピソードを削除しますか？")) return;
  state.editingCourse.episodes = (state.editingCourse.episodes || []).filter((e) => e.slug !== slug);
  state.editingCourse.episodes.forEach((e, i) => (e.episode = i + 1));
  renderEpisodeEditor();
}

async function moveEpisode(slug, direction) {
  const topic = $("courseTopicSelect").value;
  try {
    const data = await api(
      `/api/knowledge/${encodeURIComponent(topic)}/courses/${encodeURIComponent(state.editingCourse.courseId)}/episodes/${encodeURIComponent(slug)}/move`,
      { method: "POST", body: JSON.stringify({ direction }) }
    );
    state.editingCourse = data.course;
    renderCourseEditor();
  } catch (e) {
    toast(e.message, 5000);
  }
}

async function manualCreateCourse() {
  const topic = $("courseTopicSelect").value;
  const courseId = $("manualCourseId").value.trim().toLowerCase();
  const title = $("manualCourseTitle").value.trim();
  if (!courseId || !title) return toast("courseId と title が必要です");
  try {
    const data = await api(`/api/knowledge/${encodeURIComponent(topic)}/courses/create`, {
      method: "POST",
      body: JSON.stringify({ courseId, title, description: "", target: "初心者", episodes: [] }),
    });
    toast("講座を作成しました");
    state.selectedCourseId = data.course.courseId;
    await loadCourses();
    selectCourse(data.course.courseId);
  } catch (e) {
    toast(e.message, 5000);
  }
}

async function aiGenerateCourse() {
  const topic = $("courseTopicSelect").value;
  const title = $("aiCourseTitle").value.trim();
  if (!title) return toast("講座タイトルを入力してください");
  $("aiGenerateCourseBtn").disabled = true;
  $("courseLoading").hidden = false;
  try {
    const data = await api(`/api/knowledge/${encodeURIComponent(topic)}/courses/generate-ai`, {
      method: "POST",
      body: JSON.stringify({
        title,
        target: $("aiCourseTarget").value.trim() || "初心者",
        episodeCount: parseInt($("aiEpisodeCount").value, 10) || 5,
        courseId: $("aiCourseId").value.trim() || undefined,
        description: $("aiCourseDesc").value.trim() || undefined,
      }),
    });
    toast("AI講座構成を保存しました");
    state.selectedCourseId = data.course.courseId;
    await loadCourses();
    selectCourse(data.course.courseId);
  } catch (e) {
    showApiError(e.message);
    toast(e.message, 6000);
  } finally {
    $("aiGenerateCourseBtn").disabled = false;
    $("courseLoading").hidden = true;
  }
}

// --- Generate article ---
async function syncGenerateSelects() {
  const topic = $("genTopicSelect")?.value || state.selectedTopic;
  if (!topic) return;
  const data = await api(`/api/knowledge/${encodeURIComponent(topic)}`);
  const courseSel = $("genCourseSelect");
  const prevCourse = courseSel.value;
  courseSel.innerHTML = (data.courses || [])
    .map((c) => `<option value="${escapeAttr(c.courseId)}">${escapeHtml(c.title)}</option>`)
    .join("");
  if (!data.courses?.length) {
    state.genEpisodes = [];
    renderGenEpisodeList();
    return;
  }
  if (prevCourse && [...courseSel.options].some((o) => o.value === prevCourse)) {
    courseSel.value = prevCourse;
  }
  await loadGenEpisodes();
}

async function loadGenEpisodes() {
  const topic = $("genTopicSelect").value;
  const courseId = $("genCourseSelect").value;
  if (!topic || !courseId) {
    state.genEpisodes = [];
    renderGenEpisodeList();
    return;
  }
  const { course } = await api(
    `/api/knowledge/${encodeURIComponent(topic)}/courses/${encodeURIComponent(courseId)}`
  );
  state.genEpisodes = course.episodes || [];
  renderGenEpisodeList();
}

function renderGenEpisodeList() {
  const wrap = $("genEpisodeList");
  if (!wrap) return;
  if (!state.genEpisodes.length) {
    wrap.innerHTML = '<p class="empty-hint">エピソードがありません</p>';
    updateGenerateBtnLabel();
    return;
  }
  wrap.innerHTML = state.genEpisodes
    .map(
      (ep) => `
    <label class="ep-check">
      <input type="checkbox" name="genEp" value="${escapeAttr(ep.slug)}">
      <span class="ep-check__num">#${ep.episode}</span>
      <span class="ep-check__title">${escapeHtml(ep.title)}</span>
      <span class="ep-check__slug">${escapeHtml(ep.slug)}</span>
    </label>`
    )
    .join("");
  wrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", updateGenerateBtnLabel);
  });
  updateGenerateBtnLabel();
}

function getSelectedEpisodeSlugs() {
  return [...document.querySelectorAll('#genEpisodeList input[name="genEp"]:checked')].map(
    (cb) => cb.value
  );
}

function sortSlugsByEpisodeOrder(slugs) {
  return [...slugs].sort((a, b) => {
    const epA = state.genEpisodes.find((e) => e.slug === a);
    const epB = state.genEpisodes.find((e) => e.slug === b);
    return (epA?.episode || 0) - (epB?.episode || 0);
  });
}

function updateGenerateBtnLabel() {
  const n = getSelectedEpisodeSlugs().length;
  const btn = $("generateBtn");
  if (btn) {
    btn.textContent =
      n > 0 ? `選択した ${n} 件のエピソードを生成` : "選択したエピソードを生成";
  }
}

function setAllEpisodeChecks(checked) {
  document.querySelectorAll('#genEpisodeList input[name="genEp"]').forEach((cb) => {
    cb.checked = checked;
  });
  updateGenerateBtnLabel();
}

function showGenPreview(draft) {
  $("genPreviewEmpty").hidden = true;
  $("preview").hidden = false;
  $("previewMeta").innerHTML = `
    <strong>${escapeHtml(draft.title)}</strong><br>
    ${escapeHtml(draft.knowledge?.topic || "")} / ${escapeHtml(draft.knowledge?.courseId || "")}<br>
    ${escapeHtml(draft.summary)}
  `;
  $("previewBody").innerHTML = draft.body;
  $("previewConclusion").textContent = "まとめ: " + (draft.conclusion || "");
}

function showBatchLog(entries) {
  const log = $("genBatchLog");
  if (!log) return;
  log.hidden = false;
  log.innerHTML = entries
    .map((e) => {
      const cls = e.ok ? "batch-log__ok" : "batch-log__err";
      const msg = e.ok ? "✓ 保存済み" : `✕ ${escapeHtml(e.error)}`;
      return `<li class="${cls}">#${e.episode} ${escapeHtml(e.title)} — ${msg}</li>`;
    })
    .join("");
}

async function generateEpisode() {
  const topic = $("genTopicSelect").value;
  const courseId = $("genCourseSelect").value;
  const slugs = sortSlugsByEpisodeOrder(getSelectedEpisodeSlugs());
  if (!courseId) return toast("講座を選択してください");
  if (!slugs.length) return toast("1件以上のエピソードを選択してください");

  const angle = $("angleInput").value.trim() || undefined;
  $("generateBtn").disabled = true;
  $("loading").hidden = false;
  $("genBatchLog").hidden = true;

  const logEntries = [];
  let lastDraft = null;

  try {
    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i];
      const ep = state.genEpisodes.find((e) => e.slug === slug);
      const label = ep ? `#${ep.episode} ${ep.title}` : slug;
      $("loadingText").textContent = `生成中 (${i + 1}/${slugs.length}): ${label}`;

      try {
        const data = await api(`/api/knowledge/${encodeURIComponent(topic)}/episodes/generate`, {
          method: "POST",
          body: JSON.stringify({ courseId, slug, angle }),
        });
        lastDraft = data.draft;
        logEntries.push({
          ok: true,
          slug,
          episode: ep?.episode,
          title: ep?.title || slug,
        });
      } catch (e) {
        logEntries.push({
          ok: false,
          slug,
          episode: ep?.episode,
          title: ep?.title || slug,
          error: e.message,
        });
      }
    }

    showBatchLog(logEntries);
    const okCount = logEntries.filter((e) => e.ok).length;
    if (lastDraft) showGenPreview(lastDraft);
    if (okCount === slugs.length) {
      toast(`${okCount} 件を review-needed に保存しました`);
    } else if (okCount > 0) {
      toast(`${okCount}/${slugs.length} 件成功。失敗分はログを確認してください`, 5000);
    } else {
      showApiError(logEntries[0]?.error || "生成に失敗しました");
      toast("すべて失敗しました", 5000);
    }
    loadDrafts();
    loadArticles();
  } finally {
    $("loading").hidden = true;
    $("loadingText").textContent = "構造化メモリを読み込み、記事を生成中…";
    $("generateBtn").disabled = false;
  }
}

// --- Drafts ---
async function loadDrafts() {
  const { drafts } = await api("/api/knowledge/drafts/all");
  let filtered = drafts;
  if (state.draftFilter !== "all") {
    filtered = drafts.filter((d) => d.bucketKey === state.draftFilter);
  }
  $("draftCount").textContent = String(filtered.length);
  const list = $("draftList");
  if (!filtered.length) {
    list.innerHTML = '<p class="empty-hint">下書きがありません</p>';
    return;
  }
  list.innerHTML = filtered
    .map((d) => {
      const label =
        d.bucketKey === "review" ? "要レビュー" : d.bucketKey === "ready" ? "公開準備OK" : d.bucketKey;
      return `
    <div class="list-item">
      <div class="list-item__title">${escapeHtml(d.title)}</div>
      <div class="list-item__meta">${escapeHtml(d.slug)} · ${label}</div>
      <div class="list-item__actions">
        <button type="button" class="btn btn--ghost" data-open="${escapeAttr(d.slug)}">詳細</button>
        ${d.bucketKey === "review" ? `<button type="button" class="btn btn--ghost" data-ready="${escapeAttr(d.slug)}">確認OK</button>` : ""}
        ${d.bucketKey === "ready" ? `<button type="button" class="btn btn--accent" data-publish="${escapeAttr(d.slug)}">公開</button>` : ""}
        <button type="button" class="btn btn--danger" data-delete-draft="${escapeAttr(d.slug)}" data-bucket="${escapeAttr(d.bucketKey)}">削除</button>
      </div>
    </div>`;
    })
    .join("");

  list.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openDraftModal(btn.dataset.open));
  });
  list.querySelectorAll("[data-ready]").forEach((btn) => {
    btn.addEventListener("click", () => markReady(btn.dataset.ready));
  });
  list.querySelectorAll("[data-publish]").forEach((btn) => {
    btn.addEventListener("click", () => publishDraft(btn.dataset.publish));
  });
  list.querySelectorAll("[data-delete-draft]").forEach((btn) => {
    btn.addEventListener("click", () => deleteDraft(btn.dataset.deleteDraft, btn.dataset.bucket));
  });
}

async function openDraftModal(slug) {
  state.modalSlug = slug;
  const data = await api(`/api/knowledge/drafts/${encodeURIComponent(slug)}`);
  $("modalTitle").textContent = data.draft.title;
  $("modalPreview").innerHTML = data.draft.body;
  $("modalDiff").innerHTML = `
    <ul class="diff-list">
      ${(data.diff.changes || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
    </ul>
    ${data.published ? `<p class="empty-hint">公開版あり — 差分は概要レベルです</p>` : "<p class=\"empty-hint\">新規記事</p>"}
  `;
  $("modalActions").innerHTML = `
    ${data.draft.bucketKey === "review" || data.draft.bucket === "review-needed" ? `<button type="button" class="btn btn--ghost" id="modalReadyBtn">確認OK → ready</button>` : ""}
    ${data.draft.bucketKey === "ready" || data.draft.bucket === "ready-to-publish" ? `<button type="button" class="btn btn--accent" id="modalPublishBtn">公開</button>` : ""}
    <button type="button" class="btn btn--danger" id="modalDeleteBtn">削除</button>
  `;
  $("modalReadyBtn")?.addEventListener("click", () => markReady(slug).then(closeDraftModal));
  $("modalPublishBtn")?.addEventListener("click", () => publishDraft(slug).then(closeDraftModal));
  $("modalDeleteBtn")?.addEventListener("click", () => deleteDraft(slug, data.draft.bucketKey || "review").then(closeDraftModal));
  showModalTab("preview");
  $("draftModal").hidden = false;
}

function closeDraftModal() {
  $("draftModal").hidden = true;
  state.modalSlug = null;
}

function showModalTab(tab) {
  document.querySelectorAll("[data-modal-tab]").forEach((t) => {
    t.classList.toggle("tab--active", t.dataset.modalTab === tab);
  });
  $("modalPreview").hidden = tab !== "preview";
  $("modalDiff").hidden = tab !== "diff";
}

document.querySelectorAll("[data-modal-tab]").forEach((tab) => {
  tab.addEventListener("click", () => showModalTab(tab.dataset.modalTab));
});
document.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeDraftModal);
});

async function markReady(slug) {
  try {
    await api(`/api/knowledge/drafts/${encodeURIComponent(slug)}/ready`, { method: "POST" });
    toast("公開準備OKに移動しました");
    loadDrafts();
  } catch (e) {
    toast(e.message, 5000);
  }
}

async function publishDraft(slug) {
  if (!confirm("この記事を公開しますか？\n（sitemap・RSS・バックアップも更新されます）")) return;
  try {
    const data = await api(`/api/knowledge/drafts/${encodeURIComponent(slug)}/publish`, {
      method: "POST",
    });
    toast(`公開しました: ${data.publicUrl || data.article?.slug}`);
    loadDrafts();
    loadArticles();
    loadPublishStatus();
    loadGitStatus();
  } catch (e) {
    toast(e.message, 5000);
  }
}

async function deleteDraft(slug, bucketKey) {
  if (!confirm("この下書きを削除しますか？")) return;
  const bucket = bucketKey === "ready" ? "ready" : "review";
  await api(`/api/knowledge/drafts/${encodeURIComponent(slug)}?bucket=${bucket}`, { method: "DELETE" });
  toast("削除しました");
  loadDrafts();
}

document.querySelectorAll("[data-bucket]").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-bucket]").forEach((t) => t.classList.remove("tab--active"));
    tab.classList.add("tab--active");
    state.draftFilter = tab.dataset.bucket;
    loadDrafts();
  });
});

// --- Articles ---
async function loadArticles() {
  const { articles } = await api("/api/articles?all=true");
  $("listCount").textContent = String(articles.length);
  const list = $("articleList");
  if (!articles.length) {
    list.innerHTML = '<p class="empty-hint">記事がありません</p>';
    return;
  }
  const status = await api("/api/publish/status").catch(() => ({}));
  const siteBase = (status.siteUrl || "").replace(/\/$/, "");
  list.innerHTML = articles
    .map((a) => {
      const pubUrl =
        a.status === "published" && siteBase
          ? `${siteBase}/article/${a.slug}`
          : a.status === "published"
            ? `/article/${a.slug}`
            : "";
      return `
    <div class="list-item">
      <div class="list-item__title">${escapeHtml(a.title)}</div>
      <div class="list-item__meta">${escapeHtml(a.category)} · ${formatDate(a.publishedAt || a.createdAt)}</div>
      <span class="list-item__status list-item__status--${a.status}">${escapeHtml(a.status)}</span>
      ${pubUrl ? `<div class="list-item__meta"><a href="${escapeAttr(pubUrl)}" target="_blank">${escapeHtml(pubUrl)}</a></div>` : ""}
      <div class="list-item__actions">
        ${a.status === "published" ? `<a href="/article/${escapeAttr(a.slug)}" class="btn btn--ghost" target="_blank">プレビュー</a>` : ""}
        <button type="button" class="btn btn--ghost" data-toggle="${escapeAttr(a.slug)}">${a.status === "published" ? "下書きに" : "公開"}</button>
        <button type="button" class="btn btn--danger" data-delete="${escapeAttr(a.slug)}">削除</button>
      </div>
    </div>`;
    })
    .join("");

  list.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const { article } = await api(`/api/articles/${btn.dataset.toggle}`);
      const newStatus = article.status === "published" ? "draft" : "published";
      await api(`/api/articles/${btn.dataset.toggle}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast(newStatus === "published" ? "公開しました" : "下書きにしました");
      loadArticles();
    });
  });
  list.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("削除しますか？")) return;
      await api(`/api/articles/${btn.dataset.delete}`, { method: "DELETE" });
      toast("削除しました");
      loadArticles();
    });
  });
}

// --- Deploy / publish status ---
async function loadGitStatus() {
  try {
    const g = await api("/api/publish/git-status");
    if (!g.isRepo) {
      $("gitRepoStatus").textContent = "未初期化";
      $("gitBranch").textContent = "—";
      $("gitRemote").textContent = "—";
      $("gitChanges").textContent = "—";
      $("gitPushBtn").disabled = true;
      return;
    }
    $("gitRepoStatus").textContent = "OK";
    $("gitBranch").textContent = g.branch || "—";
    $("gitRemote").textContent = g.remote || "（未設定）";
    $("gitChanges").textContent = `${g.changedFiles} 件`;
    $("gitPushBtn").disabled = !g.canPush;
  } catch {
    $("gitRepoStatus").textContent = "取得失敗";
    $("gitPushBtn").disabled = true;
  }
}

async function gitPushDeploy() {
  if (
    !confirm(
      "articles / sitemap / RSS 等を git add → commit → push します。\n本番サイト（Vercel / Railway）が更新されます。よろしいですか？"
    )
  ) {
    return;
  }
  const log = $("gitPushLog");
  log.hidden = false;
  log.textContent = "実行中…";
  $("gitPushBtn").disabled = true;
  try {
    const data = await api("/api/publish/git-push", {
      method: "POST",
      body: JSON.stringify({ message: $("gitCommitMsg")?.value?.trim() || undefined }),
    });
    log.textContent = [
      data.message,
      "",
      ...(data.steps || []).map((s) => `[${s.step}] ${s.ok !== false ? "OK" : "SKIP"} ${s.output || s.message || ""}`),
    ].join("\n");
    toast(data.message);
    loadGitStatus();
  } catch (e) {
    log.textContent = e.message;
    toast(e.message, 6000);
  } finally {
    $("gitPushBtn").disabled = false;
  }
}

async function loadPublishStatus() {
  try {
    const s = await api("/api/publish/status");
    $("deployEnv").textContent = `${s.nodeEnv}${s.isProduction ? " (production)" : ""}`;
    $("deploySiteUrl").innerHTML = `<a href="${escapeAttr(s.siteUrl)}" target="_blank">${escapeHtml(s.siteUrl)}</a>`;
    $("deploySitemap").textContent = s.sitemapUpdatedAt
      ? `${formatDate(s.sitemapUpdatedAt)} → ${s.sitemapUrl || s.siteUrl + "/sitemap.xml"}`
      : "未生成";
    $("deployRss").textContent = s.rssUpdatedAt
      ? `${formatDate(s.rssUpdatedAt)} → ${s.rssUrl || s.siteUrl + "/rss.xml"}`
      : "未生成";
    $("deployRobots").textContent = s.robotsUpdatedAt
      ? `${formatDate(s.robotsUpdatedAt)} → ${s.robotsUrl || s.siteUrl + "/robots.txt"}`
      : "未生成";
    $("deployLastPublish").textContent = s.lastPublish
      ? `${s.lastPublish.title} (${formatDate(s.lastPublish.at)})`
      : "—";
  } catch {
    $("deployEnv").textContent = "取得失敗";
  }
}

async function regenerateSeo() {
  $("regenerateSeoBtn").disabled = true;
  try {
    const data = await api("/api/publish/regenerate", { method: "POST" });
    toast("sitemap / RSS / robots を更新しました");
    if (data.errors?.length) toast(`${data.errors.length} 件の警告あり`, 5000);
    loadPublishStatus();
    loadGitStatus();
  } catch (e) {
    toast(e.message, 5000);
  } finally {
    $("regenerateSeoBtn").disabled = false;
  }
}

// --- Init ---
$("createTopicBtn")?.addEventListener("click", createTopic);
$("regenerateSeoBtn")?.addEventListener("click", regenerateSeo);
$("gitPushBtn")?.addEventListener("click", gitPushDeploy);
$("saveJsonBtn")?.addEventListener("click", saveJson);
$("deleteTopicBtn")?.addEventListener("click", deleteTopic);
$("courseTopicSelect")?.addEventListener("change", () => {
  state.selectedCourseId = null;
  loadCourses();
});
$("saveCourseBtn")?.addEventListener("click", saveCourse);
$("deleteCourseBtn")?.addEventListener("click", deleteCourse);
$("addEpisodeBtn")?.addEventListener("click", addEpisodeLocal);
$("manualCreateCourseBtn")?.addEventListener("click", manualCreateCourse);
$("aiGenerateCourseBtn")?.addEventListener("click", aiGenerateCourse);
$("genTopicSelect")?.addEventListener("change", syncGenerateSelects);
$("genCourseSelect")?.addEventListener("change", loadGenEpisodes);
$("selectAllEpisodesBtn")?.addEventListener("click", () => setAllEpisodeChecks(true));
$("deselectAllEpisodesBtn")?.addEventListener("click", () => setAllEpisodeChecks(false));
$("generateBtn")?.addEventListener("click", generateEpisode);

checkHealth();
loadPublishStatus();
loadGitStatus();
loadTopics().then(() => {
  loadCourses();
  syncGenerateSelects();
  loadDrafts();
  loadArticles();
});
