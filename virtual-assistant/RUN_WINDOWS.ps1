Set-Location $PSScriptRoot
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "Created .env from .env.example." -ForegroundColor Yellow
    Write-Host "Open .env, add GEMINI_API_KEY, save it, then run this script again."
    exit 1
}
Start-Process "http://localhost:8787"
node server/index.js
