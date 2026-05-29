#!/usr/bin/env node
/**
 * Windows に保存された GitHub 認証をクリアし、KK260529 用 remote を設定
 */
const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REMOTE = "https://KK260529@github.com/KK260529/ai-site.git";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: true, windowsHide: true });
  console.log((r.stdout || r.stderr || "").trim());
  return r.status === 0;
}

console.log("=== Clear GitHub credentials ===\n");
run("cmdkey", ["/delete:git:https://github.com"]);
run("cmdkey", ["/delete:LegacyGeneric:target=git:https://github.com"]);

console.log("\n=== Set remote ===\n");
spawnSync("git", ["remote", "set-url", "origin", REMOTE], { cwd: ROOT, encoding: "utf8", stdio: "inherit" });
spawnSync("git", ["remote", "-v"], { cwd: ROOT, encoding: "utf8", stdio: "inherit" });

console.log("\n=== Next: run git push -u origin main ===");
console.log("Login as KK260529 with Personal Access Token as password.");
console.log("Create token: https://github.com/settings/tokens (scope: repo)\n");
