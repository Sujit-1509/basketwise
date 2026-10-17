$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envFile) { Write-Host 'Existing .env retained.'; exit 0 }
function New-LocalSecret { $bytes = [byte[]]::new(24); [Security.Cryptography.RandomNumberGenerator]::Fill($bytes); [Convert]::ToHexString($bytes).ToLowerInvariant() }
$settings = @(
    "DB_PASSWORD=$(New-LocalSecret)",
    "MYSQL_ROOT_PASSWORD=$(New-LocalSecret)",
    'ADMIN_EMAIL=admin@basketwise.local',
    "ADMIN_PASSWORD=$(New-LocalSecret)"
)
[IO.File]::WriteAllLines($envFile, $settings)
Write-Host 'Created ignored .env with unique credentials. Open it locally for the admin login.'
