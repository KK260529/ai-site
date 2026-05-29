const { spawnSync } = require("child_process");
const path = require("path");

/** このプロジェクトで許可する GitHub アカウントのみ */
const ALLOWED_OWNER = "KK260529";
const ALLOWED_REPO = "ai-site";
const ALLOWED_REMOTE = `https://${ALLOWED_OWNER}@github.com/${ALLOWED_OWNER}/${ALLOWED_REPO}.git`;

/** push 禁止（誤って使われていたアカウント） */
const BLOCKED_ACCOUNTS = ["sgupge2624"];

const ROOT = process.cwd();

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
}

function clearCachedGitHubCredentials() {
  const deletes = [
    ["cmdkey", ["/delete:git:https://github.com"]],
    ["cmdkey", ["/delete:LegacyGeneric:target=git:https://github.com"]],
  ];
  for (const [cmd, args] of deletes) {
    try {
      run(cmd, args);
    } catch {
      /* ignore */
    }
  }
  run("git", ["credential", "reject"], {
    input: "protocol=https\nhost=github.com\n\n",
  });
}

function enforceAllowedAccount({ clearCache = false } = {}) {
  if (clearCache) {
    clearCachedGitHubCredentials();
  }

  if (!require("fs").existsSync(path.join(ROOT, ".git"))) {
    throw new Error("Git リポジトリがありません。");
  }

  // このリポジトリだけ KK260529 を使う（グローバル設定は変更しない）
  run("git", ["config", "--local", "credential.https://github.com.username", ALLOWED_OWNER]);

  const setRemote = run("git", ["remote", "set-url", "origin", ALLOWED_REMOTE]);
  if (setRemote.status !== 0) {
    run("git", ["remote", "add", "origin", ALLOWED_REMOTE]);
  }

  const remote = run("git", ["remote", "get-url", "origin"]);
  const url = (remote.stdout || "").trim();

  if (!url.includes(`${ALLOWED_OWNER}/${ALLOWED_REPO}`)) {
    throw new Error(
      `リモートが ${ALLOWED_OWNER}/${ALLOWED_REPO} ではありません。\n許可URL: ${ALLOWED_REMOTE}`
    );
  }

  for (const blocked of BLOCKED_ACCOUNTS) {
    if (url.toLowerCase().includes(blocked.toLowerCase())) {
      throw new Error(`禁止されたアカウント (${blocked}) が URL に含まれています。`);
    }
  }

  return { owner: ALLOWED_OWNER, remote: ALLOWED_REMOTE, url };
}

function assertPushAllowed(output) {
  const text = String(output || "");
  for (const blocked of BLOCKED_ACCOUNTS) {
    if (text.toLowerCase().includes(`denied to ${blocked.toLowerCase()}`)) {
      throw new Error(
        `別アカウント「${blocked}」で push しようとしました。\n` +
          `このプロジェクトは ${ALLOWED_OWNER} 専用です。\n` +
          `対処: git-fix-account.bat を実行し、${ALLOWED_OWNER} の Personal Access Token でログインしてください。`
      );
    }
  }
  if (/denied to ([a-zA-Z0-9-]+)/i.test(text)) {
    const m = text.match(/denied to ([a-zA-Z0-9-]+)/i);
    const user = m?.[1];
    if (user && user.toLowerCase() !== ALLOWED_OWNER.toLowerCase()) {
      throw new Error(
        `GitHub アカウント「${user}」では push できません。${ALLOWED_OWNER} でログインし直してください。\n` +
          `git-fix-account.bat を実行してください。`
      );
    }
  }
}

module.exports = {
  ALLOWED_OWNER,
  ALLOWED_REPO,
  ALLOWED_REMOTE,
  BLOCKED_ACCOUNTS,
  enforceAllowedAccount,
  clearCachedGitHubCredentials,
  assertPushAllowed,
};
