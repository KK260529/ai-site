/**
 * Git, HTTP, nginx, Bash エラーパターン
 */
const { baseEntry, take500 } = require("./patterns-python-java");

function generateGitErrors() {
  const entries = [];

  const gitErrors = [
    "fatal: not a git repository (or any of the parent directories): .git",
    "fatal: remote origin already exists",
    "fatal: refusing to merge unrelated histories",
    "fatal: Need to specify how to reconcile divergent branches",
    "fatal: Authentication failed for 'https://github.com/user/repo.git'",
    "fatal: could not read Username for 'https://github.com': terminal prompts disabled",
    "fatal: unable to access 'https://github.com/': SSL certificate problem: unable to get local issuer certificate",
    "error: failed to push some refs to 'origin'",
    "error: src refspec main does not match any",
    "error: Your local changes to the following files would be overwritten by merge",
    "error: The following untracked working tree files would be overwritten by merge",
    "error: pathspec 'foo' did not match any file(s) known to git",
    "error: cannot lock ref 'refs/heads/main': is at abc123 but expected def456",
    "error: RPC failed; HTTP 408 curl 22 The requested URL returned error: 408",
    "error: RPC failed; curl 56 GnuTLS recv error (-54): Error in the pull function",
    "hint: You have divergent branches and need to specify how to reconcile them",
    "hint: Updates were rejected because the remote contains work that you do not have locally",
    "CONFLICT (content): Merge conflict in README.md",
    "CONFLICT (modify/delete): file.txt deleted in HEAD and modified in branch",
    "Automatic merge failed; fix conflicts and then commit the result",
    "You are in 'detached HEAD' state",
    "HEAD detached at v1.0.0",
    "warning: LF will be replaced by CRLF in file.txt",
    "fatal: bad object HEAD",
    "fatal: ambiguous argument 'main': unknown revision or path not in the working tree",
    "fatal: sha1 file '.git/objects/xx/xxx' write error. Out of diskspace",
    "fatal: index file smaller than expected",
    "fatal: Unable to create '.git/index.lock': File exists",
    "error: invalid object name 'HEAD'",
    "error: cannot rebase: You have unstaged changes",
    "error: cannot rebase: Your index contains uncommitted changes",
    "fatal: No rebase in progress?",
    "fatal: It seems that there is already a rebase-merge directory",
  ];
  for (const msg of gitErrors) {
    entries.push(
      baseEntry("git", msg, {
        context: "git clone / pull / push / merge / rebase 時",
        causes: ["リモートと履歴不一致", "認証・SSH 鍵", "コンフリクト未解決", "作業ツリー汚れ"],
        fixes: [
          { title: "status 確認", description: "git status で状態把握.", code: "git status\ngit log --oneline -5" },
          { title: "pull --rebase", description: "履歴を整理.", code: "git pull --rebase origin main" },
        ],
        tags: ["Git"],
      })
    );
  }

  const githubErrors = [
    "remote: Repository not found",
    "remote: Support for password authentication was removed",
    "remote: error: GH001: Large files detected",
    "remote: Permission to user/repo.git denied to otheruser",
    "remote: Invalid username or token",
    "error: GH006: Protected branch update failed",
    "Pull request is not mergeable",
    "Checks have failed",
  ];
  for (const msg of githubErrors) {
    entries.push(
      baseEntry("git", `GitHub: ${msg}`, {
        context: "GitHub push / PR 時",
        causes: ["リポジトリ権限", "PAT 期限切れ", "ブランチ保護", "LFS 大ファイル"],
        fixes: [{ title: "PAT / SSH 確認", description: "Settings → Developer settings → Personal access tokens." }],
        tags: ["GitHub"],
      })
    );
  }

  const branches = ["main", "master", "develop", "feature/login", "release/1.0", "hotfix/urgent"];
  for (let i = 0; i < 400; i++) {
    const b = branches[i % branches.length];
    entries.push(
      baseEntry("git", `error: failed to push some refs to 'origin'. Updates were rejected because a pushed branch '${b}' is behind its remote counterpart`, {
        context: `git push origin ${b}`,
        causes: ["リモートに先行コミットあり", "force push 禁止"],
        fixes: [{ title: "pull してから push", description: "git pull --rebase origin " + b, code: `git pull --rebase origin ${b}\ngit push origin ${b}` }],
        tags: ["push rejected", b],
      })
    );
  }

  return take500(entries);
}

