$jobs = @()

Remove-Item .\target\* -Recurse -ErrorAction Ignore

$jobs += Start-Job -ScriptBlock {
    Set-Location $args[0]
        
    npm install
    npm run packLib    

} -ArgumentList $PSScriptRoot

$jobs | % {$_ | Receive-job -Wait -AutoRemoveJob}