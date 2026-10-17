$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    $backendPath = (Resolve-Path '.\backend').Path
    docker run --rm -v "${backendPath}:/app" -v basketwise-maven:/root/.m2 -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -w /app maven:3.9.9-eclipse-temurin-21 mvn -B test
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
    Push-Location frontend
    try {
        npm ci --no-fund --no-audit
        if ($LASTEXITCODE -ne 0) { throw 'Frontend installation failed.' }
        npm test
        if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed.' }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
        npx playwright install chromium
        if ($LASTEXITCODE -ne 0) { throw 'Browser installation failed.' }
        $env:E2E_URL = 'http://127.0.0.1:18080'
        npm run test:e2e
        if ($LASTEXITCODE -ne 0) { throw 'Browser tests failed. Start the app first.' }
    } finally { Remove-Item Env:E2E_URL -ErrorAction SilentlyContinue; Pop-Location }
} finally { Pop-Location }
