#requires -Version 7.0
. (Join-Path $PSScriptRoot 'native-common.ps1')
$process = Get-ListeningProcess 18080
if ($process) {
    if ($process.ExecutablePath -ne $javaExe -or $process.CommandLine -notlike "*$appJar*") {
        throw 'Port 18080 belongs to another process; it was not stopped.'
    }
    Stop-Process -Id $process.ProcessId
}
if (Assert-NativeDatabase) {
    & $mysqlAdminExe "--defaults-extra-file=$mysqlClientConfig" shutdown
    if ($LASTEXITCODE -ne 0) { throw 'MySQL shutdown failed.' }
}
Write-Host 'Basketwise stopped. Native MySQL data is retained.'
