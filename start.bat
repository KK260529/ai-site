@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [エラー] Node.js が見つかりません。
  echo https://nodejs.org/ から LTS 版をインストールしてください。
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo 初回セットアップ: npm install を実行中...
  call npm install
  if errorlevel 1 (
    echo [エラー] npm install に失敗しました。
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo .env がありません。.env.example をコピーします...
  copy .env.example .env
  echo .env を開いて GROQ_API_KEY を設定してください。
)

echo.
echo .env を変更した場合は、必ず restart.bat で再起動してください。
echo.

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo [注意] ポート 3000 は既に使用中です。
  echo   すでに起動している場合: http://localhost:3000/admin
  echo   起動し直す場合: restart.bat を実行してください。
  echo.
  pause
  exit /b 1
)

echo サーバー起動中...
echo   管理画面: http://localhost:3000/admin
echo   停止: Ctrl+C
echo.

node server.js
if errorlevel 1 (
  echo.
  echo [起動失敗] 上のエラーを確認してください。
  echo   ポート競合のときは restart.bat を試してください。
  echo.
)
pause
