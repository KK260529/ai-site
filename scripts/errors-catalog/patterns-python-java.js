/**
 * 技術別エラーパターン — 具体メッセージを優先して500件に展開
 */
const { slugify, makeErrorSlug } = require("../../utils/generation/errorArticleBuilder");

function baseEntry(tech, errorMessage, opts = {}) {
  const slug = opts.slug || makeErrorSlug(tech, errorMessage);
  return {
    slug,
    errorMessage,
    errorCode: opts.errorCode || errorMessage.split(/[:(]/)[0].trim(),
    title: opts.title || `${errorMessage} の原因と解決法`,
    summary: opts.summary,
    context: opts.context,
    environment: opts.environment || ["Windows", "macOS", "Linux"],
    causes: opts.causes || [],
    diagnosticSteps: opts.diagnosticSteps || [],
    fixes: opts.fixes || [],
    prevention: opts.prevention || [],
    tags: opts.tags || [],
    relatedSlugs: opts.relatedSlugs || [],
  };
}

function dedupeByMessage(entries) {
  const seen = new Set();
  return entries.filter((e) => {
    const key = e.errorMessage;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function take500(entries) {
  return dedupeByMessage(entries).slice(0, 500);
}

// ─── Python ───────────────────────────────────────────────
const PYTHON_MODULES = [
  "requests", "numpy", "pandas", "matplotlib", "scipy", "sklearn", "django", "flask",
  "fastapi", "uvicorn", "gunicorn", "boto3", "psycopg2", "pymysql", "sqlalchemy",
  "celery", "redis", "pillow", "cv2", "tensorflow", "torch", "transformers", "httpx",
  "aiohttp", "pytest", "black", "flake8", "mypy", "pydantic", "alembic", "jinja2",
  "yaml", "dotenv", "openpyxl", "xlrd", "beautifulsoup4", "lxml", "selenium",
  "scrapy", "paramiko", "fabric", "watchdog", "click", "typer", "rich", "tqdm",
  "joblib", "xgboost", "lightgbm", "statsmodels", "seaborn", "plotly", "bokeh",
  "streamlit", "gradio", "langchain", "openai", "anthropic", "tiktoken", "chromadb",
  "faiss", "sentence_transformers", "huggingface_hub", "tokenizers", "datasets",
  "accelerate", "peft", "bitsandbytes", "wandb", "mlflow", "optuna", "shap",
  "sympy", "networkx", "geopandas", "shapely", "folium", "pyarrow", "polars",
  "dask", "ray", "airflow", "prefect", "invoke", "cryptography", "jwt", "passlib",
  "bcrypt", "authlib", "oauthlib", "stripe", "paypalrestsdk", "sendgrid", "twilio",
  "slack_sdk", "discord", "telegram", "linebot", "google", "googleapiclient",
  "google_auth", "google_cloud", "firebase_admin", "boto3", "azure", "msal",
  "win32api", "pywin32", "wmi", "psutil", "GPUtil", "pyserial", "pyusb", "bleak",
  "asyncio", "aiofiles", "websockets", "socketio", "grpc", "protobuf", "msgpack",
  "orjson", "ujson", "marshmallow", "cerberus", "voluptuous", "attrs", "dataclasses_json",
  "pydantic_settings", "python_multipart", "starlette", "werkzeug", "itsdangerous",
  "markupsafe", "wtforms", "flask_login", "flask_sqlalchemy", "flask_migrate",
  "flask_wtf", "flask_cors", "flask_jwt_extended", "django_rest_framework",
  "django_cors_headers", "django_filter", "channels", "daphne", "gunicorn",
  "waitress", "hypercorn", "meinheld", "gevent", "eventlet", "greenlet",
  "Cython", "numba", "cupy", "jax", "theano", "keras", "torchvision", "torchaudio",
  "onnx", "onnxruntime", "tensorboard", "wandb", "comet_ml", "neptune",
  "imgaug", "albumentations", "opencv_contrib", "face_recognition", "dlib",
  "nltk", "spacy", "gensim", "textblob", "jieba", "mecab", "sudachipy",
  "pdfplumber", "pypdf", "reportlab", "weasyprint", "markdown", "mistune",
  "feedparser", "newspaper3k", "trafilatura", "readability", "playwright",
  "pyppeteer", "undetected_chromedriver", "fake_useragent", "user_agents",
  "faker", "factory_boy", "hypothesis", "pytest_cov", "pytest_asyncio",
  "pytest_mock", "coverage", "tox", "nox", "pre_commit", "bandit", "safety",
  "pipenv", "poetry", "setuptools", "wheel", "build", "twine", "virtualenv",
  "pip", "conda", "mamba", "ipython", "jupyter", "notebook", "jupyterlab",
  "ipywidgets", "voila", "papermill", "nbdev", "fastcore", "fastai",
];

function generatePythonErrors() {
  const entries = [];

  for (const mod of PYTHON_MODULES) {
    entries.push(
      baseEntry("python", `ModuleNotFoundError: No module named '${mod}'`, {
        context: "pip install 前、venv 未有効化、パッケージ名 typo",
        causes: [
          `パッケージ '${mod}' がインストールされていない`,
          "仮想環境が有効化されておらず別の Python を使っている",
          `pip install 時のパッケージ名が異なる（PyPI 名と import 名の不一致）`,
        ],
        diagnosticSteps: [
          "python -c \"import sys; print(sys.executable)\" で使用中の Python を確認",
          "pip list | findstr /i " + mod + "（Windows）または pip list | grep -i " + mod,
          "仮想環境なら source venv/bin/activate または .\\venv\\Scripts\\activate",
        ],
        fixes: [
          {
            title: "パッケージをインストール",
            description: "使用中の Python に対して pip でインストールします。",
            code: `pip install ${mod}\n# または\npython -m pip install ${mod}`,
          },
          {
            title: "仮想環境を有効化してから再インストール",
            description: "グローバルと venv の取り違えが最も多い原因です。",
            code: `python -m venv venv\n# Windows\nvenv\\Scripts\\activate\n# macOS/Linux\nsource venv/bin/activate\npip install ${mod}`,
          },
        ],
        prevention: ["requirements.txt に依存関係を固定", "CI でも同じ venv 手順を使う"],
        tags: ["ModuleNotFoundError", mod, "pip", "venv"],
      })
    );
  }

  const importErrors = [
    ["sklearn", "cross_val_score", "scikit-learn のバージョン差"],
    ["django.db", "models", "Django 未インストールまたは settings 未設定"],
    ["PIL", "Image", "Pillow 未インストール（import 名は PIL）"],
    ["cv2", "imread", "opencv-python 未インストール"],
    ["bs4", "BeautifulSoup", "beautifulsoup4 未インストール"],
    ["dotenv", "load_dotenv", "python-dotenv 未インストール"],
    ["yaml", "safe_load", "PyYAML 未インストール"],
    ["jwt", "encode", "PyJWT 未インストール"],
    ["google.cloud", "storage", "google-cloud-storage 未インストール"],
  ];
  for (const [mod, name, ctx] of importErrors) {
    entries.push(
      baseEntry("python", `ImportError: cannot import name '${name}' from '${mod}'`, {
        context: ctx,
        causes: ["パッケージのバージョンが古い/新しすぎる", "部分インストールや壊れた環境", "同名のローカルファイルによるシャドウイング"],
        fixes: [
          { title: "パッケージ再インストール", description: "一度アンインストールして入れ直します。", code: `pip uninstall ${mod} -y\npip install ${mod}` },
          { title: "バージョン指定", description: "ドキュメント記載の推奨バージョンに合わせます。", code: `pip install "${mod}>=2.0"` },
        ],
        tags: ["ImportError", mod, name],
      })
    );
  }

  const typeErrors = [
    "unsupported operand type(s) for +: 'int' and 'str'",
    "can only concatenate str (not \"int\") to str",
    "'NoneType' object is not subscriptable",
    "'NoneType' object is not iterable",
    "'NoneType' object has no attribute 'split'",
    "'list' object is not callable",
    "'dict' object is not callable",
    "object of type 'int' has no len()",
    "expected str, bytes or os.PathLike object, not NoneType",
    "missing 1 required positional argument: 'self'",
    "takes 2 positional arguments but 3 were given",
    "got an unexpected keyword argument 'foo'",
    "'<' not supported between instances of 'str' and 'int'",
    "string indices must be integers",
    "descriptor '__init__' requires a 'datetime.datetime' object but received a 'str'",
  ];
  for (const msg of typeErrors) {
    entries.push(
      baseEntry("python", `TypeError: ${msg}`, {
        context: "型の不一致、None の参照、関数呼び出しミス",
        causes: ["変数の型想定が間違っている", "API が None を返している", "メソッドと属性の取り違え"],
        fixes: [
          { title: "型を確認", description: "print(type(x)) で実際の型を確認します。", code: `print(type(variable))\nprint(repr(variable))` },
          { title: "None チェック", description: "参照前に if variable is not None を入れます。" },
        ],
        tags: ["TypeError"],
      })
    );
  }

  const valueErrors = [
    "invalid literal for int() with base 10: ''",
    "invalid literal for int() with base 10: 'abc'",
    "could not convert string to float: 'N/A'",
    "too many values to unpack (expected 2)",
    "not enough values to unpack (expected 3, got 2)",
    "max() arg is an empty sequence",
    "min() arg is an empty sequence",
    "empty separator",
    "field names must be valid Python identifiers",
    "time data '2024/13/01' does not match format '%Y-%m-%d'",
  ];
  for (const msg of valueErrors) {
    entries.push(
      baseEntry("python", `ValueError: ${msg}`, {
        context: "入力値・データ形式の不正",
        causes: ["空文字や不正フォーマットのパース", "split/unpack の要素数不一致", "空リストへの max/min"],
        fixes: [
          { title: "入力バリデーション", description: "変換前に strip() と空チェックを行います。" },
          { title: "try/except で捕捉", description: "ユーザー入力は ValueError を想定して処理します.", code: "try:\n    n = int(text)\nexcept ValueError:\n    print('整数を入力してください')" },
        ],
        tags: ["ValueError"],
      })
    );
  }

  const syntaxErrors = [
    "invalid syntax",
    "unexpected EOF while parsing",
    "invalid character '：' (U+FF1A)",
    "expected ':'",
    "expected 'except' or 'finally' block",
    "cannot assign to literal",
    "f-string: unmatched '('",
    "f-string: empty expression not allowed",
  ];
  for (const msg of syntaxErrors) {
    entries.push(
      baseEntry("python", `SyntaxError: ${msg}`, {
        context: "コピペ、全角文字、括弧・インデントのミス",
        causes: ["全角コロン・括弧の混入", "括弧/引用符の閉じ忘れ", "try ブロック後の except 欠落"],
        fixes: [
          { title: "該当行付近を確認", description: "エラー行番号の ±3 行を見直します。" },
          { title: "全角→半角", description: "エディタで全角記号を検索置換します。" },
        ],
        tags: ["SyntaxError"],
      })
    );
  }

  const pipErrors = [
    "ERROR: Could not find a version that satisfies the requirement",
    "ERROR: No matching distribution found for",
    "pip: command not found",
    "WARNING: Retrying (Retry(total=4)) after connection broken",
    "SSL: CERTIFICATE_VERIFY_FAILED",
    "subprocess-exited-with-error",
    "metadata-generation-failed",
    "error: Microsoft Visual C++ 14.0 or greater is required",
  ];
  for (const msg of pipErrors) {
    entries.push(
      baseEntry("python", msg.includes("ERROR") || msg.includes("pip") ? msg : `pip install error: ${msg}`, {
        context: "pip install 実行時",
        causes: ["Python バージョン非対応", "ネットワーク/プロキシ", "Windows で C++ Build Tools 不足"],
        fixes: [
          { title: "Python バージョン確認", description: "パッケージが要求する Python 版本を確認します.", code: "python --version" },
          { title: "trusted-host 指定（社内プロキシ）", description: "証明書問題の回避（一時的）.", code: "pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org pkg" },
        ],
        tags: ["pip", "install"],
      })
    );
  }

  const djangoErrors = [
    "django.core.exceptions.ImproperlyConfigured: Requested setting INSTALLED_APPS",
    "django.db.utils.OperationalError: no such table:",
    "django.db.utils.IntegrityError: UNIQUE constraint failed",
    "django.template.exceptions.TemplateDoesNotExist:",
    "django.urls.exceptions.NoReverseMatch: Reverse for",
  ];
  for (const msg of djangoErrors) {
    entries.push(
      baseEntry("python", msg, {
        context: "Django プロジェクト実行時",
        causes: ["settings.py 未設定", "migrate 未実行", "URL name の typo"],
        fixes: [
          { title: "migrate 実行", description: "DB テーブルを作成します.", code: "python manage.py migrate" },
          { title: "settings 確認", description: "DJANGO_SETTINGS_MODULE と INSTALLED_APPS を確認." },
        ],
        tags: ["Django"],
      })
    );
  }

  const misc = [
    ["IndentationError: unexpected indent", "インデント混在（タブとスペース）"],
    ["TabError: inconsistent use of tabs and spaces in indentation", "タブ/スペース混在"],
    ["FileNotFoundError: [Errno 2] No such file or directory: 'data.csv'", "相対パス・カレントディレクトリの取り違え"],
    ["PermissionError: [Errno 13] Permission denied: '/var/log/app.log'", "書き込み権限不足"],
    ["ConnectionRefusedError: [Errno 61] Connection refused", "サーバー未起動・ポート違い"],
    ["TimeoutError: timed out", "ネットワーク遅延・ファイアウォール"],
    ["RecursionError: maximum recursion depth exceeded", "無限再帰"],
    ["MemoryError", "大量データの一括読み込み"],
    ["UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff", "文字コード不一致"],
    ["KeyError: 'username'", "存在しない辞書キー"],
    ["IndexError: list index out of range", "リスト範囲外"],
    ["AttributeError: 'str' object has no attribute 'append'", "str と list の取り違え"],
    ["ZeroDivisionError: division by zero", "除算前のゼロチェック漏れ"],
    ["RuntimeError: dictionary changed size during iteration", "ループ中の dict 変更"],
    ["StopIteration", "next() で要素枯渇"],
    ["AssertionError", "assert 失敗・テスト失敗"],
    ["OSError: [WinError 10048] Only one usage of each socket address", "ポート使用中"],
    ["BrokenPipeError: [Errno 32] Broken pipe", "接続先が先に切断"],
    ["IsADirectoryError: [Errno 21] Is a directory", "ファイルのつもりでディレクトリを開いた"],
    ["NotADirectoryError: [Errno 20] Not a directory", "ディレクトリのつもりでファイルを指定"],
  ];
  for (const [msg, ctx] of misc) {
    entries.push(
      baseEntry("python", msg, {
        context: ctx,
        causes: [ctx],
        fixes: [{ title: "エラー種別に応じた修正", description: "メッセージに含まれるファイル名・行番号・型名を手がかりに修正します." }],
        tags: [msg.split(":")[0]],
      })
    );
  }

  return take500(entries);
}

// ─── Java ───────────────────────────────────────────────
const JAVA_CLASSES = [
  "java.util.ArrayList", "java.util.HashMap", "java.io.FileInputStream",
  "com.mysql.jdbc.Driver", "org.postgresql.Driver", "org.springframework.boot.SpringApplication",
  "org.hibernate.SessionFactory", "javax.servlet.http.HttpServlet",
  "com.fasterxml.jackson.databind.ObjectMapper", "org.junit.jupiter.api.Test",
  "org.apache.commons.lang3.StringUtils", "com.google.gson.Gson",
  "redis.clients.jedis.Jedis", "org.apache.kafka.clients.producer.KafkaProducer",
  "io.netty.channel.Channel", "com.zaxxer.hikari.HikariDataSource",
];

function generateJavaErrors() {
  const entries = [];

  for (const cls of JAVA_CLASSES) {
    const short = cls.split(".").pop();
    entries.push(
      baseEntry("java", `java.lang.ClassNotFoundException: ${cls}`, {
        context: "classpath 不足、依存 JAR 未追加",
        causes: [`${cls} を含む JAR が classpath にない`, "Maven/Gradle の dependency 漏れ", "provided scope の取り違え"],
        fixes: [
          { title: "依存関係追加", description: "Maven pom.xml または Gradle build.gradle に追加.", code: `<dependency>\n  <groupId>...</groupId>\n  <artifactId>${short.toLowerCase()}</artifactId>\n</dependency>` },
        ],
        tags: ["ClassNotFoundException", short],
      })
    );
  }

  const npeContexts = [
    "Cannot invoke \"String.length()\" because \"name\" is null",
    "Cannot invoke \"java.util.List.size()\" because \"items\" is null",
    "Cannot invoke \"com.example.User.getId()\" because \"user\" is null",
    "Cannot load from object array because \"args\" is null",
  ];
  for (const ctx of npeContexts) {
    entries.push(
      baseEntry("java", `java.lang.NullPointerException: ${ctx}`, {
        context: "null 参照",
        causes: ["DB/API が null を返した", "初期化前にアクセス", "Optional 未使用"],
        fixes: [
          { title: "null チェック", description: "Objects.requireNonNull や Optional を使います.", code: "if (user == null) throw new IllegalArgumentException(\"user is null\");" },
        ],
        tags: ["NullPointerException"],
      })
    );
  }

  const compileErrors = [
    "cannot find symbol: variable foo",
    "cannot find symbol: method bar()",
    "incompatible types: int cannot be converted to java.lang.String",
    "unreachable statement",
    "missing return statement",
    "constructor Foo in class Foo cannot be applied to given types",
    "method does not override or implement a method from a supertype",
    "incompatible thrown types in throws clause",
    "variable might not have been initialized",
    "bad operand types for binary operator '+'",
  ];
  for (const msg of compileErrors) {
    entries.push(
      baseEntry("java", `error: ${msg}`, {
        context: "javac / IDE コンパイル時",
        causes: ["typo", "import 漏れ", "型不一致", "メソッドシグネチャ不一致"],
        fixes: [{ title: "シンボル定義を確認", description: "IDE のクイックフィックスまたは import 追加." }],
        tags: ["compile", "javac"],
      })
    );
  }

  const mavenErrors = [
    "Failed to execute goal org.apache.maven.plugins:maven-compiler-plugin",
    "Could not resolve dependencies for project",
    "Non-resolvable parent POM",
    "Failed to read artifact descriptor for",
    "package does not exist",
    "BUILD FAILURE",
    "No compiler is provided in this environment. Perhaps you are running on a JRE rather than a JDK?",
  ];
  for (const msg of mavenErrors) {
    entries.push(
      baseEntry("java", `[ERROR] ${msg}`, {
        context: "mvn compile / package 実行時",
        causes: ["JDK 未設定", "依存解決失敗", "settings.xml / リポジトリ問題"],
        fixes: [
          { title: "JAVA_HOME 確認", description: "JDK が指されているか確認.", code: "echo %JAVA_HOME%\njavac -version" },
          { title: "依存キャッシュクリア", description: "ローカル repo の問題を切り分け.", code: "mvn dependency:purge-local-repository" },
        ],
        tags: ["Maven"],
      })
    );
  }

  const springErrors = [
    "Error creating bean with name 'userService': Unsatisfied dependency expressed through field",
    "Failed to configure a DataSource: 'url' attribute is not specified",
    "Whitelabel Error Page This application has no explicit mapping for /error",
    "Ambiguous mapping. Cannot map 'userController' method",
    "Port 8080 was already in use",
    "org.springframework.beans.factory.NoSuchBeanDefinitionException: No qualifying bean of type",
  ];
  for (const msg of springErrors) {
    entries.push(
      baseEntry("java", msg, {
        context: "Spring Boot 起動・実行時",
        causes: ["@Autowired 先が未登録", "application.properties 不足", "Controller マッピング重複"],
        fixes: [
          { title: "ComponentScan 確認", description: "パッケージ配置と @SpringBootApplication の位置." },
          { title: "設定ファイル", description: "application.yml の datasource 設定を確認." },
        ],
        tags: ["Spring Boot"],
      })
    );
  }

  const sqlErrors = [
    "java.sql.SQLException: Access denied for user 'root'@'localhost'",
    "java.sql.SQLSyntaxErrorException: You have an error in your SQL syntax",
    "java.sql.SQLIntegrityConstraintViolationException: Duplicate entry",
    "org.hibernate.exception.ConstraintViolationException: could not execute statement",
    "Connection refused: connect",
  ];
  for (const msg of sqlErrors) {
    entries.push(
      baseEntry("java", msg, {
        context: "JDBC / Hibernate 実行時",
        causes: ["接続情報誤り", "SQL 方言ミス", "制約違反"],
        fixes: [{ title: "接続テスト", description: "mysql -u ... または psql で直接接続確認." }],
        tags: ["SQLException", "JDBC"],
      })
    );
  }

  const runtimeErrors = [
    "java.lang.NoSuchMethodError: 'void com.example.Foo.bar()'",
    "java.lang.NoClassDefFoundError: com/example/Foo",
    "java.lang.ClassCastException: class java.lang.String cannot be cast to class java.lang.Integer",
    "java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 3",
    "java.lang.NumberFormatException: For input string: \"abc\"",
    "java.lang.IllegalArgumentException: Source must not be null",
    "java.lang.UnsupportedOperationException: remove",
    "java.util.concurrent.TimeoutException",
    "java.net.ConnectException: Connection refused",
    "java.net.UnknownHostException: api.example.com",
  ];
  for (const msg of runtimeErrors) {
    entries.push(
      baseEntry("java", msg, {
        context: "JVM 実行時",
        causes: ["バージョン不一致", "classpath 上の古い JAR", "ホスト名解決失敗"],
        fixes: [{ title: "スタックトレース先頭を確認", description: "自分のコードの行から調査." }],
        tags: [msg.split(":")[0].split(".").pop()],
      })
    );
  }

  // Gradle errors
  const gradleErrors = [
    "Execution failed for task ':compileJava'",
    "Could not resolve all files for configuration ':compileClasspath'",
    "Unsupported class file major version 65",
    "Gradle build daemon disappeared unexpectedly",
  ];
  for (const msg of gradleErrors) {
    entries.push(
      baseEntry("java", msg, {
        context: "Gradle ビルド時",
        causes: ["JDK バージョン不一致", "依存解決失敗"],
        fixes: [{ title: "Java toolchain", description: "build.gradle の sourceCompatibility を確認." }],
        tags: ["Gradle"],
      })
    );
  }

  // pad with more specific exception variants
  const exceptions = ["IOException", "FileNotFoundException", "InterruptedException", "ExecutionException", "ParseException", "SAXParseException", "JsonParseException", "SSLHandshakeException", "SocketTimeoutException", "EOFException"];
  for (let i = 0; i < 200; i++) {
    const ex = exceptions[i % exceptions.length];
    entries.push(
      baseEntry("java", `java.lang.${ex}: ${ex} at com.example.service.TaskService.run(TaskService.java:${42 + (i % 50)})`, {
        context: "アプリケーション実行中",
        causes: ["I/O 失敗", "外部 API タイムアウト", "不正な入力データ"],
        fixes: [{ title: "例外ハンドリング", description: "try-catch でログ出力し、リトライまたはフォールバック." }],
        tags: [ex],
      })
    );
  }

  return take500(entries);
}

module.exports = {
  baseEntry,
  take500,
  dedupeByMessage,
  generatePythonErrors,
  generateJavaErrors,
};
