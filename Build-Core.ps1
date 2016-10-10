$jobs = @()

$jobs += Start-Job -ScriptBlock {
    Set-Location $args[0]
    npm run packLib    
} -ArgumentList $PSScriptRoot

$jobs | % {$_ | Receive-job -Wait -AutoRemoveJob}