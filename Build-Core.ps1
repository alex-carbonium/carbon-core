param(
    [switch] $Debug = $false,
    [string] $Branch,
    [int] $BuildNumber = 0,
    [string] $NpmToken,
    [string] $CdnKey
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
    Copy-Item ".\target\$main" ".\target\$Library\lib"
    Copy-Item ".\target\$main.map" ".\target\$Library\lib"
    Copy-Item ".\LICENSE" ".\target\$Library"

    $package = (gc .\package.json) -replace '-main-',$main -replace '-library-',$Library | ConvertFrom-Json
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
        "//registry.npmjs.org/:_authToken=$NpmToken" | sc ".npmrc"
        npm publish --access public
    }
    finally
    {
        Remove-Item ".npmrc" -ErrorAction Ignore
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
        npm config set registry "http://registry.npmjs.org/"
        npm install --loglevel=error
    }

    $params = @("run", "packCore", "--", "--noColors")
    if ($Debug)
    {
        $params += "--noUglify"
    }
    & npm $params
    if ($LASTEXITCODE)
    {
        throw "Packaging failed with exit code $LASTEXITCODE"
    }

    if (-not $Debug)
    {
        npm test -- --singleRun --coreLoader target
        if ($LASTEXITCODE)
        {
            throw "Tests failed with exit code $LASTEXITCODE"
        }
    }

    Copy-Item .\mylibs\definitions\carbon-*.d.ts .\target

    if ($Branch -eq "master" -or $Branch.StartsWith("releases"))
    {
        node .\scripts\uploadSourceMaps.js --accountName carbonstatic --accountKey $CdnKey
        PublishPackage -Library "carbon-core"
        PublishPackage -Library "carbon-api"
    }
}
finally
{
    Pop-Location
}