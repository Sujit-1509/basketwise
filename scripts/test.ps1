#requires -Version 7.0
param([switch]$WithDockerIntegration)
. (Join-Path $PSScriptRoot 'native-common.ps1')
if (-not (Test-Path -LiteralPath $javaExe)) { throw 'Run scripts/setup-native.ps1 first.' }
$previousJavaHome = $env:JAVA_HOME
$previousE2eUrl = $env:E2E_URL
$env:JAVA_HOME = $jdkHome
Push-Location $projectRoot
try {
    Push-Location backend
    try {
        if ($WithDockerIntegration) {
            & .\mvnw.cmd -B test
        } else {
            & .\mvnw.cmd -B '-Dtest=AccountServiceTest,ComparisonEngineTest' test
        }
        if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
    } finally { Pop-Location }
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
    } finally { Pop-Location }
} finally {
    Pop-Location
    $env:JAVA_HOME = $previousJavaHome
    $env:E2E_URL = $previousE2eUrl
}
