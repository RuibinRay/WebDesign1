# Splits one Higgsfield film into the frame-by-frame images a scroll section scrubs through,
# and records it in assets/frames/frames.json under the film's name (day, burst, crack, ...).
# Needs ffmpeg on PATH.
# Usage:  powershell -ExecutionPolicy Bypass -File tools\make-frames.ps1 -Name day -Video higgsfield\renders\film_day.mp4
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][string]$Video,
  [int]$Fps = 15,
  [int]$DesktopWidth = 1920,
  [int]$MobileWidth = 608,     # native width of a 9:16 crop from a 1080p film
  [int]$Quality = 74
)

$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = if ([IO.Path]::IsPathRooted($Video)) { $Video } else { Join-Path $root $Video }
if (-not (Test-Path -LiteralPath $src)) { throw "Film not found: $src" }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'ffmpeg is not installed or not on PATH.' }

$frames = Join-Path $root 'assets\frames'
$d = Join-Path $frames "$Name\d"; $m = Join-Path $frames "$Name\m"
foreach ($dir in @($d, $m)) {
  if (Test-Path $dir) { Get-ChildItem $dir -Filter 'f_*.webp' | Remove-Item -Confirm:$false }
  New-Item -ItemType Directory -Force $dir | Out-Null
}

# Desktop: the full 16:9 frame. Mobile: a native-resolution 9:16 crop around the centered subject.
ffmpeg -hide_banner -loglevel error -y -i $src -an -vf "fps=$Fps,scale=${DesktopWidth}:-2:flags=lanczos" -c:v libwebp -quality $Quality -compression_level 6 (Join-Path $d 'f_%04d.webp')
ffmpeg -hide_banner -loglevel error -y -i $src -an -vf "fps=$Fps,crop=ih*9/16:ih,scale=${MobileWidth}:-2:flags=lanczos" -c:v libwebp -quality $Quality -compression_level 6 (Join-Path $m 'f_%04d.webp')

$dc = (Get-ChildItem $d -Filter 'f_*.webp').Count
$mc = (Get-ChildItem $m -Filter 'f_*.webp').Count
if ($dc -eq 0) { throw 'ffmpeg produced no frames.' }

# merge into the manifest, keeping the other films
$manifest = [ordered]@{}
$path = Join-Path $frames 'frames.json'
if (Test-Path $path) { (Get-Content $path -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $manifest[$_.Name] = $_.Value } }
$manifest[$Name] = [ordered]@{
  desktop = [ordered]@{ dir = "assets/frames/$Name/d"; count = $dc; ext = 'webp'; pad = 4 }
  mobile  = [ordered]@{ dir = "assets/frames/$Name/m"; count = $mc; ext = 'webp'; pad = 4 }
}
# no BOM: browsers refuse JSON that starts with one
[IO.File]::WriteAllText($path, ($manifest | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))

$dmb = [math]::Round(((Get-ChildItem $d -Filter '*.webp' | Measure-Object Length -Sum).Sum / 1MB), 1)
$mmb = [math]::Round(((Get-ChildItem $m -Filter '*.webp' | Measure-Object Length -Sum).Sum / 1MB), 1)
"[$Name] $dc desktop frames ($dmb MB) + $mc mobile frames ($mmb MB)"
