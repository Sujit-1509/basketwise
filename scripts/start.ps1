$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'setup.ps1')
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    docker compose up --build -d
    if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed. Check Docker Desktop and docker compose logs.' }
    Write-Host 'Basketwise is starting at http://localhost:18080. Check docker compose logs -f app for readiness.'
} finally { Pop-Location }
