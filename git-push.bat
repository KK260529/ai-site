@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  Git commit ^& push（本番デプロイ）
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [エラー] Git がインストールされていません。
  echo https://git-scm.com/download/win からインストールしてください。
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [エラー] Node.js が必要です。
  pause
  exit /b 1
)

node scripts/git-deploy-cli.js
echo.
pause
