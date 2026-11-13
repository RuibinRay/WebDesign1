# Splits one Higgsfield film into the frame-by-frame images a scroll section scrubs through,
# and records it in assets/frames/frames.json under the film's name (day, burst, crack, ...).
# Needs ffmpeg on PATH.
#
# How the site's frames were made (run from the project folder):
#   .\tools\make-frames.ps1 -Name day   -Video higgsfield\renders\film_day.mp4   -DesktopOnly -FirstStill higgsfield\renders\key_day_start.png -LastStill higgsfield\renders\key_day_end.png
#   .\tools\make-frames.ps1 -Name day   -MobileVideo higgsfield\renders\film_day_phone.mp4 -MobileOnly -MobileWidth 720 -Quality 80 -MobileRemap "0:0,.15:.12,.48:.38,.68:.58,.76:.67,1:1" -MobileFirstStill higgsfield\renders\key_phone_start.png -MobileLastStill higgsfield\renders\key_phone_end.png
#   .\tools\make-frames.ps1 -Name burst -Video higgsfield\renders\film_burst.mp4 -Fps 18 -FirstStill higgsfield\renders\key_burst_start.png
#   .\tools\make-frames.ps1 -Name crack -Video higgsfield\renders\film_crack.mp4 -Fps 18 -FirstStill higgsfield\renders\key_crack_start.png
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Video = '',
  [string]$MobileVideo = '',   # a native 9:16 film for phones; without it the phone set is a crop of -Video
  [switch]$MobileOnly,         # only rebuild the phone set
  [switch]$DesktopOnly,        # only rebuild the desktop set
  # Retime the phone film so its moments land where the page's captions expect them.
  # Pairs of scroll-progress:film-position, e.g. "0:0,.5:.38,1:1" shows the film's 38% point at 50% scroll.
  [string]$MobileRemap = '',
  [int]$MobileFrames = 150,    # how many phone frames to keep when -MobileRemap is used
  [int]$Fps = 15,
  [int]$DesktopWidth = 0,      # 0 keeps the film's own width: resampling it only softens the picture
  [int]$MobileWidth = 608,     # native width of a 9:16 crop from a 1080p film
  [int]$Quality = 84,
  [double]$Sharpen = 0.7,      # light sharpening to undo video softness; 0 turns it off
  # The sharp original images a film was generated from. They replace its first / last frame,
  # which is where the page rests, so the can is crisp whenever nothing is moving.
  [string]$FirstStill = '',
  [string]$LastStill = '',
  [string]$MobileFirstStill = '',
  [string]$MobileLastStill = '',
  [int]$StillWidth = 2560,
  [int]$MobileStillWidth = 1080
)

$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'ffmpeg is not installed or not on PATH.' }
function Resolve-Source([string]$p) {
  if (-not $p) { return '' }
  $full = if ([IO.Path]::IsPathRooted($p)) { $p } else { Join-Path $root $p }
  if (-not (Test-Path -LiteralPath $full)) { throw "Not found: $full" }
  return $full
}
$src = Resolve-Source $Video
$msrc = Resolve-Source $MobileVideo
$first = Resolve-Source $FirstStill; $last = Resolve-Source $LastStill
$mfirst = Resolve-Source $MobileFirstStill; $mlast = Resolve-Source $MobileLastStill
if ($MobileOnly -and $DesktopOnly) { throw 'Use -MobileOnly or -DesktopOnly, not both.' }
if (-not $MobileOnly -and -not $src) { throw 'Pass -Video (or -MobileOnly with -MobileVideo).' }
if ($MobileOnly -and -not $msrc -and -not $src) { throw 'Pass -MobileVideo or -Video.' }

$frames = Join-Path $root 'assets\frames'
$d = Join-Path $frames "$Name\d"; $m = Join-Path $frames "$Name\m"
function Reset-Dir([string]$dir) {
  if (Test-Path $dir) { Get-ChildItem $dir -Filter 'f_*.webp' | Remove-Item -Confirm:$false }
  New-Item -ItemType Directory -Force $dir | Out-Null
}
function Write-Frames([string]$film, [string]$vf, [string]$pattern) {
  ffmpeg -hide_banner -loglevel error -y -i $film -an -vf $vf -c:v libwebp -quality $Quality -compression_level 6 $pattern
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed on $film" }
}
function Write-Still([string]$still, [string]$vf, [string]$dest) {
  ffmpeg -hide_banner -loglevel error -y -i $still -vf $vf -frames:v 1 -c:v libwebp -quality 88 -compression_level 6 $dest
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed on $still" }
}
$sharp = if ($Sharpen -gt 0) { ",unsharp=5:5:${Sharpen}:5:5:0.0" } else { '' }

