#requires -Version 7.0
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nativeHome = Join-Path $env:LOCALAPPDATA 'Basketwise'
$runtimeDir = Join-Path $projectRoot '.runtime'
$jdkHome = Join-Path $nativeHome 'runtime/jdk-21.0.12.1+1'
$mysqlHome = Join-Path $nativeHome 'runtime/mysql-8.4.11-winx64'
$mysqlExe = Join-Path $mysqlHome 'bin/mysql.exe'
$mysqldExe = Join-Path $mysqlHome 'bin/mysqld.exe'
$mysqlAdminExe = Join-Path $mysqlHome 'bin/mysqladmin.exe'
$mysqlConfig = Join-Path $nativeHome 'my.ini'
$mysqlClientConfig = Join-Path $nativeHome 'client.ini'
$javaExe = Join-Path $jdkHome 'bin/java.exe'
$appJar = Join-Path $projectRoot 'backend/target/basketwise-1.0.0.jar'
New-Item -ItemType Directory -Force $runtimeDir | Out-Null

function Read-ProjectSettings {
    $settings = @{}
    foreach ($line in Get-Content -LiteralPath (Join-Path $projectRoot '.env')) {
        if ($line -match '^([A-Z_]+)=(.*)$') { $settings[$matches[1]] = $matches[2] }
    }
    foreach ($key in @('DB_PASSWORD', 'MYSQL_ROOT_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD')) {
        if (-not $settings[$key]) { throw "Missing $key in .env. Run scripts/setup.ps1." }
    }
    return $settings
}

function Get-ListeningProcess([int]$Port) {
    $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($connection) { return Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)" }
}

function Assert-NativeDatabase {
    $process = Get-ListeningProcess 3307
    if ($process -and ($process.ExecutablePath -ne $mysqldExe -or $process.CommandLine -notlike "*$mysqlConfig*")) {
        throw 'Port 3307 is in use by another server. Stop the Basketwise Docker database before starting native MySQL; do not stop unrelated databases.'
    }
    return $process
}

function Wait-NativeDatabase {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        & $mysqlExe "--defaults-extra-file=$mysqlClientConfig" --batch --skip-column-names --execute 'SELECT 1' 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 1
    }
    throw "MySQL did not become ready. Check $nativeHome/mysql-error.log."
}

function Start-NativeDatabase {
    if (-not (Test-Path -LiteralPath $mysqlConfig)) { throw 'Run scripts/setup-native.ps1 first.' }
    if (-not (Assert-NativeDatabase)) {
        Start-Process -FilePath $mysqldExe -ArgumentList "--defaults-file=`"$mysqlConfig`"" -WindowStyle Hidden | Out-Null
    }
    Wait-NativeDatabase
}
