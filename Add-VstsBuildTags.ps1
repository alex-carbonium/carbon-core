$base = $Env:SYSTEM_TEAMFOUNDATIONCOLLECTIONURI + $Env:SYSTEM_TEAMPROJECT

Invoke-RestMethod -Method Put -Uri "$base/_apis/build/builds/$Env:BUILD_BUILDID/tags/${Env:BUILD_SOURCEBRANCH}?api-version=2.0"`
    -Headers @{ Authorization = "Bearer $env:SYSTEM_ACCESSTOKEN" }