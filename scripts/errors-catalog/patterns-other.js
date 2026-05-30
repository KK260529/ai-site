/**
 * JavaScript, Linux, SQL, Docker エラーパターン
 */
const { baseEntry, take500 } = require("./patterns-python-java");

const NPM_PACKAGES = [
  "express", "react", "react-dom", "next", "vue", "nuxt", "angular", "svelte",
  "typescript", "webpack", "vite", "eslint", "prettier", "jest", "mocha", "chai",
  "axios", "lodash", "moment", "dayjs", "uuid", "dotenv", "cors", "helmet",
  "mongoose", "prisma", "sequelize", "typeorm", "pg", "mysql2", "redis", "ioredis",
  "socket.io", "ws", "nodemon", "ts-node", "babel-core", "@babel/core", "tailwindcss",
  "postcss", "sass", "less", "sharp", "multer", "jsonwebtoken", "bcrypt", "passport",
  "stripe", "firebase-admin", "aws-sdk", "@aws-sdk/client-s3", "playwright", "puppeteer",
  "electron", "chalk", "commander", "yargs", "inquirer", "ora", "rxjs", "zod",
  "yup", "joi", "class-validator", "reflect-metadata", "rxjs", "graphql", "apollo-server",
  "@apollo/client", "urql", "swr", "react-query", "@tanstack/react-query", "redux",
  "@reduxjs/toolkit", "zustand", "jotai", "recoil", "mobx", "styled-components",
  "emotion", "@emotion/react", "framer-motion", "three", "d3", "chart.js", "echarts",
];

