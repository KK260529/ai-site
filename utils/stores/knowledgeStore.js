const fs = require("fs");
const path = require("path");
const { ensureDir, readJson, writeJson, listJsonFiles } = require("../fsJson");

const ROOT = path.join(process.cwd(), "knowledge");
const TOPIC_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const COURSE_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

function topicDir(topic) {
  return path.join(ROOT, topic);
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function validateTopicId(topic) {
  if (!topic || !TOPIC_ID_RE.test(topic)) {
    throw new Error("topic は英小文字・数字・ハイフンのみ（例: docker）");
  }
}

function validateCourseId(courseId) {
  if (!courseId || !COURSE_ID_RE.test(courseId)) {
    throw new Error("courseId は英小文字・数字・ハイフンのみ（例: docker-beginner）");
  }
}

function listTopics() {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function ensureTopic(topic) {
  validateTopicId(topic);
  const dir = topicDir(topic);
  ensureDir(dir);
  ensureDir(path.join(dir, "courses"));
  ensureDir(path.join(dir, "summaries"));
  ensureDir(path.join(dir, "articles"));
  return dir;
}

function createTopic(topic, { title } = {}) {
  validateTopicId(topic);
  if (fs.existsSync(topicDir(topic))) {
    throw new Error(`トピック「${topic}」は既に存在します`);
  }
  ensureTopic(topic);
  const displayTitle = title || topic;

  writeJson(path.join(topicDir(topic), "roadmap.json"), {
    topic,
    title: displayTitle,
    beginnerPath: [],
  });
  writeJson(path.join(topicDir(topic), "glossary.json"), {});
  writeJson(path.join(topicDir(topic), "concepts.json"), { concepts: [] });

  return { topic, title: displayTitle };
}

function deleteTopic(topic) {
  validateTopicId(topic);
  const dir = topicDir(topic);
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

function getRoadmap(topic) {
  return readJson(path.join(topicDir(topic), "roadmap.json"), {
    topic,
    beginnerPath: [],
  });
}

function saveRoadmap(topic, data) {
  ensureTopic(topic);
  writeJson(path.join(topicDir(topic), "roadmap.json"), data);
  return data;
}

function getGlossary(topic) {
  return readJson(path.join(topicDir(topic), "glossary.json"), {});
}

function saveGlossary(topic, data) {
  ensureTopic(topic);
  writeJson(path.join(topicDir(topic), "glossary.json"), data);
  return data;
}

function getConcepts(topic) {
  return readJson(path.join(topicDir(topic), "concepts.json"), { concepts: [] });
}

function saveConcepts(topic, data) {
  ensureTopic(topic);
  writeJson(path.join(topicDir(topic), "concepts.json"), data);
  return data;
}

function getCourse(topic, courseId) {
  return readJson(path.join(topicDir(topic), "courses", `${courseId}.json`));
}

function listCourses(topic) {
  const dir = path.join(topicDir(topic), "courses");
  if (!fs.existsSync(dir)) return [];
  return listJsonFiles(dir)
    .map((f) => readJson(path.join(dir, f)))
    .filter(Boolean)
    .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
}

function renumberEpisodes(episodes) {
  return (episodes || []).map((ep, i) => ({
    ...ep,
    episode: i + 1,
  }));
}

function saveCourse(topic, course) {
  validateTopicId(topic);
  validateCourseId(course.courseId);
  ensureTopic(topic);
  const normalized = {
    ...course,
    topic,
    episodes: renumberEpisodes(course.episodes || []),
  };
  writeJson(path.join(topicDir(topic), "courses", `${course.courseId}.json`), normalized);
  return normalized;
}

function createCourse(topic, { courseId, title, description, target, episodes }) {
  validateTopicId(topic);
  validateCourseId(courseId);
  if (getCourse(topic, courseId)) {
    throw new Error(`講座「${courseId}」は既に存在します`);
  }
  const course = {
    courseId,
    title: title || courseId,
    description: description || "",
    target: target || "初心者",
    topic,
    episodes: renumberEpisodes(episodes || []),
  };
  return saveCourse(topic, course);
}

function deleteCourse(topic, courseId) {
  const file = path.join(topicDir(topic), "courses", `${courseId}.json`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

function addEpisode(topic, courseId, { title, slug }) {
  const course = getCourse(topic, courseId);
  if (!course) throw new Error("講座が見つかりません");

  const epSlug = slug || slugify(title);
  if (!epSlug) throw new Error("slug または title が必要です");
  if ((course.episodes || []).some((e) => e.slug === epSlug)) {
    throw new Error(`slug「${epSlug}」は既に使われています`);
  }

  course.episodes = renumberEpisodes([
    ...(course.episodes || []),
    { episode: (course.episodes?.length || 0) + 1, slug: epSlug, title: title || epSlug },
  ]);
  return saveCourse(topic, course);
}

function updateEpisode(topic, courseId, slug, updates) {
  const course = getCourse(topic, courseId);
  if (!course) throw new Error("講座が見つかりません");

  const idx = (course.episodes || []).findIndex((e) => e.slug === slug);
  if (idx < 0) throw new Error("エピソードが見つかりません");

  const ep = course.episodes[idx];
  if (updates.title !== undefined) ep.title = updates.title;
  if (updates.slug !== undefined && updates.slug !== slug) {
    if (course.episodes.some((e) => e.slug === updates.slug)) {
      throw new Error(`slug「${updates.slug}」は既に使われています`);
    }
    ep.slug = updates.slug;
  }

  course.episodes[idx] = ep;
  return saveCourse(topic, course);
}

function deleteEpisode(topic, courseId, slug) {
  const course = getCourse(topic, courseId);
  if (!course) throw new Error("講座が見つかりません");

  course.episodes = renumberEpisodes((course.episodes || []).filter((e) => e.slug !== slug));
  return saveCourse(topic, course);
}

function moveEpisode(topic, courseId, slug, direction) {
  const course = getCourse(topic, courseId);
  if (!course) throw new Error("講座が見つかりません");

  const eps = [...(course.episodes || [])];
  const idx = eps.findIndex((e) => e.slug === slug);
  if (idx < 0) throw new Error("エピソードが見つかりません");

  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= eps.length) return saveCourse(topic, course);

  [eps[idx], eps[swap]] = [eps[swap], eps[idx]];
  course.episodes = renumberEpisodes(eps);
  return saveCourse(topic, course);
}

function mergeRoadmapPath(topic, slugs) {
  const roadmap = getRoadmap(topic);
  const pathSet = new Set(roadmap.beginnerPath || []);
  for (const s of slugs || []) pathSet.add(s);
  roadmap.beginnerPath = [...pathSet];
  return saveRoadmap(topic, roadmap);
}

function mergeGlossary(topic, additions) {
  if (!additions || typeof additions !== "object") return getGlossary(topic);
  const glossary = getGlossary(topic);
  for (const [key, val] of Object.entries(additions)) {
    glossary[key] = { ...glossary[key], ...val };
  }
  return saveGlossary(topic, glossary);
}

function getSummary(topic, slug) {
  return readJson(path.join(topicDir(topic), "summaries", `${slug}.json`));
}

function saveSummary(topic, summary) {
  ensureTopic(topic);
  writeJson(path.join(topicDir(topic), "summaries", `${summary.slug}.json`), summary);
  return summary;
}

function getPreviousSummaries(topic, courseId, beforeEpisode) {
  const course = getCourse(topic, courseId);
  if (!course) return [];
  const summaries = [];
  for (const ep of course.episodes || []) {
    if (ep.episode >= beforeEpisode) break;
    const s = getSummary(topic, ep.slug);
    if (s) summaries.push(s);
  }
  return summaries;
}

function findEpisode(topic, courseId, slug) {
  const course = getCourse(topic, courseId);
  if (!course) return null;
  const ep = (course.episodes || []).find((e) => e.slug === slug);
  if (!ep) return null;
  return { course, episode: ep };
}

function getSeriesNav(topic, courseId, slug) {
  const course = getCourse(topic, courseId);
  if (!course) return null;
  const eps = [...(course.episodes || [])].sort((a, b) => a.episode - b.episode);
  const idx = eps.findIndex((e) => e.slug === slug);
  if (idx < 0) return null;
  return {
    course,
    prev: idx > 0 ? eps[idx - 1] : null,
    next: idx < eps.length - 1 ? eps[idx + 1] : null,
  };
}

module.exports = {
  ROOT,
  TOPIC_ID_RE,
  slugify,
  listTopics,
  ensureTopic,
  createTopic,
  deleteTopic,
  getRoadmap,
  saveRoadmap,
  getGlossary,
  saveGlossary,
  getConcepts,
  saveConcepts,
  getCourse,
  listCourses,
  saveCourse,
  createCourse,
  deleteCourse,
  addEpisode,
  updateEpisode,
  deleteEpisode,
  moveEpisode,
  mergeRoadmapPath,
  mergeGlossary,
  renumberEpisodes,
  getSummary,
  saveSummary,
  getPreviousSummaries,
  findEpisode,
  getSeriesNav,
};
