const path = require("path");
const { ensureDir, readJson, writeJson, listJsonFiles, deleteFile } = require("../fsJson");

const ROOT = path.join(process.cwd(), "drafts");
const BUCKETS = {
  review: "review-needed",
  ready: "ready-to-publish",
  auto: "auto-generated",
};

function bucketPath(bucket) {
  return path.join(ROOT, BUCKETS[bucket] || bucket);
}

function saveDraft(bucket, slug, data) {
  const dir = bucketPath(bucket);
  ensureDir(dir);
  const payload = {
    ...data,
    slug,
    bucket: BUCKETS[bucket] || bucket,
    savedAt: new Date().toISOString(),
  };
  writeJson(path.join(dir, `${slug}.json`), payload);
  return payload;
}

function readDraft(bucket, slug) {
  return readJson(path.join(bucketPath(bucket), `${slug}.json`));
}

function listDrafts(bucket) {
  const dir = bucketPath(bucket);
  ensureDir(dir);
  return listJsonFiles(dir)
    .map((f) => readJson(path.join(dir, f)))
    .filter(Boolean)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

function moveDraft(slug, fromBucket, toBucket) {
  const draft = readDraft(fromBucket, slug);
  if (!draft) return null;
  saveDraft(toBucket, slug, draft);
  deleteFile(path.join(bucketPath(fromBucket), `${slug}.json`));
  return readDraft(toBucket, slug);
}

function deleteDraft(bucket, slug) {
  return deleteFile(path.join(bucketPath(bucket), `${slug}.json`));
}

function listAllDrafts() {
  return Object.keys(BUCKETS).flatMap((b) =>
    listDrafts(b).map((d) => ({ ...d, bucketKey: b }))
  );
}

module.exports = {
  BUCKETS,
  saveDraft,
  readDraft,
  listDrafts,
  listAllDrafts,
  moveDraft,
  deleteDraft,
};
