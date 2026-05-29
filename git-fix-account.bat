@echo off
title Fix GitHub Login - use KK260529
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "REMOTE=https://KK260529@github.com/KK260529/ai-site.git"

echo.
echo ========================================
echo   GitHub アカウント修正 (KK260529)
echo ========================================
echo.
echo  今は sgupge2624 でログインされているため push が拒否されています。
echo  このツールで古い認証を削除し、KK260529 で再ログインします。
echo.
pause

echo [1] Windows に保存された GitHub 認証を削除...
for /f "tokens=1,2 delims= " %%a in ('cmdkey /list ^| findstr /i "github"') do (
  echo   削除対象: %%a %%b
)

cmdkey /delete:git:https://github.com >nul 2>&1
cmdkey /delete:LegacyGeneric:target=git:https://github.com >nul 2>&1
cmdkey /delete:git:https://github.com/ >nul 2>&1

echo url=https://github.com| git credential reject 2>nul
echo host=github.com| git credential reject 2>nul
echo protocol=https| echo host=github.com| git credential reject 2>nul

echo   完了（見つからない場合もOK）
echo.

echo [2] リモート URL を KK260529 用に設定...
git remote set-url origin "%REMOTE%"
git remote -v
echo.

echo [3] push を実行します...
echo.
echo  ============================================
echo   次に表示されるログイン画面では:
echo   - ユーザー名: KK260529
echo   - パスワード: Personal Access Token (PAT)
echo.
echo   PAT の作り方:
echo   https://github.com/settings/tokens
echo   - Generate new token (classic)
echo   - repo にチェック
echo   - 表示された ghp_xxxx を「パスワード」として貼り付け
echo  ============================================
echo.
pause

git push -u origin main

if errorlevel 1 (
  echo.
  echo [失敗] まだ push できませんでした。
  echo.
  echo  代替: GitHub Desktop を使う（いちばん簡単）
  echo   1. https://desktop.github.com/ をインストール
  echo   2. KK260529 でサインイン
  echo   3. File - Add local repository - この ai-site フォルダ
  echo   4. Push origin をクリック
  echo.
) else (
  echo.
  echo [成功] GitHub に push できました！
  echo https://github.com/KK260529/ai-site
  echo.
)

pause