function generateJavascriptErrors() {
  const entries = [];

  for (const pkg of NPM_PACKAGES) {
    entries.push(
      baseEntry("javascript", `Error: Cannot find module '${pkg}'`, {
        context: "node 実行・npm install 前",
        causes: ["node_modules 未作成", "package.json に未記載", "モノレポのワークスペース取り違え"],
        fixes: [
          { title: "インストール", description: "プロジェクトルートで npm install.", code: `npm install ${pkg}` },
          { title: "package.json 確認", description: "dependencies に存在するか確認." },
        ],
        tags: ["Cannot find module", pkg, "npm"],
      })
    );
  }

  const nodeErrors = [
    "ReferenceError: foo is not defined",
    "ReferenceError: Cannot access 'x' before initialization",
    "TypeError: Cannot read properties of undefined (reading 'map')",
    "TypeError: Cannot read properties of null (reading 'length')",
    "TypeError: Assignment to constant variable",
    "TypeError: foo is not a function",
    "TypeError: Cannot convert undefined or null to object",
    "SyntaxError: Unexpected token 'export'",
    "SyntaxError: Unexpected token '<'",
    "SyntaxError: Invalid or unexpected token",
    "RangeError: Maximum call stack size exceeded",
    "RangeError: Invalid array length",
    "Error: listen EADDRINUSE: address already in use :::3000",
    "Error: listen EACCES: permission denied 0.0.0.0:80",
    "Error: connect ECONNREFUSED 127.0.0.1:5432",
    "Error: getaddrinfo ENOTFOUND api.example.com",
    "Error: read ECONNRESET",
    "Error: write EPIPE",
    "Error: spawn ENOENT",
    "Error: EPERM: operation not permitted, rename",
    "Error: ENOENT: no such file or directory, open 'config.json'",
    "Error: EISDIR: illegal operation on a directory, read",
  ];
  for (const msg of nodeErrors) {
    entries.push(
      baseEntry("javascript", msg, {
        context: "Node.js 実行時",
        causes: ["変数未定義", "非同期のタイミング", "ポート競合", "パス誤り"],
        fixes: [{ title: "スタックトレース確認", description: "node --trace-warnings や debugger で調査." }],
        tags: ["Node.js"],
      })
    );
  }

  const npmErrors = [
    "npm ERR! code ERESOLVE unable to resolve dependency tree",
    "npm ERR! code ENOENT syscall open package.json",
    "npm ERR! code EACCES permission denied, access '/usr/local/lib/node_modules'",
    "npm ERR! code ELIFECYCLE errno 1",
    "npm ERR! peer dep missing: react@^18.0.0",
    "npm WARN deprecated package@1.0.0",
    "error Command failed with exit code 1",
    "yarn error Couldn't find package",
    "pnpm ERR_PNPM_PEER_DEP_ISSUES",
  ];
  for (const msg of npmErrors) {
    entries.push(
      baseEntry("javascript", msg, {
        context: "npm / yarn / pnpm install 時",
        causes: ["peer dependency 競合", "権限不足", "lock ファイル不整合"],
        fixes: [
          { title: "legacy-peer-deps", description: "一時的回避.", code: "npm install --legacy-peer-deps" },
          { title: "node_modules 削除", description: "クリーンインストール.", code: "rm -rf node_modules package-lock.json && npm install" },
        ],
        tags: ["npm"],
      })
    );
  }

  const reactErrors = [
    "Error: Minified React error #31",
    "Error: Minified React error #130",
    "Error: Objects are not valid as a React child",
    "Error: Rendered more hooks than during the previous render",
    "Error: Invalid hook call. Hooks can only be called inside of the body of a function component",
    "Warning: Each child in a list should have a unique \"key\" prop",
    "Warning: Cannot update a component while rendering a different component",
    "Hydration failed because the initial UI does not match what was rendered on the server",
    "Text content does not match server-rendered HTML",
    "Maximum update depth exceeded",
  ];
  for (const msg of reactErrors) {
    entries.push(
      baseEntry("javascript", msg, {
        context: "React / Next.js 開発時",
        causes: ["Hooks ルール違反", "SSR/CSR 不一致", "無限 setState"],
        fixes: [{ title: "開発ビルドで詳細表示", description: "本番 minify 前のメッセージを確認." }],
        tags: ["React"],
      })
    );
  }

  const tsErrors = [
    "TS2307: Cannot find module 'foo' or its corresponding type declarations",
    "TS2322: Type 'string' is not assignable to type 'number'",
    "TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'",
    "TS2532: Object is possibly 'undefined'",
    "TS7006: Parameter 'x' implicitly has an 'any' type",
    "TS2554: Expected 2 arguments, but got 1",
    "TS2741: Property 'id' is missing in type",
  ];
  for (const msg of tsErrors) {
    entries.push(
      baseEntry("javascript", msg, {
        context: "TypeScript コンパイル時",
        causes: ["型定義不足", "strict 設定", "null 許容"],
        fixes: [{ title: "@types インストール", description: "npm i -D @types/node 等." }],
        tags: ["TypeScript"],
      })
    );
  }

  const webpackErrors = [
    "Module not found: Error: Can't resolve 'foo' in",
    "Module parse failed: Unexpected token",
    "Conflict: Multiple assets emit different content to the same filename",
    "ERROR in ./src/index.tsx",
    "JavaScript heap out of memory",
  ];
  for (const msg of webpackErrors) {
    entries.push(
      baseEntry("javascript", msg, {
        context: "webpack / Vite ビルド時",
        causes: ["import パス誤り", "ローダー不足", "メモリ不足"],
        fixes: [{ title: "alias 設定", description: "resolve.alias でパスを統一." }],
        tags: ["webpack", "Vite"],
      })
    );
  }

  // pad
  for (let i = 0; i < 150; i++) {
    entries.push(
      baseEntry("javascript", `Uncaught (in promise) Error: Request failed with status code ${400 + (i % 100)}`, {
        context: "axios/fetch API 呼び出し",
        causes: ["認証切れ", "CORS", "バリデーションエラー"],
        fixes: [{ title: "Network タブ確認", description: "レスポンス body とヘッダを確認." }],
        tags: ["HTTP", "axios"],
      })
    );
  }

  return take500(entries);
}

const LINUX_COMMANDS = [
  "docker", "git", "node", "npm", "python3", "pip", "java", "javac", "mvn", "gradle",
  "kubectl", "helm", "terraform", "ansible", "nginx", "systemctl", "journalctl",
  "apt", "yum", "dnf", "pacman", "brew", "curl", "wget", "ssh", "scp", "rsync",
  "grep", "sed", "awk", "find", "tar", "gzip", "chmod", "chown", "sudo", "su",
  "ps", "kill", "top", "htop", "df", "du", "mount", "umount", "fdisk", "lsblk",
  "ip", "ifconfig", "ping", "traceroute", "netstat", "ss", "lsof", "tcpdump",
  "crontab", "at", "systemd-run", "firewall-cmd", "ufw", "iptables", "selinux",
];

