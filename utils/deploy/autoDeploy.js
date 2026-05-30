const { config } = require("../config");
const { canWriteToDisk } = require("../runtime");
const { regenerateAll } = require("../publish/publishService");
const { getGitInfo, gitPushDeploy, isGitRepo } = require("./gitDeploy");

const DEBOUNCE_MS = 4000;
let deployTimer = null;
let lastResult = null;
let running = false;

function isAutoDeployEnabled() {
  const flag = String(process.env.AUTO_GIT_DEPLOY ?? "true").trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off" || flag === "no") {
    return false;
  }
  return canWriteToDisk() && isGitRepo();
}

function getLastAutoDeployResult() {
  return lastResult;
}

function scheduleAutoDeploy(meta = {}) {
  if (!isAutoDeployEnabled()) {
    return { scheduled: false, reason: "AUTO_GIT_DEPLOY が無効、または Git 不可環境です" };
  }

  const info = getGitInfo();
  if (!info.canPush) {
    return { scheduled: false, reason: "Git push の準備ができていません（git-fix-account.bat）" };
  }

  if (deployTimer) clearTimeout(deployTimer);

  deployTimer = setTimeout(() => {
    deployTimer = null;
    runAutoDeploy(meta).catch((err) => {
      lastResult = { ok: false, at: new Date().toISOString(), error: err.message, ...meta };
      console.error("[auto-deploy]", err.message);
    });
  }, DEBOUNCE_MS);

  return { scheduled: true, debounceMs: DEBOUNCE_MS };
}

async function runAutoDeploy(meta = {}) {
  if (running) {
    scheduleAutoDeploy(meta);
    return lastResult;
  }
  if (!isAutoDeployEnabled()) {
    throw new Error("自動デプロイは無効です");
  }

  running = true;
  const startedAt = new Date().toISOString();

  try {
    regenerateAll();

    const { buildArticleIndex } = require("../../scripts/build-article-index");
    buildArticleIndex();

    const articleStore = require("../articleStore");
    articleStore.ensurePublicArticlesDir();
    for (const a of articleStore.getPublishedArticles()) {
      articleStore.mirrorPublishedArticle(a);
    }

    const slug = meta.slug || meta.article?.slug;
    const title = meta.title || meta.article?.title;
    const message =
      slug && title
        ? `publish: ${title} (${slug})`
        : `publish: サイトコンテンツ更新 ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`;

    const result = gitPushDeploy({ message });
    lastResult = {
      ok: true,
      at: startedAt,
      committed: result.committed,
      branch: result.branch,
      message: result.message,
      slug,
      title,
    };
    console.log(`[auto-deploy] ${result.message}`);
    return lastResult;
  } catch (err) {
    lastResult = { ok: false, at: startedAt, error: err.message, ...meta };
    throw err;
  } finally {
    running = false;
  }
}

module.exports = {
  isAutoDeployEnabled,
  scheduleAutoDeploy,
  runAutoDeploy,
  getLastAutoDeployResult,
};
