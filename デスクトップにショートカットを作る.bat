@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$d = [Environment]::GetFolderPath('Desktop');" ^
  "$w = New-Object -ComObject WScript.Shell;" ^
  "$s1 = $w.CreateShortcut((Join-Path $d 'AI知識サイトを開く.lnk'));" ^
  "$s1.TargetPath = Join-Path '%ROOT%' '開く.bat';" ^
  "$s1.WorkingDirectory = '%ROOT%';" ^
  "$s1.Description = 'サーバー起動＋管理画面・ホームをブラウザで開く';" ^
  "$s1.IconLocation = 'imageres.dll,109';" ^
  "$s1.Save();" ^
  "$s2 = $w.CreateShortcut((Join-Path $d 'AI知識サイト 管理画面.lnk'));" ^
  "$s2.TargetPath = Join-Path '%ROOT%' '管理画面を開く.bat';" ^
  "$s2.WorkingDirectory = '%ROOT%';" ^
  "$s2.Description = '管理画面だけ開く（サーバー起動済み前提）';" ^
  "$s2.IconLocation = 'imageres.dll,109';" ^
  "$s2.Save();" ^
  "$s3 = $w.CreateShortcut((Join-Path $d 'AI知識サイト Git 初回設定.lnk'));" ^
  "$s3.TargetPath = Join-Path '%ROOT%' 'git-setup.bat';" ^
  "$s3.WorkingDirectory = '%ROOT%';" ^
  "$s3.Description = 'Git 初回設定（git-setup.bat）';" ^
  "$s3.IconLocation = 'imageres.dll,109';" ^
  "$s3.Save();" ^
  "$s4 = $w.CreateShortcut((Join-Path $d 'AI知識サイト Git push.lnk'));" ^
  "$s4.TargetPath = Join-Path '%ROOT%' 'git-push.bat';" ^
  "$s4.WorkingDirectory = '%ROOT%';" ^
  "$s4.Description = 'commit & push で本番デプロイ';" ^
  "$s4.IconLocation = 'imageres.dll,109';" ^
  "$s4.Save();" ^
  "Write-Host 'デスクトップにショートカットを作成しました:';" ^
  "Write-Host '  - AI知識サイトを開く.lnk';" ^
  "Write-Host '  - AI知識サイト 管理画面.lnk';" ^
  "Write-Host '  - AI知識サイト Git 初回設定.lnk (git-setup.bat)';" ^
  "Write-Host '  - AI知識サイト Git push.lnk';"

echo.
pause