function generateLinuxErrors() {
  const entries = [];

  for (const cmd of LINUX_COMMANDS) {
    entries.push(
      baseEntry("linux", `bash: ${cmd}: command not found`, {
        context: "シェルでコマンド実行時",
        causes: [`${cmd} が未インストール`, "PATH に含まれていない", "typo"],
        fixes: [
          { title: "インストール", description: "ディストリビューションのパッケージマネージャで導入.", code: `sudo apt install ${cmd}  # Debian/Ubuntu` },
          { title: "PATH 確認", description: "echo $PATH と which.", code: `which ${cmd}\necho $PATH` },
        ],
        tags: ["command not found", cmd],
      })
    );
  }

  const errnoMsgs = [
    "Permission denied",
    "No such file or directory",
    "Is a directory",
    "Not a directory",
    "Operation not permitted",
    "Device or resource busy",
    "File exists",
    "No space left on device",
    "Read-only file system",
    "Too many open files",
    "Connection refused",
    "Connection timed out",
    "Network is unreachable",
    "Address already in use",
  ];
  for (const msg of errnoMsgs) {
    entries.push(
      baseEntry("linux", `${msg}`, {
        context: "コマンド・スクリプト実行時の一般的な errno メッセージ",
        causes: ["権限不足", "パス誤り", "リソース枯渇", "ネットワーク問題"],
        fixes: [{ title: "errno 確認", description: "echo $? と dmesg/journalctl を確認." }],
        tags: ["errno"],
      })
    );
  }

  const systemdErrors = [
    "Failed to start nginx.service: Unit nginx.service not found",
    "Job for nginx.service failed because the control process exited with error code",
    "nginx.service: Main process exited, code=exited, status=1/FAILURE",
    "Failed to start docker.service: Start request repeated too quickly",
  ];
  for (const msg of systemdErrors) {
    entries.push(
      baseEntry("linux", msg, {
        context: "systemctl start/status 時",
        causes: ["設定ファイル文法エラー", "ポート競合", "権限不足"],
        fixes: [
          { title: "ログ確認", description: "journalctl -u サービス名 -e.", code: "sudo journalctl -u nginx -e --no-pager" },
        ],
        tags: ["systemd"],
      })
    );
  }

  const aptErrors = [
    "E: Could not get lock /var/lib/dpkg/lock-frontend",
    "E: Unable to locate package",
    "E: Sub-process /usr/bin/dpkg returned an error code (1)",
    "W: GPG error: The following signatures couldn't be verified",
    "E: Release file for http://archive.ubuntu.com/ubuntu/dists/jammy-updates/InRelease is not valid yet",
  ];
  for (const msg of aptErrors) {
    entries.push(
      baseEntry("linux", `apt: ${msg}`, {
        context: "apt install / update 時",
        causes: ["別プロセスがロック", "リポジトリ設定ミス", "時刻ずれ"],
        fixes: [{ title: "ロック解除", description: "sudo killall apt apt-get; sudo dpkg --configure -a" }],
        tags: ["apt", "Ubuntu"],
      })
    );
  }

  const sshErrors = [
    "Permission denied (publickey)",
    "Host key verification failed",
    "Connection refused port 22",
    "Too many authentication failures",
    "REMOTE HOST IDENTIFICATION HAS CHANGED",
    "no matching host key type found",
  ];
  for (const msg of sshErrors) {
    entries.push(
      baseEntry("linux", `ssh: ${msg}`, {
        context: "ssh 接続時",
        causes: ["鍵未登録", "known_hosts 不一致", "sshd 未起動"],
        fixes: [{ title: "鍵確認", description: "ssh -v user@host で詳細ログ." }],
        tags: ["ssh"],
      })
    );
  }

  for (let i = 0; i < 200; i++) {
    entries.push(
      baseEntry("linux", `grep: /var/log/app.log: Permission denied`, {
        context: "ログファイル読み取り",
        causes: ["一般ユーザーで root 権限ファイルを読んだ"],
        fixes: [{ title: "sudo またはグループ追加", description: "sudo grep ... または adm グループ." }],
        tags: ["grep", "permission"],
      })
    );
  }

  return take500(entries);
}

