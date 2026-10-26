#requires -Version 7.0
. (Join-Path $PSScriptRoot 'native-common.ps1')
& (Join-Path $PSScriptRoot 'setup.ps1')
$settings = Read-ProjectSettings
$downloads = Join-Path $nativeHome 'downloads'
$runtimes = Join-Path $nativeHome 'runtime'
New-Item -ItemType Directory -Force $downloads, $runtimes | Out-Null

if (-not (Test-Path -LiteralPath $javaExe)) {
    $archive = Join-Path $downloads 'java21.zip'
    if (-not (Test-Path -LiteralPath $archive)) {
        Invoke-WebRequest 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip' -OutFile $archive
    }
    if ((Get-FileHash $archive -Algorithm SHA256).Hash -ne 'F9D6E191AB098C0D416E7D588A24420A8621CD2F4720DAB2459B8B7B2D2D8B4E') { throw 'Java archive checksum mismatch.' }
    Expand-Archive -LiteralPath $archive -DestinationPath $runtimes
}
if (-not (Test-Path -LiteralPath $mysqldExe)) {
    $archive = Join-Path $downloads 'mysql84.zip'
    if (-not (Test-Path -LiteralPath $archive)) {
        Invoke-WebRequest 'https://cdn.mysql.com/Downloads/MySQL-8.4/mysql-8.4.11-winx64.zip' -OutFile $archive
    }
    Expand-Archive -LiteralPath $archive -DestinationPath $runtimes
    if ((Get-AuthenticodeSignature $mysqldExe).Status -ne 'Valid') { throw 'MySQL executable signature is not valid.' }
}
$dataDir = Join-Path $nativeHome 'mysql-data'
$serverConfig = @"
[mysqld]
basedir=$($mysqlHome.Replace('\','/'))
datadir=$($dataDir.Replace('\','/'))
port=3307
bind-address=127.0.0.1
mysqlx=0
default-time-zone=+00:00
character-set-server=utf8mb4
collation-server=utf8mb4_0900_ai_ci
innodb-buffer-pool-size=128M
max-connections=30
log-error=$($nativeHome.Replace('\','/'))/mysql-error.log
"@
[IO.File]::WriteAllText($mysqlConfig, $serverConfig)
function Escape-IniValue([string]$Value) { return $Value.Replace('\','\\').Replace('"','\"') }
$clientConfig = "[client]`nhost=127.0.0.1`nport=3307`nuser=root`npassword=`"$(Escape-IniValue $settings.MYSQL_ROOT_PASSWORD)`"`ndefault-character-set=utf8mb4`n"
[IO.File]::WriteAllText($mysqlClientConfig, $clientConfig)

if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'mysql'))) {
    if (Get-ListeningProcess 3307) { throw 'Port 3307 is busy. Stop the Basketwise Docker database after backing it up, then rerun setup.' }
    & $mysqldExe "--defaults-file=$mysqlConfig" --initialize-insecure
    if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed. See mysql-error.log.' }
    function Escape-SqlValue([string]$Value) { return $Value.Replace('\','\\').Replace("'", "''") }
    $bootstrap = Join-Path $nativeHome 'bootstrap.sql'
    $sql = @"
ALTER USER 'root'@'localhost' IDENTIFIED BY '$(Escape-SqlValue $settings.MYSQL_ROOT_PASSWORD)';
CREATE DATABASE IF NOT EXISTS basketwise CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'basketwise'@'127.0.0.1' IDENTIFIED BY '$(Escape-SqlValue $settings.DB_PASSWORD)';
GRANT ALL PRIVILEGES ON basketwise.* TO 'basketwise'@'127.0.0.1';
"@
    [IO.File]::WriteAllText($bootstrap, $sql)
    Start-Process -FilePath $mysqldExe -ArgumentList @("--defaults-file=`"$mysqlConfig`"", "--init-file=`"$bootstrap`"") -WindowStyle Hidden | Out-Null
    Wait-NativeDatabase
    Remove-Item -LiteralPath $bootstrap
} else {
    Start-NativeDatabase
}
Write-Host 'Native Java 21 and MySQL 8.4 are ready. Existing database files were retained.'
