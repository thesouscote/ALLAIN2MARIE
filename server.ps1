$ports = @(5500, 8000, 8888, 5000, 3001, 0)
$listener = $null
$selectedPort = 0

foreach ($p in $ports) {
    try {
        $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
        $l.Start()
        $listener = $l
        $selectedPort = ($l.LocalEndpoint).Port
        break
    } catch {
        # Try next port
    }
}

if (-not $listener) {
    Write-Host "Impossible de trouver un port libre."
    exit 1
}

Write-Host "=========================================="
Write-Host " Serveur ALLAIN2MARIE demarre avec succes !"
Write-Host " Accessible sur : http://localhost:$selectedPort"
Write-Host " Page Studio    : http://localhost:$selectedPort/index.html"
Write-Host " Page Connexion : http://localhost:$selectedPort/login.html"
Write-Host " Page Admin     : http://localhost:$selectedPort/admin.html"
Write-Host "=========================================="

$root = $PSScriptRoot

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)
        $requestLine = $reader.ReadLine()
        
        if ($requestLine) {
            $parts = $requestLine.Split(' ')
            if ($parts.Length -ge 2) {
                $url = $parts[1].Split('?')[0]
                if ($url -eq "/" -or [string]::IsNullOrWhiteSpace($url)) {
                    $url = "/index.html"
                }

                $relative = $url.TrimStart('/').Replace('/', '\')
                $filePath = Join-Path $root $relative

                if (Test-Path $filePath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $contentType = "text/html; charset=utf-8"
                    if ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
                    elseif ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
                    elseif ($ext -eq ".json") { $contentType = "application/json; charset=utf-8" }
                    elseif ($ext -eq ".png") { $contentType = "image/png" }
                    elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
                    elseif ($ext -eq ".svg") { $contentType = "image/svg+xml" }
                    elseif ($ext -eq ".webp") { $contentType = "image/webp" }
                    elseif ($ext -eq ".ico") { $contentType = "image/x-icon" }

                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $body = "404 Page introuvable"
                    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
                    $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                }
                $stream.Flush()
            }
        }
        $client.Close()
    } catch {
        # Continue listening
    }
}
