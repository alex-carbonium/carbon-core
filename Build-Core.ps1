param(
    [switch] $Debug = $false
)

$ErrorActionPreference = "Stop"

try
{
    Push-Location $PSScriptRoot

    Remove-Item .\target\* -Recurse -ErrorAction Ignore
    Remove-Item .\*.trx -ErrorAction Ignore

    if (-not $Debug)
    {
        npm install --loglevel=error
        npm test
    }

    $params = @("run", "packCore", "--", "--noColors")
    if ($Debug)
    {
        $params += "--noUglify"
    }
    & npm $params

    Copy-Item .\mylibs\definitions\carbon-*.d.ts .\target
    Remove-Item .\target\*.map
}
finally
{
    Pop-Location
}