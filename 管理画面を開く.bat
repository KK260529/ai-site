@echo off
chcp 65001 >nul
cd /d "%~dp0"

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if errorlevel 1 (
  echo サーバーが止まっています。起動します...
  start "AIサイト サーバー" /min "%~dp0restart.bat"
  ping -n 5 127.0.0.1 >nul
)

start "" "http://localhost:3000/admin"
