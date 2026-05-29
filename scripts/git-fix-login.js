#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");
const {
  ALLOWED_OWNER,
  ALLOWED_REMOTE,
  enforceAllowedAccount,
  clearCachedGitHubCredentials,
  assertPushAllowed,
} = require("../utils/deploy/ensureGitAccount");

const ROOT = path.join(__dirname, "..");

function git(args) {
  return spawnSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: "inherit" });
}

console.log("=== Remove cached GitHub logins ===\n");
clearCachedGitHubCredentials();
console.log("Done.\n");

console.log("=== Lock repo to KK260529 only ===\n");
enforceAllowedAccount({ clearCache: false });
console.log("Remote:", ALLOWED_REMOTE, "\n");

console.log("=== git push ===\n");
console.log("When prompted:");
console.log("  Username:", ALLOWED_OWNER);
console.log("  Password: Personal Access Token (ghp_...)");
console.log("  https://github.com/settings/tokens\n");

const push = spawnSync("git", ["push", "-u", "origin", "main"], {
  cwd: ROOT,
  encoding: "utf8",
  stdio: "inherit",
});

if (push.status !== 0) {
  const err = `${push.stderr || ""}${push.stdout || ""}`;
  try {
    assertPushAllowed(err);
  } catch (e) {
    console.error("\n", e.message);
  }
  process.exit(1);
}

console.log("\n[SUCCESS] Pushed to https://github.com/KK260529/ai-site");
