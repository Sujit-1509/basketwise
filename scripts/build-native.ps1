#requires -Version 7.0
. (Join-Path $PSScriptRoot 'native-common.ps1')
if (-not (Test-Path -LiteralPath $javaExe)) { throw 'Run scripts/setup-native.ps1 first.' }
$runningApp = Get-ListeningProcess 18080
if ($runningApp -and $runningApp.CommandLine -like "*$appJar*") {
    throw 'Stop Basketwise with scripts/stop.ps1 before rebuilding its JAR.'
}
$previousJavaHome = $env:JAVA_HOME
try {
    $env:JAVA_HOME = $jdkHome
    Push-Location (Join-Path $projectRoot 'frontend')
    try {
        npm ci --no-fund --no-audit
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    } finally { Pop-Location }
    $staticPath = [IO.Path]::GetFullPath((Join-Path $projectRoot 'backend/src/main/resources/static'))
    $expectedParent = [IO.Path]::GetFullPath((Join-Path $projectRoot 'backend/src/main/resources'))
    if ([IO.Path]::GetDirectoryName($staticPath) -ne $expectedParent) { throw 'Unexpected frontend asset directory.' }
    if (Test-Path -LiteralPath $staticPath) { Remove-Item -LiteralPath $staticPath -Recurse -Force }
    New-Item -ItemType Directory -Path $staticPath | Out-Null
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'frontend/dist') | Copy-Item -Destination $staticPath -Recurse
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        & .\mvnw.cmd -B package -DskipTests
        if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    } finally { Pop-Location }
} finally { $env:JAVA_HOME = $previousJavaHome }
Write-Host 'Built backend/target/basketwise-1.0.0.jar. Tests are a separate step.'
