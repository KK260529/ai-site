/**
 * 将来の自動化機能フック（スタブ）
 * cron / CSV一括 / Trends / サイト複製 などをここから拡張
 */

const hooks = {
  onArticleCreated: [],
  onArticlePublished: [],
  onAfterPublish: [],
  scheduledJobs: [],
};

/** 将来: IndexNow / Google Indexing API / SNS / Discord / cron 公開 */
const futureIntegrations = {
  indexNow: null,
  googleIndexing: null,
  snsPost: null,
  discordNotify: null,
  cronPublish: null,
};

function registerHook(event, fn) {
  if (!hooks[event]) hooks[event] = [];
  hooks[event].push(fn);
}

async function runHooks(event, payload) {
  const list = hooks[event] || [];
  for (const fn of list) {
    await fn(payload);
  }
}

/** 将来: node utils/automation/cron.js から呼び出し */
async function runScheduledGeneration(_options) {
  throw new Error("自動量産は未実装です。utils/automation/bulkGenerate.js を参照してください。");
}

module.exports = {
  hooks,
  futureIntegrations,
  registerHook,
  runHooks,
  runScheduledGeneration,
};
