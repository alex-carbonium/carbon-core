$jobs = @()

Remove-Item .\target\* -Recurse -ErrorAction Ignore

$jobs += Start-Job -ScriptBlock {
    Set-Location $args[0]
        
    npm install --loglevel=error
    npm run packLib -- --noColors   

} -ArgumentList $PSScriptRoot

$jobs | % {$_ | Receive-job -Wait -AutoRemoveJob}