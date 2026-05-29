@echo off
title Git Setup - ai-site
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "REMOTE=https://KK260529@github.com/KK260529/ai-site.git"

echo.
echo ========================================
echo   Git Setup (KK260529/ai-site)
echo ========================================
echo   Folder: %CD%
echo   Remote: %REMOTE%
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git is not installed.
  echo Download: https://git-scm.com/download/win
  goto END
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  goto END
)

echo [1/2] Running setup script...
node scripts/git-first-setup.js
set "ERR=%ERRORLEVEL%"

echo.
if "%ERR%"=="0" (
  echo ========================================
  echo   DONE
  echo   Next: git-push.bat or Admin - Deploy tab
  echo ========================================
) else (
  echo ========================================
  echo   FAILED - see messages above
  echo   If push failed: login as GitHub user KK260529
  echo   - GitHub Desktop, or: gh auth login
  echo ========================================
)

:END
echo.
pause
