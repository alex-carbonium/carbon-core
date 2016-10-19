param([string] $BuildName, [string] $SourceBranch)

function InvokeCarbonBuildApi($url, $data)
{
    $base = $Env:SYSTEM_TEAMFOUNDATIONCOLLECTIONURI + $Env:SYSTEM_TEAMPROJECT
                
    if ($data)
    {
        $response = Invoke-RestMethod -Method Post -Uri "$base$url" -Body (ConvertTo-Json $data -Depth 100) -Headers @{Authorization = "Bearer $env:SYSTEM_ACCESSTOKEN"} -ContentType 'application/json'
    }
    else
    {
        $response = Invoke-RestMethod -Method Get -Uri "$base$url" -Headers @{Authorization = "Bearer $env:SYSTEM_ACCESSTOKEN"} -ContentType 'application/json'
    }    
    return $response
}


$def = InvokeCarbonBuildApi "/_apis/build/definitions?api-version=2.0&name=$BuildName"
return InvokeCarbonBuildApi "/_apis/build/builds?api-version=2.0" @{definition = @{id = $def.value.id}; sourceBranch = $SourceBranch}