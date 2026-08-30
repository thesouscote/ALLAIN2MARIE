$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8000/')
$listener.Start()
Write-Host 'Server running on http://localhost:8000'
while($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $localPath = $request.Url.LocalPath
    if($localPath -eq '/') { $localPath = '/index.html' }
    $filePath = Join-Path (Get-Location) $localPath.TrimStart('/')
    if(Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $response.StatusCode = 200
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