function generateHttpErrors() {
  const entries = [];

  const statusDetails = {
    400: ["Bad Request", "Invalid JSON body", "Missing required field 'email'"],
    401: ["Unauthorized", "Invalid token", "Token expired"],
    403: ["Forbidden", "Insufficient permissions", "CSRF token mismatch"],
    404: ["Not Found", "Route /api/users/999 not found", "Cannot GET /foo"],
    405: ["Method Not Allowed", "POST not supported for /health"],
    408: ["Request Timeout"],
    409: ["Conflict", "Resource already exists"],
    413: ["Payload Too Large", "Request entity too large"],
    415: ["Unsupported Media Type", "Content-Type must be application/json"],
    422: ["Unprocessable Entity", "Validation failed"],
    429: ["Too Many Requests", "Rate limit exceeded"],
    500: ["Internal Server Error", "NullPointerException in handler"],
    502: ["Bad Gateway", "upstream sent invalid response"],
    503: ["Service Unavailable", "Server overloaded"],
    504: ["Gateway Timeout", "upstream timed out"],
  };

  for (const [code, details] of Object.entries(statusDetails)) {
    for (const detail of details) {
      entries.push(
        baseEntry("http", `HTTP ${code} ${detail}`, {
          context: "REST API / ブラウザ通信",
          causes: ["クライアントリクエスト不正", "認証・認可", "サーバー/upstream 障害"],
          fixes: [
            { title: "レスポンス body 確認", description: "curl -i でヘッダと JSON エラーを確認.", code: `curl -i https://api.example.com/endpoint` },
          ],
          tags: [`HTTP ${code}`, "API"],
        })
      );
    }
  }

  const corsErrors = [
    "Access to fetch at 'https://api.example.com' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header",
    "CORS policy: Response to preflight request doesn't pass access control check",
    "CORS policy: The request client is not a secure context",
    "has been blocked by CORS policy: Request header field authorization is not allowed",
  ];
  for (const msg of corsErrors) {
    entries.push(
      baseEntry("http", msg, {
        context: "ブラウザ fetch / axios 時",
        causes: ["サーバー側 CORS 未設定", "preflight OPTIONS 未対応", "credentials 設定不一致"],
        fixes: [{ title: "サーバーで CORS ヘッダ", description: "Access-Control-Allow-Origin を設定." }],
        tags: ["CORS"],
      })
    );
  }

  const sslErrors = [
    "SSL certificate problem: unable to get local issuer certificate",
    "certificate verify failed: Hostname mismatch",
    "ERR_CERT_AUTHORITY_INVALID",
    "ERR_CERT_DATE_INVALID",
    "NET::ERR_CERT_COMMON_NAME_INVALID",
    "unable to verify the first certificate",
  ];
  for (const msg of sslErrors) {
    entries.push(
      baseEntry("http", msg, {
        context: "HTTPS 接続時",
        causes: ["自己署名証明書", "証明書期限切れ", "中間証明書不足"],
        fixes: [{ title: "証明書チェーン確認", description: "openssl s_client -connect host:443." }],
        tags: ["SSL", "TLS"],
      })
    );
  }

  const apiErrors = [
    '{"error":"invalid_grant","error_description":"Bad credentials"}',
    '{"message":"Invalid API key provided"}',
    '{"code":"rate_limit_exceeded","message":"Too many requests"}',
    '{"errors":[{"field":"email","message":"is invalid"}]}',
    "GraphQL error: Cannot query field 'foo' on type 'Query'",
    "JSON parse error: Unexpected character (<) at line 1 column 1",
  ];
  for (const msg of apiErrors) {
    entries.push(
      baseEntry("http", msg, {
        context: "外部 API 連携",
        causes: ["API キー誤り", "レスポンスが HTML エラーページ", "スキーマ不一致"],
        fixes: [{ title: "生レスポンス保存", description: "console.log(await response.text()) で確認." }],
        tags: ["API"],
      })
    );
  }

  for (let i = 0; i < 350; i++) {
    entries.push(
      baseEntry("http", `FetchError: request to https://api.example.com/v${i % 5}/resource failed, reason: connect ECONNREFUSED 127.0.0.1:${3000 + (i % 100)}`, {
        context: "Node fetch / axios",
        causes: ["サーバー未起動", "ポート/firewall", "localhost 取り違え"],
        fixes: [{ title: "サーバー起動確認", description: "curl localhost:PORT/health." }],
        tags: ["ECONNREFUSED"],
      })
    );
  }

  return take500(entries);
}

