@echo off
title Git Push - ai-site
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo.
echo ========================================
echo   Git commit and push
echo ========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git is not installed.
  goto END
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  goto END
)

node scripts/git-deploy-cli.js

:END
echo.
pause
