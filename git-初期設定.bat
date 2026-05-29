@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "REMOTE=https://github.com/KK260529/ai-site.git"

echo.
echo  Git 初回設定（リポジトリ: %REMOTE%）
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [エラー] Git が未インストールです。
  echo https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist ".git" (
  echo  git init ...
  git init
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo  git remote add origin ...
  git remote add origin "%REMOTE%"
) else (
  echo  git remote set-url origin ...
  git remote set-url origin "%REMOTE%"
)

git branch -M main 2>nul

echo.
echo  初回コミット（プロジェクト全体）...
git add .
git status -sb

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "initial: Knowledge CMS 個人用AI知識出版社"
) else (
  echo  コミットする変更がありません（スキップ）
)

echo.
echo  GitHub へ push します（ログインを求められたら認証してください）...
git push -u origin main

if errorlevel 1 (
  echo.
  echo [push 失敗] GitHub にログイン済みか確認してください。
  echo   - GitHub Desktop を使う方法もあります
  echo   - または: gh auth login
  pause
  exit /b 1
)

echo.
echo  完了！ 次からは git-push.bat または管理画面のボタンで push できます。
echo  Vercel / Railway でこのリポジトリを Import してください。
echo.
pause
