@echo off
title Fix GitHub - KK260529 ONLY
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo.
echo ========================================
echo   GitHub login fix
echo   ONLY account: KK260529
echo   NOT allowed: sgupge2624 (blocked)
echo ========================================
echo.
echo  This will:
echo   1. Remove old GitHub login (sgupge2624 etc.)
echo   2. Set remote to KK260529/ai-site only
echo   3. Try git push again
echo.
pause

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js required
  goto END
)

node scripts/git-fix-login.js

:END
echo.
pause
