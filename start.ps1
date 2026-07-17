$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$webRoot = Join-Path $root 'web'
$port = 8765
$url = "http://127.0.0.1:$port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host ""
Write-Host "Генератор договора запущен"
Write-Host "Откройте в браузере: $url"
Write-Host "Для остановки нажмите Ctrl+C"
Write-Host ""

Start-Process $url

function Get-ContentType([string]$path) {
  switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.js'   { return 'application/javascript; charset=utf-8' }
    '.docx' { return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    default { return 'application/octet-stream' }
  }
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response

  try {
    $relativePath = [Uri]::UnescapeDataString($request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($relativePath)) {
      $relativePath = 'index.html'
    }

    $fullPath = Join-Path $webRoot $relativePath
    $fullPath = [IO.Path]::GetFullPath($fullPath)

    if (-not $fullPath.StartsWith([IO.Path]::GetFullPath($webRoot), [StringComparison]::OrdinalIgnoreCase)) {
      throw 'Forbidden'
    }

    if (-not (Test-Path $fullPath)) {
      $response.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
    }
    else {
      $bytes = [IO.File]::ReadAllBytes($fullPath)
      $response.ContentType = Get-ContentType $fullPath
      $response.StatusCode = 200
    }
  }
  catch {
    $response.StatusCode = 500
    $bytes = [Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
  }

  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.OutputStream.Close()
}