function generateNginxErrors() {
  const entries = [];

  const nginxErrors = [
    "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)",
    "nginx: [emerg] open() \"/etc/nginx/nginx.conf\" failed (2: No such file or directory)",
    "nginx: [emerg] unknown directive \"proxy_passs\" in /etc/nginx/conf.d/app.conf:12",
    "nginx: [emerg] \"server\" directive is not allowed here in /etc/nginx/nginx.conf:45",
    "nginx: [emerg] no \"ssl_certificate\" is defined for the \"listen ... ssl\" directive",
    "nginx: [emerg] cannot load certificate \"/etc/letsencrypt/live/example.com/fullchain.pem\"",
    "nginx: [warn] conflicting server name \"example.com\" on 0.0.0.0:80, ignored",
    "nginx: configuration file /etc/nginx/nginx.conf test failed",
    "502 Bad Gateway",
    "504 Gateway Time-out",
    "413 Request Entity Too Large",
    "499 Client Closed Request",
    "upstream prematurely closed connection while reading response header from upstream",
    "connect() failed (111: Connection refused) while connecting to upstream",
    "no live upstreams while connecting to upstream",
    "upstream sent too big header while reading response header from upstream",
    "client intended to send too large body",
    "rewrite or internal redirection cycle while internally redirecting to \"/index.html\"",
  ];
  for (const msg of nginxErrors) {
    entries.push(
      baseEntry("nginx", msg, {
        context: "nginx 起動・リバースプロキシ",
        causes: ["設定文法エラー", "upstream 未起動", "SSL 設定不足", "バッファサイズ不足"],
        fixes: [
          { title: "設定テスト", description: "nginx -t.", code: "sudo nginx -t\nsudo systemctl reload nginx" },
          { title: "エラーログ", description: "tail -f /var/log/nginx/error.log." },
        ],
        tags: ["nginx"],
      })
    );
  }

  const logLines = [
    "[error] 12345#0: *1 connect() failed (111: Connection refused) while connecting to upstream, client: 1.2.3.4, server: example.com, request: \"GET /api HTTP/1.1\", upstream: \"http://127.0.0.1:3000/api\"",
    "[error] 12345#0: *2 upstream timed out (110: Connection timed out) while reading response header from upstream",
    "[error] 12345#0: *3 open() \"/var/www/html/favicon.ico\" failed (2: No such file or directory)",
    "[crit] 12345#0: *4 SSL_do_handshake() failed (SSL: error:141CF086:SSL routines:tls_process_server_certificate:certificate verify failed)",
  ];
  for (const msg of logLines) {
    entries.push(
      baseEntry("nginx", msg, {
        context: "nginx error.log",
        causes: ["バックエンドダウン", "タイムアウト", "静的ファイル欠落", "SSL 検証失敗"],
        fixes: [{ title: "upstream 確認", description: "curl 127.0.0.1:バックエンドポート." }],
        tags: ["error.log"],
      })
    );
  }

  for (let i = 0; i < 400; i++) {
    entries.push(
      baseEntry("nginx", `nginx: [emerg] duplicate location \"/api\" in /etc/nginx/sites-enabled/app-${i % 50}.conf:${10 + (i % 20)}`, {
        context: "nginx -t / reload 時",
        causes: ["location ブロック重複", "include ファイルの二重読み込み"],
        fixes: [{ title: "grep location", description: "grep -r 'location /api' /etc/nginx/." }],
        tags: ["location", "config"],
      })
    );
  }

  return take500(entries);
}

function generateBashErrors() {
  const entries = [];

  const bashErrors = [
    "bash: line 1: syntax error near unexpected token `('",
    "bash: line 5: syntax error near unexpected token `fi'",
    "bash: ./script.sh: Permission denied",
    "bash: ./script.sh: /bin/bash^M: bad interpreter: No such file or directory",
    ": integer expression expected",
    "[: missing `]'",
    "local: can only be used in a function",
    "export: `foo bar': not a valid identifier",
    "unbound variable",
    "set: illegal option -",
    "wait: pid 12345 is not a child of this shell",
    "kill: (12345) - No such process",
    "command not found",
    "No such file or directory",
    "Argument list too long",
    "Too many arguments",
    "division by 0",
    "value too great for base",
  ];
  for (const msg of bashErrors) {
    entries.push(
      baseEntry("bash", `bash: ${msg}`, {
        context: "シェルスクリプト実行",
        causes: ["文法エラー", "CRLF 改行", "実行権限なし", "set -u で未設定変数"],
        fixes: [
          { title: "bash -n 構文チェック", description: "bash -n script.sh.", code: "bash -n script.sh\nshellcheck script.sh" },
          { title: "dos2unix", description: "Windows 改行を変換.", code: "dos2unix script.sh\nchmod +x script.sh" },
        ],
        tags: ["bash"],
      })
    );
  }

  const exitCodes = [
    [1, "General error"],
    [2, "Misuse of shell builtins"],
    [126, "Command invoked cannot execute"],
    [127, "Command not found"],
    [128, "Invalid exit argument"],
    [130, "Script terminated by Ctrl+C (SIGINT)"],
    [137, "Killed (SIGKILL, often OOM)"],
    [143, "Terminated (SIGTERM)"],
  ];
  for (const [code, desc] of exitCodes) {
    entries.push(
      baseEntry("bash", `Script exited with status ${code}: ${desc}`, {
        context: "CI / cron / スクリプト終了",
        causes: ["コマンド失敗", "シグナル終了", "OOM Killer"],
        fixes: [{ title: "set -euxo pipefail", description: "失敗箇所を特定.", code: "set -euxo pipefail\n# スクリプト本体" }],
        tags: ["exit code", String(code)],
      })
    );
  }

  for (let i = 0; i < 420; i++) {
    const vars = ["$FOO", "${BAR}", "$undefined_var", "${array[@]}"];
    entries.push(
      baseEntry("bash", `line ${i + 1}: ${vars[i % vars.length]}: unbound variable`, {
        context: "set -u 有効時",
        causes: ["変数未 export", "typo", "引数未渡し"],
        fixes: [{ title: "デフォルト値", description: "${VAR:-default} 構文を使う.", code: 'echo "${VAR:-default}"' }],
        tags: ["unbound variable", "set -u"],
      })
    );
  }

  return take500(entries);
}

module.exports = {
  generateGitErrors,
  generateHttpErrors,
  generateNginxErrors,
  generateBashErrors,
};
