@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "URL_ADMIN=http://localhost:3000/admin"
set "URL_HOME=http://localhost:3000/"

echo.
echo  AI知識サイトを開きます...
echo.

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo  サーバーが止まっているので起動します...
  start "AIサイト サーバー" /min "%~dp0restart.bat"
  echo  起動を待っています...
  call :wait_server
) else (
  echo  サーバーは起動済みです
)

start "" "%URL_ADMIN%"
ping -n 2 127.0.0.1 >nul
start "" "%URL_HOME%"

echo.
echo  ブラウザで開きました:
echo    管理画面  %URL_ADMIN%
echo.
exit /b 0

:wait_server
set /a N=0
:wait_loop
set /a N+=1
if %N% gtr 25 goto wait_done
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0
ping -n 2 127.0.0.1 >nul
goto wait_loop
:wait_done
echo  起動に時間がかかっています。restart.bat を実行してから再度お試しください。
exit /b 0
