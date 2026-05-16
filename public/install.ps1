$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "    ___    ______  ______  ______ _   __"
Write-Host "   /   |  / ____/ /__  / / ____/ | / /"
Write-Host "  / /| | / /        / / / __/ /  |/ / "
Write-Host " / ___ |/ /___    / /__/ /___/ /|  /  "
Write-Host "/_/  |_|\____/   /____/_____/_/ |_/   "
Write-Host ""
Write-Host "🚀 Developed by Aczen India" -ForegroundColor Cyan
Write-Host ""

function Fail($msg) {
    Write-Host "Error: $msg" -ForegroundColor Red
    exit 1
}

foreach ($cmd in 'git', 'node', 'npm') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Fail "'$cmd' is not installed or not on PATH. Install it and re-run."
    }
}

$repoUrl    = "https://github.com/umasuryasrinivas2468/bill-ease-india-44.git"
$projectDir = "$HOME\aczen-app"
$devPort    = 5173

if (Test-Path $projectDir) {
    if (-not (Test-Path (Join-Path $projectDir "package.json"))) {
        Fail "'$projectDir' exists but is not a valid project (no package.json). Remove it and re-run."
    }
    Write-Host "Project already cloned at $projectDir" -ForegroundColor Green
} else {
    Write-Host "📥 Cloning Aczen..." -ForegroundColor Yellow
    git clone $repoUrl $projectDir
    if ($LASTEXITCODE -ne 0) { Fail "git clone failed (exit code $LASTEXITCODE)." }
}

Set-Location $projectDir

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Fail "npm install failed (exit code $LASTEXITCODE)." }

Write-Host "🚀 Starting Aczen dev server on port $devPort..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectDir'; npm run dev"

$url = "http://localhost:$devPort"
$timeoutSec = 60
$elapsed = 0
Write-Host "Waiting for $url ..." -ForegroundColor Yellow
while ($elapsed -lt $timeoutSec) {
    try {
        Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
        break
    } catch {
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
}

if ($elapsed -ge $timeoutSec) {
    Write-Host "Dev server did not respond within ${timeoutSec}s. Open $url manually once it's ready." -ForegroundColor Yellow
} else {
    Write-Host "Dev server is up. Opening browser..." -ForegroundColor Green
    Start-Process $url
}