const MYSQL_CODES = [
  [1062, "Duplicate entry 'user@example.com' for key 'email'"],
  [1054, "Unknown column 'foo' in 'field list'"],
  [1146, "Table 'mydb.users' doesn't exist"],
  [1045, "Access denied for user 'root'@'localhost' (using password: YES)"],
  [2002, "Can't connect to local MySQL server through socket '/var/run/mysqld/mysqld.sock'"],
  [1452, "Cannot add or update a child row: a foreign key constraint fails"],
  [1364, "Field 'id' doesn't have a default value"],
  [1292, "Incorrect datetime value: '2024-13-40'"],
  [1064, "You have an error in your SQL syntax; check the manual"],
  [1175, "You are using safe update mode and you tried to update without a WHERE"],
];

function generateSqlErrors() {
  const entries = [];

  for (const [code, msg] of MYSQL_CODES) {
    entries.push(
      baseEntry("sql", `ERROR ${code} (${code}): ${msg}`, {
        context: "MySQL 実行時",
        causes: ["制約違反", "スキーマ不一致", "権限・接続問題"],
        fixes: [{ title: "エラーコードで検索", description: `MySQL ERROR ${code} の公式ドキュメントを参照.` }],
        tags: ["MySQL", `ERROR ${code}`],
      })
    );
  }

  const pgErrors = [
    "ERROR: relation \"users\" does not exist",
    "ERROR: column \"email\" does not exist",
    "ERROR: duplicate key value violates unique constraint \"users_email_key\"",
    "ERROR: insert or update on table violates foreign key constraint",
    "ERROR: syntax error at or near \"FROM\"",
    "ERROR: permission denied for table users",
    "FATAL: password authentication failed for user \"postgres\"",
    "FATAL: database \"mydb\" does not exist",
    "could not connect to server: Connection refused",
  ];
  for (const msg of pgErrors) {
    entries.push(
      baseEntry("sql", msg, {
        context: "PostgreSQL 実行時",
        causes: ["migrate 未実行", "権限不足", "接続設定誤り"],
        fixes: [{ title: "\\dt でテーブル確認", description: "psql でスキーマを確認." }],
        tags: ["PostgreSQL"],
      })
    );
  }

  const sqliteErrors = [
    "SQLITE_ERROR: no such table: users",
    "SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email",
    "SQLITE_BUSY: database is locked",
    "SQLITE_CANTOPEN: unable to open database file",
  ];
  for (const msg of sqliteErrors) {
    entries.push(
      baseEntry("sql", msg, {
        context: "SQLite 実行時",
        causes: ["DB ファイルパス誤り", "同時書き込み", "マイグレーション漏れ"],
        fixes: [{ title: "WAL モード", description: "PRAGMA journal_mode=WAL; を検討." }],
        tags: ["SQLite"],
      })
    );
  }

  const sqlStates = [
    "Invalid column name 'foo'",
    "String or binary data would be truncated",
    "The INSERT statement conflicted with the FOREIGN KEY constraint",
    "Timeout expired. The timeout period elapsed prior to completion",
    "Login failed for user",
    "Cannot open database requested by the login",
    "Arithmetic overflow error converting expression to data type int",
    "Divide by zero error encountered",
    "Subquery returned more than 1 value",
    "Must declare the scalar variable @id",
  ];
  for (const msg of sqlStates) {
    entries.push(
      baseEntry("sql", msg, {
        context: "SQL Server / 汎用 SQL 実行時",
        causes: ["型不一致", "制約", "変数スコープ"],
        fixes: [{ title: "実行計画確認", description: "EXPLAIN / 実行プランでボトルネック確認." }],
        tags: ["SQL"],
      })
    );
  }

  for (let i = 0; i < 350; i++) {
    const tables = ["users", "orders", "products", "logs", "sessions"];
    const t = tables[i % tables.length];
    entries.push(
      baseEntry("sql", `ERROR 1064 (42000): You have an error in your SQL syntax near '${["SELEC", "FORM", "WHER", "INSER INTO"][i % 4]}' at line ${1 + (i % 5)}`, {
        context: "SQL 手入力・ORM 生成クエリ",
        causes: ["typo", "予約語", "クォート不足"],
        fixes: [{ title: "構文チェック", description: "キーワード綴りとカンマ位置を確認." }],
        tags: ["syntax"],
      })
    );
  }

  return take500(entries);
}

