const express = require("express");
const { config } = require("../utils/config");
const {
  readPublishStatus,
  regenerateAll,
} = require("../utils/publish/publishService");
const { getGitInfo, gitPushDeploy } = require("../utils/deploy/gitDeploy");

const router = express.Router();

router.get("/status", (_req, res) => {
  const status = readPublishStatus();
  res.json({
    siteUrl: config.siteUrl,
    nodeEnv: config.nodeEnv,
    isProduction: config.isProduction,
    ...status,
  });
});

router.get("/git-status", (_req, res) => {
  res.json(getGitInfo());
});

router.post("/git-push", (req, res) => {
  try {
    const result = gitPushDeploy({ message: req.body?.message });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/regenerate", (_req, res) => {
  try {
    const result = regenerateAll();
    res.json({
      success: true,
      status: readPublishStatus(),
      sitemap: result.sitemap,
      rss: result.rss,
      robots: result.robots,
      errors: result.errors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
