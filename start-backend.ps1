$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

if (-not (Test-Path "$Root\venv\Scripts\Activate.ps1")) {
    Write-Error "Python venv not found at venv\Scripts\Activate.ps1. Create it from the project root: python -m venv venv"
}

. "$Root\venv\Scripts\Activate.ps1"
Write-Host "Starting API at http://127.0.0.1:8000 (health: /health)" -ForegroundColor Cyan
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
