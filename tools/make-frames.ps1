# Splits one Higgsfield film into the frame-by-frame images a scroll section scrubs through,
# and records it in assets/frames/frames.json under the film's name (day, burst, crack, ...).
# Needs ffmpeg on PATH.
#
#   Desktop + phone crop from one 16:9 film:
#     powershell -ExecutionPolicy Bypass -File tools\make-frames.ps1 -Name day -Video higgsfield\renders\film_day.mp4
#   Phone frames from a film shot vertically (9:16), leaving the desktop frames alone:
#     powershell -ExecutionPolicy Bypass -File tools\make-frames.ps1 -Name day -MobileVideo higgsfield\renders\film_day_phone.mp4 -MobileOnly -MobileWidth 720
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Video = '',
  [string]$MobileVideo = '',   # a native 9:16 film for phones; without it the phone set is a crop of -Video
  [switch]$MobileOnly,         # only rebuild the phone set
  # Retime the phone film so its moments land where the page's captions expect them.
  # Pairs of scroll-progress:film-position, e.g. "0:0,.5:.38,1:1" shows the film's 38% point at 50% scroll.
  [string]$MobileRemap = '',
  [int]$MobileFrames = 150,    # how many phone frames to keep when -MobileRemap is used
  [int]$Fps = 15,
  [int]$DesktopWidth = 1920,
  [int]$MobileWidth = 608,     # native width of a 9:16 crop from a 1080p film
  [int]$Quality = 74
)

$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'ffmpeg is not installed or not on PATH.' }
function Resolve-Film([string]$p) {
  if (-not $p) { return '' }
  $full = if ([IO.Path]::IsPathRooted($p)) { $p } else { Join-Path $root $p }
  if (-not (Test-Path -LiteralPath $full)) { throw "Film not found: $full" }
  return $full
}
$src = Resolve-Film $Video
$msrc = Resolve-Film $MobileVideo
if (-not $MobileOnly -and -not $src) { throw 'Pass -Video (or -MobileOnly with -MobileVideo).' }
if ($MobileOnly -and -not $msrc -and -not $src) { throw 'Pass -MobileVideo or -Video.' }

$frames = Join-Path $root 'assets\frames'
$d = Join-Path $frames "$Name\d"; $m = Join-Path $frames "$Name\m"
function Reset-Dir([string]$dir) {
  if (Test-Path $dir) { Get-ChildItem $dir -Filter 'f_*.webp' | Remove-Item -Confirm:$false }
  New-Item -ItemType Directory -Force $dir | Out-Null
}

# Desktop: the full 16:9 frame.
if (-not $MobileOnly) {
  Reset-Dir $d
  ffmpeg -hide_banner -loglevel error -y -i $src -an -vf "fps=$Fps,scale=${DesktopWidth}:-2:flags=lanczos" -c:v libwebp -quality $Quality -compression_level 6 (Join-Path $d 'f_%04d.webp')
}
# Phone: a film shot vertically if there is one, otherwise a 9:16 crop around the centered subject.
Reset-Dir $m
if ($msrc -and $MobileRemap) {
  # write every source frame once, then pick the ones the retiming curve asks for
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('holaola_frames_' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force $tmp | Out-Null
  ffmpeg -hide_banner -loglevel error -y -i $msrc -an -vf "scale=${MobileWidth}:-2:flags=lanczos" -c:v libwebp -quality $Quality -compression_level 6 (Join-Path $tmp 's_%04d.webp')
  $all = @(Get-ChildItem $tmp -Filter 's_*.webp' | Sort-Object Name)
  $pts = @($MobileRemap -split ',' | ForEach-Object { $a = $_ -split ':'; , @([double]$a[0], [double]$a[1]) })
  for ($i = 0; $i -lt $MobileFrames; $i++) {
    [double]$p = $i / [math]::Max(1, $MobileFrames - 1)
    $k = 0; while ($k -lt $pts.Count - 2 -and $p -gt $pts[$k + 1][0]) { $k++ }
    # keep everything [double]: mixing int and double arguments in [math]::Min/Max rounds the result
    [double]$t = ($p - $pts[$k][0]) / ($pts[$k + 1][0] - $pts[$k][0])
    if ($t -lt 0) { $t = 0.0 } elseif ($t -gt 1) { $t = 1.0 }
    [double]$s = $pts[$k][1] + ($pts[$k + 1][1] - $pts[$k][1]) * $t
    Copy-Item $all[[int][math]::Round($s * ($all.Count - 1))].FullName (Join-Path $m ('f_{0:D4}.webp' -f ($i + 1)))
  }
  Remove-Item -Recurse -Force $tmp -Confirm:$false
} elseif ($msrc) {
  ffmpeg -hide_banner -loglevel error -y -i $msrc -an -vf "fps=$Fps,scale=${MobileWidth}:-2:flags=lanczos" -c:v libwebp -quality $Quality -compression_level 6 (Join-Path $m 'f_%04d.webp')
} else {
  ffmpeg -hide_banner -loglevel error -y -i $src -an -vf "fps=$Fps,crop=ih*9/16:ih,scale=${MobileWidth}:-2:flags=lanczos" -c:v libwebp -quality $Quality -compression_level 6 (Join-Path $m 'f_%04d.webp')
}

$dc = @(Get-ChildItem $d -Filter 'f_*.webp' -ErrorAction SilentlyContinue).Count
$mc = @(Get-ChildItem $m -Filter 'f_*.webp').Count
if ($mc -eq 0 -or (-not $MobileOnly -and $dc -eq 0)) { throw 'ffmpeg produced no frames.' }

# merge into the manifest, keeping the other films (and this film's desktop set when only the phone set changed)
$manifest = [ordered]@{}
$path = Join-Path $frames 'frames.json'
if (Test-Path $path) { (Get-Content $path -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $manifest[$_.Name] = $_.Value } }
$desktop = if ($MobileOnly -and $manifest[$Name]) { $manifest[$Name].desktop } else { [ordered]@{ dir = "assets/frames/$Name/d"; count = $dc; ext = 'webp'; pad = 4 } }
$manifest[$Name] = [ordered]@{
  desktop = $desktop
  mobile  = [ordered]@{ dir = "assets/frames/$Name/m"; count = $mc; ext = 'webp'; pad = 4 }
}
# no BOM: browsers refuse JSON that starts with one
[IO.File]::WriteAllText($path, ($manifest | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))

$mmb = [math]::Round(((Get-ChildItem $m -Filter '*.webp' | Measure-Object Length -Sum).Sum / 1MB), 1)
"[$Name] $dc desktop frames, $mc phone frames ($mmb MB)"