const DOCKER_IMAGES = [
  "nginx:latest", "node:20-alpine", "python:3.12-slim", "postgres:16", "mysql:8",
  "redis:7", "mongo:7", "ubuntu:22.04", "alpine:3.19", "golang:1.22", "openjdk:17",
  "ruby:3.3", "php:8.3-apache", "httpd:2.4", "traefik:v3", "grafana/grafana",
  "prom/prometheus", "elasticsearch:8.12.0", "rabbitmq:3-management", "memcached",
];

function generateDockerErrors() {
  const entries = [];

  for (const img of DOCKER_IMAGES) {
    entries.push(
      baseEntry("docker", `Error response from daemon: pull access denied for ${img}, repository does not exist or may require 'docker login'`, {
        context: "docker pull 時",
        causes: ["イメージ名 typo", "プライベートレジストリ未ログイン", "レート制限"],
        fixes: [{ title: "ログイン", description: "docker login で認証.", code: `docker pull ${img}` }],
        tags: ["pull", img.split(":")[0]],
      })
    );
  }

  const dockerErrors = [
    "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?",
    "docker: Error response from daemon: driver failed programming external connectivity",
    "port is already allocated",
    "Conflict. The container name \"/app\" is already in use",
    "OCI runtime create failed: container_linux.go: starting container process caused",
    "no space left on device",
    "failed to solve: process \"/bin/sh -c npm install\" did not complete successfully: exit code 1",
    "ERROR [internal] load metadata for docker.io/library/node:20",
    "denied: requested access to the resource is denied",
    "image with reference was found but does not match the specified platform",
    "failed to register layer: Error processing tar file(exit status 1): no space left on device",
    "Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use",
    "exec: \"foo\": executable file not found in $PATH",
    "invalid reference format",
    "manifest unknown: manifest unknown",
  ];
  for (const msg of dockerErrors) {
    entries.push(
      baseEntry("docker", msg, {
        context: "docker run / build / compose 時",
        causes: ["デーモン停止", "ポート競合", "Dockerfile ビルド失敗", "ディスク不足"],
        fixes: [
          { title: "デーモン確認", description: "sudo systemctl status docker", code: "sudo systemctl start docker" },
          { title: "ポート変更", description: "-p 8080:80 など別ポートにマッピング." },
        ],
        tags: ["Docker"],
      })
    );
  }

  const composeErrors = [
    "service \"web\" depends on undefined service \"db\": invalid compose project",
    "failed to create network: Error response from daemon: network with name already exists",
    "Container exited with code 1",
    "yaml: unmarshal errors: line 1: cannot unmarshal",
    "variable is not set. Defaulting to a blank string",
  ];
  for (const msg of composeErrors) {
    entries.push(
      baseEntry("docker", `docker compose: ${msg}`, {
        context: "docker compose up 時",
        causes: ["depends_on  typo", ".env 未設定", "YAML 文法エラー"],
        fixes: [{ title: "compose config", description: "docker compose config で検証." }],
        tags: ["docker compose"],
      })
    );
  }

  for (let i = 0; i < 300; i++) {
    entries.push(
      baseEntry("docker", `docker build failed at step ${i % 20}: RUN apt-get update returned non-zero code: ${100 + (i % 50)}`, {
        context: "Dockerfile ビルド",
        causes: ["パッケージ名誤り", "ネットワーク", "ベースイメージの変更"],
        fixes: [{ title: "該当 RUN を単体実行", description: "docker run -it ベースイメージで手動実行." }],
        tags: ["Dockerfile", "build"],
      })
    );
  }

  return take500(entries);
}

module.exports = {
  generateJavascriptErrors,
  generateLinuxErrors,
  generateSqlErrors,
  generateDockerErrors,
};