# ---- desktop: the full 16:9 frame ----
if (-not $MobileOnly) {
  Reset-Dir $d
  $scale = if ($DesktopWidth -gt 0) { ",scale=${DesktopWidth}:-2:flags=lanczos" } else { '' }
  Write-Frames $src "fps=$Fps$scale$sharp" (Join-Path $d 'f_%04d.webp')
  $n = @(Get-ChildItem $d -Filter 'f_*.webp').Count
  if ($n -eq 0) { throw 'ffmpeg produced no desktop frames.' }
  $stillVf = "scale=w='min(iw,$StillWidth)':h=-2:flags=lanczos"
  if ($first) { Write-Still $first $stillVf (Join-Path $d 'f_0001.webp') }
  if ($last) { Write-Still $last $stillVf (Join-Path $d ('f_{0:D4}.webp' -f $n)) }
}

# ---- phone: a film shot vertically if there is one, otherwise a 9:16 crop around the centered subject ----
if (-not $DesktopOnly) {
  Reset-Dir $m
  $mStillVf = "scale=w='min(iw,$MobileStillWidth)':h=-2:flags=lanczos"
  if ($msrc -and $MobileRemap) {
    # write every source frame once, then pick the ones the retiming curve asks for
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ('holaola_frames_' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force $tmp | Out-Null
    Write-Frames $msrc "scale=${MobileWidth}:-2:flags=lanczos$sharp" (Join-Path $tmp 's_%04d.webp')
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
    Write-Frames $msrc "fps=$Fps,scale=${MobileWidth}:-2:flags=lanczos$sharp" (Join-Path $m 'f_%04d.webp')
  } else {
    Write-Frames $src "fps=$Fps,crop=ih*9/16:ih,scale=${MobileWidth}:-2:flags=lanczos$sharp" (Join-Path $m 'f_%04d.webp')
    # no vertical stills given: crop the wide ones the same way the film was cropped
    $mStillVf = "crop=ih*9/16:ih,$mStillVf"
    if (-not $mfirst) { $mfirst = $first }
    if (-not $mlast) { $mlast = $last }
  }
  $n = @(Get-ChildItem $m -Filter 'f_*.webp').Count
  if ($n -eq 0) { throw 'ffmpeg produced no phone frames.' }
  if ($mfirst) { Write-Still $mfirst $mStillVf (Join-Path $m 'f_0001.webp') }
  if ($mlast) { Write-Still $mlast $mStillVf (Join-Path $m ('f_{0:D4}.webp' -f $n)) }
}

# ---- manifest: keep the other films, and the half of this film that was not rebuilt ----
$manifest = [ordered]@{}
$path = Join-Path $frames 'frames.json'
if (Test-Path $path) { (Get-Content $path -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $manifest[$_.Name] = $_.Value } }
$old = $manifest[$Name]
$dc = @(Get-ChildItem $d -Filter 'f_*.webp' -ErrorAction SilentlyContinue).Count
$mc = @(Get-ChildItem $m -Filter 'f_*.webp' -ErrorAction SilentlyContinue).Count
$manifest[$Name] = [ordered]@{
  desktop = if ($MobileOnly -and $old) { $old.desktop } else { [ordered]@{ dir = "assets/frames/$Name/d"; count = $dc; ext = 'webp'; pad = 4 } }
  mobile  = if ($DesktopOnly -and $old) { $old.mobile } else { [ordered]@{ dir = "assets/frames/$Name/m"; count = $mc; ext = 'webp'; pad = 4 } }
}
# no BOM: browsers refuse JSON that starts with one
[IO.File]::WriteAllText($path, ($manifest | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))

function Size-MB([string]$dir) { if (Test-Path $dir) { [math]::Round(((Get-ChildItem $dir -Filter '*.webp' | Measure-Object Length -Sum).Sum / 1MB), 1) } else { 0 } }
"[$Name] desktop: $dc frames, $(Size-MB $d) MB | phone: $mc frames, $(Size-MB $m) MB"
