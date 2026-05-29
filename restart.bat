@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  古いサーバーを停止しています...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  taskkill /PID %%a /F >nul 2>&1
)

echo  待機中...
ping -n 3 127.0.0.1 >nul

call start.bat
