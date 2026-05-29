const crypto = require("crypto");
const { config } = require("../config");

const REALM = "StackShelf Admin";

function isAdminProtectionEnabled() {
  return config.isProduction;
}

function getAdminPassword() {
  return String(config.adminPassword || "").trim();
}

function getAdminUser() {
  return String(config.adminUser || "admin").trim() || "admin";
}

function validateProductionAuthConfig() {
  if (!config.isProduction) {
    return { ok: true };
  }
  const password = getAdminPassword();
  if (!password) {
    return {
      ok: false,
      message:
        "本番では ADMIN_PASSWORD が必須です。Vercel / Railway の環境変数に 12 文字以上のパスワードを設定してください。",
    };
  }
  if (password.length < 12) {
    return {
      ok: false,
      message: "ADMIN_PASSWORD は本番では 12 文字以上にしてください。",
    };
  }
  return { ok: true };
}

function safeEqualUtf8(a, b) {
  const left = Buffer.from(String(a ?? ""), "utf8");
  const right = Buffer.from(String(b ?? ""), "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }
  let decoded;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) {
    return null;
  }
  return {
    user: decoded.slice(0, sep),
    pass: decoded.slice(sep + 1),
  };
}

function verifyAdminCredentials(user, pass) {
  return safeEqualUtf8(user, getAdminUser()) && safeEqualUtf8(pass, getAdminPassword());
}

function sendUnauthorized(req, res) {
  res.set("WWW-Authenticate", `Basic realm="${REALM}", charset="UTF-8"`);
  const wantsJson =
    req.path.startsWith("/api") ||
    req.get("accept")?.includes("application/json") ||
    req.xhr;
  if (wantsJson) {
    return res.status(401).json({ error: "認証が必要です" });
  }
  return res.status(401).type("text/plain; charset=utf-8").send("認証が必要です");
}

function requireAdminAuth(req, res, next) {
  if (!isAdminProtectionEnabled()) {
    return next();
  }

  const check = validateProductionAuthConfig();
  if (!check.ok) {
    console.error("[auth]", check.message);
    return res.status(503).json({ error: "管理機能は設定不備のため無効です" });
  }

  const creds = parseBasicAuth(req.headers.authorization);
  if (creds && verifyAdminCredentials(creds.user, creds.pass)) {
    return next();
  }

  return sendUnauthorized(req, res);
}

/** 本番で公開 API として残す /api ルート */
function isPublicApiRoute(req) {
  if (!isAdminProtectionEnabled()) {
    return true;
  }
  const base = req.path.replace(/\/$/, "") || "/";
  if (req.method === "GET" && base === "/health") {
    return true;
  }
  if (req.method === "GET" && base === "/articles" && req.query.all !== "true") {
    return true;
  }
  return false;
}

function protectAdminApi(req, res, next) {
  if (isPublicApiRoute(req)) {
    return next();
  }
  return requireAdminAuth(req, res, next);
}

function assertProductionAuthReady() {
  const check = validateProductionAuthConfig();
  if (!check.ok) {
    throw new Error(check.message);
  }
}

module.exports = {
  requireAdminAuth,
  protectAdminApi,
  validateProductionAuthConfig,
  assertProductionAuthReady,
  isAdminProtectionEnabled,
};
