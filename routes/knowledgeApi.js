const express = require("express");
const knowledgeStore = require("../utils/stores/knowledgeStore");
const draftStore = require("../utils/stores/draftStore");
const articleStore = require("../utils/articleStore");
const { generateEpisodeArticle, publishFromDraft } = require("../utils/generation/episodeGenerator");
const { generateCourseStructure } = require("../utils/generation/courseGenerator");

const router = express.Router();

function handleError(res, err, status = 500) {
  console.error("[knowledgeApi]", err.message);
  res.status(status).json({ error: err.message });
}

function buildDraftDiff(published, draft) {
  if (!published) {
    return { isNew: true, changes: ["新規記事（公開版なし）"] };
  }
  const changes = [];
  if (published.title !== draft.title) {
    changes.push(`タイトル: 「${published.title}」→「${draft.title}」`);
  }
  if (published.summary !== draft.summary) {
    changes.push("概要が変更されています");
  }
  const pubLen = (published.body || "").length;
  const draftLen = (draft.body || "").length;
  if (pubLen !== draftLen) {
    changes.push(`本文の長さ: ${pubLen} 文字 → ${draftLen} 文字`);
  }
  if ((published.tags || []).join() !== (draft.tags || []).join()) {
    changes.push("タグが変更されています");
  }
  if (changes.length === 0) changes.push("公開版と大きな差分は検出されませんでした");
  return { isNew: false, changes };
}

router.get("/topics", (_req, res) => {
  const topics = knowledgeStore.listTopics().map((id) => ({
    id,
    roadmap: knowledgeStore.getRoadmap(id),
    courseCount: knowledgeStore.listCourses(id).length,
  }));
  res.json({ topics: topics.map((t) => t.id), topicDetails: topics });
});

