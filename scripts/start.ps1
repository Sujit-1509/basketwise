#requires -Version 7.0
. (Join-Path $PSScriptRoot 'native-common.ps1')
if (-not (Test-Path -LiteralPath $javaExe) -or -not (Test-Path -LiteralPath $appJar)) {
    throw 'Run scripts/setup-native.ps1 and scripts/build-native.ps1 first.'
}
Start-NativeDatabase
$process = Get-ListeningProcess 18080
if ($process -and ($process.ExecutablePath -ne $javaExe -or $process.CommandLine -notlike "*$appJar*")) {
    throw 'Port 18080 is occupied by another app. Stop the Basketwise Docker app before switching to native.'
}
if (-not $process) {
    $settings = Read-ProjectSettings
    $variables = @{
        DB_PASSWORD = $settings.DB_PASSWORD
        ADMIN_EMAIL = $settings.ADMIN_EMAIL
        ADMIN_PASSWORD = $settings.ADMIN_PASSWORD
    }
    $variables.DB_URL = 'jdbc:mysql://127.0.0.1:3307/basketwise?connectionTimeZone=UTC'
    $variables.DB_USER = 'basketwise'
    $variables.PORT = '18080'
    $variables.SERVER_ADDRESS = '127.0.0.1'
    $previous = @{}
    try {
        foreach ($key in $variables.Keys) {
            $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
            [Environment]::SetEnvironmentVariable($key, $variables[$key], 'Process')
        }
        Start-Process -FilePath $javaExe -ArgumentList @('-Xms64m', '-Xmx384m', '-jar', "`"$appJar`"") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'app.log') -RedirectStandardError (Join-Path $runtimeDir 'app-error.log') | Out-Null
    } finally {
        foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
    }
}
for ($attempt = 0; $attempt -lt 45; $attempt++) {
    try {
        if ((Invoke-RestMethod 'http://127.0.0.1:18080/actuator/health' -TimeoutSec 2).status -eq 'UP') {
            Write-Host 'Basketwise is ready at http://localhost:18080 (native Windows, no Docker).'
            return
        }
    } catch {}
    Start-Sleep -Seconds 1
}
throw 'App did not become ready. Check .runtime/app.log and .runtime/app-error.log.'
