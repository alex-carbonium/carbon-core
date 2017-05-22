param(
    [switch] $Debug = $false,
    [string] $Branch,
    [int] $BuildNumber = 0
)

$ErrorActionPreference = "Stop"

function PublishPackage($Library)
{
    $main = gci ".\target" -Filter "$Library-*.js" | select -ExpandProperty Name
    if (-not $main)
    {
        throw "$Library module not found"
    }

    New-Item ".\target\$Library" -ItemType Directory -ErrorAction Ignore
    New-Item ".\target\$Library\types" -ItemType Directory -ErrorAction Ignore
    New-Item ".\target\$Library\lib" -ItemType Directory -ErrorAction Ignore
    Copy-Item ".\mylibs\definitions\carbon-*.d.ts" ".\target\$Library\types"
    Copy-Item ".\target\$Main" ".\target\$Library\lib"
    Copy-Item ".\LICENSE" ".\target\$Library"

    $package = (gc .\package.json) -replace '{main}',$main -replace '{library}',$Library | ConvertFrom-Json
    $package.PSObject.Properties.Remove("dependencies")
    $package.PSObject.Properties.Remove("devDependencies")
    $package.PSObject.Properties.Remove("scripts")

    $v = [Version]::Parse($package.version)
    $v = New-Object Version($v.Major, $v.Minor, $BuildNumber)
    $package.version = $v.ToString()

    $package | ConvertTo-Json | sc ".\target\$Library\package.json"

    try
    {
        Push-Location ".\target\$Library"
        npm publish --access public
    }
    finally
    {
        Pop-Location
    }
}

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

    if ($Branch -eq "master" -or $Branch.StartsWith("releases"))
    {
        PublishPackage -Library "carbon-core"
        PublishPackage -Library "carbon-api"
    }
}
finally
{
    Pop-Location
}