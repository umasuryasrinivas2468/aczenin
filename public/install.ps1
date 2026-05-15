Write-Host ""
Write-Host "    ___    ______  ______  ______ _   __"
Write-Host "   /   |  / ____/ /__  / / ____/ | / /"
Write-Host "  / /| | / /        / / / __/ /  |/ / "
Write-Host " / ___ |/ /___    / /__/ /___/ /|  /  "
Write-Host "/_/  |_|\____/   /____/_____/_/ |_/   "
Write-Host ""

Write-Host "🚀 Developed by Aczen India" -ForegroundColor Cyan
Write-Host ""

$projectDir = "$HOME\aczen-app"

if (!(Test-Path $projectDir)) {

    Write-Host "📥 Cloning Aczen..." -ForegroundColor Yellow

    git clone https://github.com/umasuryasrinivas2468/bill-ease-india-44.git $projectDir
}

Set-Location $projectDir

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

npm install

Write-Host "🚀 Starting Aczen..." -ForegroundColor Green

Start-Process powershell -ArgumentList "cd $projectDir; npm run dev"

Start-Sleep -Seconds 8

Start-Process "http://localhost:5173"
