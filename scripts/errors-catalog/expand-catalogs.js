/**
 * 各技術のカタログを500件のユニークな具体エラーまで拡張
 */
const { baseEntry, dedupeByMessage } = require("./patterns-python-java");

function padTo500(entries, generator, tech) {
  const result = dedupeByMessage(entries);
  let i = 0;
  while (result.length < 500 && i < 10000) {
    const extra = generator(i, tech);
    if (extra) {
      const key = extra.errorMessage;
      if (!result.some((e) => e.errorMessage === key)) {
        result.push(extra);
      }
    }
    i++;
  }
  return result.slice(0, 500);
}

const expanders = {
  python(i) {
    const modules = ["requests", "pandas", "numpy", "django", "flask", "sqlalchemy", "celery", "redis"];
    const mod = modules[i % modules.length];
    const variants = [
      `urllib.error.URLError: <urlopen error [Errno 11001] getaddrinfo failed>`,
      `requests.exceptions.ConnectionError: HTTPSConnectionPool(host='api-${i}.example.com', port=443): Max retries exceeded`,
      `requests.exceptions.HTTPError: 404 Client Error: Not Found for url: https://api.example.com/v${i}/users`,
      `pandas.errors.EmptyDataError: No columns to parse from file at path 'data_${i}.csv'`,
      `pandas.errors.ParserError: Error tokenizing data. C error: Expected ${i + 1} fields in line ${i + 2}, saw ${i + 3}`,
      `django.db.utils.ProgrammingError: column users.field_${i} does not exist`,
      `flask.cli.NoAppException: Could not locate a Flask application. Use the 'flask --app' option`,
      `sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) database is locked`,
      `celery.exceptions.NotRegistered: '${mod}.tasks.job_${i}' is not registered`,
      `redis.exceptions.ConnectionError: Error ${i} connecting to localhost:6379. Connection refused`,
      `json.decoder.JSONDecodeError: Expecting value: line ${1 + (i % 10)} column ${1 + (i % 5)} (char ${i})`,
      `subprocess.CalledProcessError: Command 'python script_${i}.py' returned non-zero exit status 1`,
      `TimeoutError: [Errno ${i}] Operation timed out`,
      `PermissionError: [Errno 13] Permission denied: '/tmp/app_${i}.lock'`,
      `FileExistsError: [Errno 17] File exists: '/var/data/file_${i}.txt'`,
      `IsADirectoryError: [Errno 21] Is a directory: '/home/user/project_${i}'`,
      `ChildProcessError: [Errno 10] No child processes`,
      `BlockingIOError: [Errno 11] Resource temporarily unavailable`,
      `ProcessLookupError: [Errno 3] No such process`,
    ];
    const msg = variants[i % variants.length];
    return baseEntry("python", msg, {
      context: `${mod} 利用時`,
      causes: ["ネットワーク", "ファイルパス", "DB/外部サービス"],
      fixes: [{ title: "ログとスタックトレース確認", description: "直前の操作と環境変数を確認." }],
      tags: [mod, "Python"],
    });
  },

  java(i) {
    const pkgs = ["com.example", "org.myapp", "io.service", "net.api", "app.core"];
    const pkg = pkgs[i % pkgs.length];
    const classes = ["UserService", "OrderController", "PaymentClient", "AuthFilter", "DataRepository"];
    const cls = classes[i % classes.length];
    const variants = [
      `java.lang.NoSuchMethodError: 'void ${pkg}.${cls}.process(int)'`,
      `java.lang.NoClassDefFoundError: ${pkg.replace(/\./g, "/")}/${cls}`,
      `java.lang.ClassCastException: class ${pkg}.dto.UserDto cannot be cast to class ${pkg}.entity.User`,
      `java.lang.IllegalStateException: Session/EntityManager is closed at ${pkg}.${cls}.java:${100 + i}`,
      `java.lang.IllegalArgumentException: Invalid UUID string: id-${i}`,
      `java.util.concurrent.CompletionException: java.lang.RuntimeException: async task ${i} failed`,
      `java.util.NoSuchElementException: No value present at ${pkg}.${cls}.java:${50 + i}`,
      `org.springframework.web.bind.MethodArgumentNotValidException: Validation failed for argument [${i}]`,
      `org.springframework.dao.DataIntegrityViolationException: could not execute statement; SQL [n/a]; constraint [uk_email_${i}]`,
      `org.springframework.transaction.TransactionSystemException: Could not roll back JPA transaction`,
      `org.hibernate.LazyInitializationException: could not initialize proxy [${pkg}.entity.Order#${i}] - no Session`,
      `org.hibernate.exception.SQLGrammarException: could not extract ResultSet`,
      `java.net.SocketTimeoutException: Read timed out after ${5000 + i}ms connecting to api.example.com:443`,
      `javax.net.ssl.SSLHandshakeException: PKIX path building failed: unable to find valid certification path`,
      `java.io.FileNotFoundException: ${pkg}/config/app-${i}.properties (No such file or directory)`,
    ];
    return baseEntry("java", variants[i % variants.length], {
      context: "Spring / Hibernate / 非同期処理",
      causes: ["バージョン不一致", "トランザクション境界", "SSL/ネットワーク"],
      fixes: [{ title: "Caused by を辿る", description: "スタックトレースの根本原因を確認." }],
      tags: ["Java", cls],
    });
  },

  javascript(i) {
    const variants = [
      `TypeError: Cannot read properties of undefined (reading '${["id", "name", "data", "length", "map"][i % 5]}')`,
      `ReferenceError: ${["React", "Vue", "process", "window", "document"][i % 5]} is not defined`,
      `SyntaxError: Unexpected token '}' at line ${i + 1}`,
      `Error: ENOENT: no such file or directory, open 'src/components/Widget${i}.tsx'`,
      `Error: EACCES: permission denied, mkdir '/app/dist/chunk-${i}'`,
      `ViteError: Failed to resolve import "./utils/helper-${i}" from "src/main.ts"`,
      `Next.js Error: Page "/api/users/${i}" is missing exported function "GET"`,
      `UnhandledPromiseRejectionWarning: Error: Async operation ${i} failed`,
      `MongoServerError: E11000 duplicate key error collection: app.users index: email_${i}`,
      `PrismaClientKnownRequestError: Unique constraint failed on the fields: (email)`,
      `JWTExpired: "exp" claim timestamp check failed at token-${i}`,
      `FirebaseError: Firebase: Error (auth/invalid-api-key-${i})`,
      `AggregateError: ${i} errors occurred during batch request`,
      `DOMException: Failed to execute 'fetch' on 'Window': Request cannot be constructed from a URL that includes credentials`,
    ];
    return baseEntry("javascript", variants[i % variants.length], {
      context: "Node / フロントエンド / ORM",
      causes: ["非同期", "import パス", "DB 制約"],
      fixes: [{ title: "DevTools / ターミナルログ", description: "再現手順を最小化." }],
      tags: ["JavaScript"],
    });
  },

  linux(i) {
    const files = ["/var/log/syslog", "/etc/nginx/nginx.conf", "/home/deploy/app.log", "/tmp/cache.db", "/root/.ssh/id_rsa"];
    const cmds = ["chmod", "chown", "systemctl", "journalctl", "tail", "cat", "grep", "find", "tar", "rsync"];
    const variants = [
      `${cmds[i % cmds.length]}: cannot access '${files[i % files.length]}': Permission denied`,
      `sudo: ${files[i % files.length]}: command not found`,
      `cp: cannot create regular file '/dest/file-${i}.txt': No space left on device`,
      `mv: cannot move '/src/item-${i}' to '/dest/': Directory not empty`,
      `rm: cannot remove '/var/cache/pkg-${i}': Device or resource busy`,
      `mount: /dev/sda${i % 5}: can't read superblock on /dev/sda${i % 5}`,
      `useradd: user 'appuser${i}' already exists`,
      `groupadd: group 'team${i}' already exists`,
      `crontab: errors in crontab file, can't install for user deploy${i}`,
      `iptables: Failed to initialize nft: Protocol not supported`,
      `curl: (28) Operation timed out after ${30000 + i} milliseconds with 0 bytes received`,
      `wget: unable to resolve host address 'mirror-${i}.example.com'`,
      `ping: socket: Operation not permitted`,
      `dmesg: read kernel buffer failed: Operation not permitted`,
      `kill: kill ${1000 + i} failed: no such process`,
    ];
    return baseEntry("linux", variants[i % variants.length], {
      context: "サーバー運用",
      causes: ["権限", "ディスク", "プロセス"],
      fixes: [{ title: "sudo / 所有者確認", description: "ls -la と df -h." }],
      tags: ["Linux"],
    });
  },

  sql(i) {
    const dbs = ["MySQL", "PostgreSQL", "SQL Server", "SQLite"];
    const db = dbs[i % dbs.length];
    const variants = [
      `ERROR 1142 (${1142 + (i % 10)}): ${db} command denied to user 'app'@'localhost' for table 'logs_${i}'`,
      `ERROR: canceling statement due to statement timeout on query SELECT * FROM orders_${i}`,
      `Msg ${i}, Level 16, State 1: Subquery returned more than 1 value for column col_${i}`,
      `SQLITE_BUSY: database is locked on table sessions_${i}`,
      `Deadlock found when trying to get lock; try restarting transaction on row id=${i}`,
      `Lock wait timeout exceeded; try restarting transaction on table inventory_${i}`,
      `ORA-${20000 + i}: ORA-02291: integrity constraint (APP.FK_ORDER_${i}) violated - parent key not found`,
      `ERROR: invalid input syntax for type integer: "abc-${i}"`,
      `ERROR: value too long for type character varying(${10 + (i % 50)})`,
      `Cannot insert duplicate key row in object 'dbo.Users' with unique index 'IX_Email_${i}'`,
      `Column '${["email", "status", "created_at", "user_id", "amount"][i % 5]}_${i}' cannot be null`,
      `Conversion failed when converting the nvarchar value 'item-${i}' to data type int`,
    ];
    return baseEntry("sql", variants[i % variants.length], {
      context: db,
      causes: ["制約", "タイムアウト", "型不一致"],
      fixes: [{ title: "トランザクション確認", description: "SHOW ENGINE INNODB STATUS 等." }],
      tags: [db, "SQL"],
    });
  },

  docker(i) {
    const imgs = ["node", "python", "nginx", "postgres", "redis", "mysql", "golang", "alpine"];
    const img = imgs[i % imgs.length];
    const variants = [
      `Error response from daemon: driver failed programming external connectivity on endpoint web-${i}`,
      `Error: failed to start containers: app-${i}`,
      `docker: Error response from daemon: mkdir /var/lib/docker/overlay2/xxx/merged: no space left on device`,
      `failed to solve: ${img}:3.${i}-alpine: failed to resolve source metadata for docker.io/library/${img}`,
      `container ${img}-app-${i} exited (137)`,
      `Health check failed: service "api-${i}" is unhealthy`,
      `volume mount denied: mount path /host/data-${i} is mounted read-only`,
      `network errors-${i} declared as external, but could not be found`,
      `services.api-${i}.depends_on must be a list`,
      `unable to find user appuser${i}: no matching entries in passwd file`,
      `exec /entrypoint-${i}.sh: no such file or directory`,
      `OCI runtime create failed: runc create failed: unable to start container process: exec: \"npm\": executable file not found`,
    ];
    return baseEntry("docker", variants[i % variants.length], {
      context: "Docker / Compose",
      causes: ["リソース", "設定", "イメージ"],
      fixes: [{ title: "docker logs", description: `docker logs app-${i} --tail 100` }],
      tags: ["Docker", img],
    });
  },

  git(i) {
    const branches = [`feature/task-${i}`, `bugfix/issue-${i}`, `release/${i}.0`, `hotfix/patch-${i}`];
    const files = [`src/app/Module${i}.java`, `config/settings-${i}.yaml`, `docs/guide-${i}.md`];
    const variants = [
      `CONFLICT (content): Merge conflict in ${files[i % files.length]}`,
      `error: Your branch '${branches[i % branches.length]}' has diverged from 'origin/${branches[i % branches.length]}'`,
      `fatal: couldn't find remote ref ${branches[i % branches.length]}`,
      `error: The following untracked working tree files would be overwritten by checkout: ${files[i % files.length]}`,
      `fatal: bad object refs/heads/${branches[i % branches.length]}`,
      `error: cannot lock ref 'refs/remotes/origin/${branches[i % branches.length]}': unable to resolve reference`,
      `hint: You have divergent branches and need to specify how to reconcile them. branch: ${branches[i % branches.length]}`,
      `remote: error: GH013: Repository rule violations found for refs/heads/${branches[i % branches.length]}`,
      `error: failed to push some refs to 'origin' (protected branch ${branches[i % branches.length]})`,
      `fatal: cannot do a partial commit during a merge of ${files[i % files.length]}`,
    ];
    return baseEntry("git", variants[i % variants.length], {
      context: "ブランチ運用",
      causes: ["コンフリクト", "保護ブランチ", "リモート不一致"],
      fixes: [{ title: "git diff", description: "コンフリクトマーカーを確認." }],
      tags: ["Git"],
    });
  },

  http(i) {
    const codes = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];
    const code = codes[i % codes.length];
    const paths = [`/api/v1/users/${i}`, `/api/orders/${i}`, `/webhook/callback-${i}`, `/auth/token/refresh`];
    const variants = [
      `HTTP ${code} ${["Bad Request", "Unauthorized", "Forbidden", "Not Found", "Conflict"][i % 5]} on GET ${paths[i % paths.length]}`,
      `AxiosError: Request failed with status code ${code} for ${paths[i % paths.length]}`,
      `fetch failed: ${code} ${paths[i % paths.length]} - ${["Invalid token", "Missing field", "Rate limited", "Server error"][i % 4]}`,
      `CloudFront: Request blocked. HTTP ${code} from origin`,
      `API Gateway: {"message":"Missing Authentication Token"} path ${paths[i % paths.length]}`,
      `GraphQL error: HTTP ${code} at query GetItem${i}`,
      `WebSocket connection to 'wss://stream.example.com/${i}' failed: HTTP ${code}`,
      `Preflight response for ${paths[i % paths.length]} returned HTTP ${code}`,
    ];
    return baseEntry("http", variants[i % variants.length], {
      context: "REST / GraphQL / WebSocket",
      causes: ["認証", "レート制限", "upstream"],
      fixes: [{ title: "curl -v", description: "リクエスト/レスポンスヘッダを確認." }],
      tags: [`HTTP ${code}`],
    });
  },

  nginx(i) {
    const variants = [
      `nginx: [emerg] location "/api/v${i}" is outside location "/api" in /etc/nginx/conf.d/app.conf:${10 + (i % 30)}`,
      `nginx: [emerg] invalid number of arguments in "proxy_set_header" directive in /etc/nginx/conf.d/upstream-${i}.conf:${5 + (i % 20)}`,
      `502 Bad Gateway upstream: http://127.0.0.1:${3000 + (i % 200)}/api`,
      `504 Gateway Time-out while reading response from upstream http://backend-${i}:8080`,
      `client ${100 + (i % 155)}.${i % 255}.${(i * 3) % 255}.${(i * 7) % 255} denied by server configuration on /admin`,
      `limiting requests, excess: ${1 + (i % 10)}.${i % 100} by zone "api_limit", client: 10.0.0.${i % 254}`,
      `an upstream response is buffered to a temporary file /var/cache/nginx/proxy_temp/${i}/0000000001`,
      `SSL: error:0A000412:SSL routines::sslv3 alert bad certificate for host api-${i}.example.com`,
    ];
    return baseEntry("nginx", variants[i % variants.length], {
      context: "nginx 設定・プロキシ",
      causes: ["location ネスト", "upstream ダウン", "レート制限"],
      fixes: [{ title: "nginx -t", description: "設定テスト後 reload." }],
      tags: ["nginx"],
    });
  },

  bash(i) {
    const vars = [`FOO_${i}`, `BAR_${i}`, `CONFIG_${i}`, `TOKEN_${i}`];
    const variants = [
      `script.sh: line ${i + 1}: ${vars[i % vars.length]}: unbound variable`,
      `./deploy-${i}.sh: line ${i + 2}: syntax error near unexpected token \`&&'`,
      `cron: (${i % 60} ${i % 24} * * *) CMD (/usr/local/bin/job-${i}.sh) failed with exit code ${i % 127}`,
      `find: '/var/log/app-${i}': Permission denied`,
      `tar: Error is not recoverable: exiting now on archive backup-${i}.tar.gz`,
      `awk: cmd. line:1: syntax error at or near token ${i}`,
      `sed: -e expression #1, char ${i % 50}: unknown command \`z'`,
      `xargs: unmatched single quote; by default quotes are special to xargs unless you use -0`,
    ];
    return baseEntry("bash", variants[i % variants.length], {
      context: "シェルスクリプト / cron",
      causes: ["set -u", "クォート", "cron 環境"],
      fixes: [{ title: "shellcheck", description: "shellcheck script.sh." }],
      tags: ["Bash"],
    });
  },
};

function expandCatalog(entries, tech) {
  const gen = expanders[tech];
  if (!gen) return entries.slice(0, 500);
  return padTo500(entries, gen, tech);
}

module.exports = { expandCatalog, padTo500 };