router.post("/topics/create", (req, res) => {
  try {
    const { topic, title } = req.body || {};
    if (!topic) return res.status(400).json({ error: "topic が必要です" });
    const created = knowledgeStore.createTopic(topic, { title });
    res.json({ success: true, topic: created });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.patch("/topics/:topic", (req, res) => {
  try {
    const { topic } = req.params;
    const { roadmap, glossary, concepts } = req.body || {};
    if (roadmap) knowledgeStore.saveRoadmap(topic, roadmap);
    if (glossary) knowledgeStore.saveGlossary(topic, glossary);
    if (concepts) knowledgeStore.saveConcepts(topic, concepts);
    res.json({
      success: true,
      roadmap: knowledgeStore.getRoadmap(topic),
      glossary: knowledgeStore.getGlossary(topic),
      concepts: knowledgeStore.getConcepts(topic),
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.delete("/topics/:topic", (req, res) => {
  try {
    const ok = knowledgeStore.deleteTopic(req.params.topic);
    if (!ok) return res.status(404).json({ error: "トピックが見つかりません" });
    res.json({ success: true });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.get("/drafts/all", (_req, res) => {
  res.json({ drafts: draftStore.listAllDrafts() });
});

router.get("/drafts/:slug", (req, res) => {
  const slug = req.params.slug;
  const draft =
    draftStore.readDraft("review", slug) || draftStore.readDraft("ready", slug);
  if (!draft) return res.status(404).json({ error: "下書きが見つかりません" });

  const published = articleStore.readArticleFile(slug);
  res.json({
    draft,
    published: published?.status === "published" ? published : null,
    diff: buildDraftDiff(published, draft),
  });
});

router.post("/drafts/:slug/ready", (req, res) => {
  const draft = draftStore.moveDraft(req.params.slug, "review", "ready");
  if (!draft) return res.status(404).json({ error: "下書きが見つかりません" });
  res.json({ success: true, draft });
});

router.post("/drafts/:slug/publish", async (req, res) => {
  try {
    const { readPublishStatus } = require("../utils/publish/publishService");
    const article = await publishFromDraft(req.params.slug, { publish: true });
    res.json({
      success: true,
      article,
      publicUrl: `${require("../utils/config").config.siteUrl}/article/${article.slug}`,
      publishStatus: readPublishStatus(),
    });
  } catch (err) {
    handleError(res, err);
  }
});

router.delete("/drafts/:slug", (req, res) => {
  const { bucket = "review" } = req.query;
  const ok = draftStore.deleteDraft(bucket, req.params.slug);
  if (!ok) return res.status(404).json({ error: "下書きが見つかりません" });
  res.json({ success: true });
});

router.post("/:topic/courses/generate-ai", async (req, res) => {
  try {
    const { topic } = req.params;
    const { title, target, episodeCount, courseId, description } = req.body || {};
    if (!title) return res.status(400).json({ error: "title が必要です" });
    const count = Math.min(Math.max(parseInt(episodeCount, 10) || 5, 3), 20);
    const result = await generateCourseStructure({
      topic,
      title,
      target,
      episodeCount: count,
      courseId,
      description,
    });
    res.json({ success: true, course: result.course });
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/:topic/courses/create", (req, res) => {
  try {
    const { topic } = req.params;
    const { courseId, title, description, target, episodes } = req.body || {};
    if (!courseId) return res.status(400).json({ error: "courseId が必要です" });
    const course = knowledgeStore.createCourse(topic, {
      courseId,
      title,
      description,
      target,
      episodes,
    });
    res.json({ success: true, course });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.patch("/:topic/courses/:courseId", (req, res) => {
  try {
    const { topic, courseId } = req.params;
    const existing = knowledgeStore.getCourse(topic, courseId);
    if (!existing) return res.status(404).json({ error: "講座が見つかりません" });

    const { title, description, target, episodes, newCourseId } = req.body || {};
    const course = {
      ...existing,
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(target !== undefined && { target }),
      ...(episodes !== undefined && { episodes: knowledgeStore.renumberEpisodes(episodes) }),
    };

    if (newCourseId && newCourseId !== courseId) {
      knowledgeStore.deleteCourse(topic, courseId);
      course.courseId = newCourseId;
    }

    knowledgeStore.saveCourse(topic, course);
    res.json({ success: true, course });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.delete("/:topic/courses/:courseId", (req, res) => {
  const ok = knowledgeStore.deleteCourse(req.params.topic, req.params.courseId);
  if (!ok) return res.status(404).json({ error: "講座が見つかりません" });
  res.json({ success: true });
});

router.post("/:topic/courses/:courseId/episodes", (req, res) => {
  try {
    const { title, slug } = req.body || {};
    if (!title) return res.status(400).json({ error: "title が必要です" });
    const course = knowledgeStore.addEpisode(
      req.params.topic,
      req.params.courseId,
      { title, slug }
    );
    res.json({ success: true, course });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.patch("/:topic/courses/:courseId/episodes/:slug", (req, res) => {
  try {
    const course = knowledgeStore.updateEpisode(
      req.params.topic,
      req.params.courseId,
      req.params.slug,
      req.body || {}
    );
    res.json({ success: true, course });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.post("/:topic/courses/:courseId/episodes/:slug/move", (req, res) => {
  try {
    const { direction } = req.body || {};
    if (!["up", "down"].includes(direction)) {
      return res.status(400).json({ error: "direction は up または down" });
    }
    const course = knowledgeStore.moveEpisode(
      req.params.topic,
      req.params.courseId,
      req.params.slug,
      direction
    );
    res.json({ success: true, course });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.delete("/:topic/courses/:courseId/episodes/:slug", (req, res) => {
  try {
    const course = knowledgeStore.deleteEpisode(
      req.params.topic,
      req.params.courseId,
      req.params.slug
    );
    res.json({ success: true, course });
  } catch (err) {
    handleError(res, err, 400);
  }
});

router.get("/:topic", (req, res) => {
  const { topic } = req.params;
  if (!knowledgeStore.listTopics().includes(topic)) {
    return res.status(404).json({ error: "トピックが見つかりません" });
  }
  res.json({
    topic,
    roadmap: knowledgeStore.getRoadmap(topic),
    glossary: knowledgeStore.getGlossary(topic),
    concepts: knowledgeStore.getConcepts(topic),
    courses: knowledgeStore.listCourses(topic),
  });
});

router.get("/:topic/courses/:courseId", (req, res) => {
  const course = knowledgeStore.getCourse(req.params.topic, req.params.courseId);
  if (!course) return res.status(404).json({ error: "講座が見つかりません" });
  res.json({ course });
});

router.post("/:topic/episodes/generate", async (req, res) => {
  const { topic } = req.params;
  const { courseId, slug, angle, length } = req.body || {};
  if (!courseId || !slug) {
    return res.status(400).json({ error: "courseId と slug が必要です" });
  }
  try {
    const result = await generateEpisodeArticle({ topic, courseId, slug, angle, length });
    res.json({
      success: true,
      draft: result.draft,
      message: "review-needed に保存しました。",
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
