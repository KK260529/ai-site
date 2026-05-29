# AIまとめサイト — 起動スクリプト
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[エラー] Node.js が見つかりません。" -ForegroundColor Red
  Write-Host "https://nodejs.org/ から LTS 版をインストールするか、start.bat を使ってください。"
  exit 1
}

if (-not (Test-Path "node_modules\express")) {
  Write-Host "初回セットアップ: npm install ..."
  npm install
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host ".env を作成しました。GROQ_API_KEY を設定してください。" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  管理画面 → http://localhost:3000/admin" -ForegroundColor Cyan
Write-Host "  停止 → Ctrl+C"
Write-Host ""

node server.js
