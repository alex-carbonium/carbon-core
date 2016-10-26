param(    
    [switch] $Debug = $false
)

$ErrorActionPreference = "Stop"

try
{
    Push-Location $PSScriptRoot    

    Remove-Item .\target\* -Recurse -ErrorAction Ignore

    if (-not $Debug)
    {
        npm install --loglevel=error
    }

    $params = @("run", "packLib", "--", "--noColors")
    if ($Debug)
    {
        $params += "--noUglify"
    }            
    & npm $params

    Remove-Item .\target\*.map
}
finally
{
    Pop-Location
}