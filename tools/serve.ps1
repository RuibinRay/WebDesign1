# Local preview server for the Hola Ola site (no Node or Python needed).
# Usage:  powershell -ExecutionPolicy Bypass -File tools\serve.ps1   then open http://localhost:4173/
param([int]$Port = 4173)

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.webp' = 'image/webp'; '.png' = 'image/png'
  '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.mp4' = 'video/mp4'; '.ico' = 'image/x-icon'; '.txt' = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Hola Ola preview: http://localhost:$Port/  (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $req = $ctx.Request; $res = $ctx.Response
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '' -or $rel.EndsWith('/')) { $rel += 'index.html' }
      $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($full)
        $type = $mime[[IO.Path]::GetExtension($full).ToLowerInvariant()]; if (-not $type) { $type = 'application/octet-stream' }
        $res.ContentType = $type
        $res.Headers.Add('Cache-Control', 'no-store')
        $res.Headers.Add('Accept-Ranges', 'bytes')
        $start = 0; $end = $bytes.Length - 1
        $range = $req.Headers['Range']
        # byte ranges, so looping <video> can seek like it does on GitHub Pages
        if ($range -match '^bytes=(\d*)-(\d*)$' -and $bytes.Length -gt 0) {
          if ($Matches[1] -ne '') { $start = [int64]$Matches[1] }
          if ($Matches[2] -ne '') { $end = [Math]::Min([int64]$Matches[2], $bytes.Length - 1) }
          if ($start -le $end) {
            $res.StatusCode = 206
            $res.Headers.Add('Content-Range', "bytes $start-$end/$($bytes.Length)")
          } else { $start = 0; $end = $bytes.Length - 1 }
        }
        $len = $end - $start + 1
        $res.ContentLength64 = $len
        if ($req.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, $start, $len) }
      } else {
        $res.StatusCode = 404
      }
    } catch {
      try { $ctx.Response.StatusCode = 500 } catch {}
    } finally {
      try { $ctx.Response.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
}
