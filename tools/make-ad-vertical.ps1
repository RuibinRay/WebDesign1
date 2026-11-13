# Edits the 9:16 cut of the Hola Ola commercial for Instagram Reels, TikTok and Shorts.
# Same beats and soundtrack as the wide ad (run tools\make-ad.ps1 first: this reuses its audio).
#   crack-open and fruit burst : center crops of the wide films
#   the day time-lapse         : the film shot vertically for phones
#   the lineup                 : a slow pan across the sharp six-can still
#   end card                   : higgsfield\renders\endcard_vertical.png
# Needs ffmpeg on PATH. Output: assets\ad\hola-ola-ad-vertical.mp4
$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$r = Join-Path $root 'higgsfield\renders'
$wide = Join-Path $root 'assets\ad\hola-ola-ad.mp4'
$out = Join-Path $root 'assets\ad\hola-ola-ad-vertical.mp4'
foreach ($f in 'film_crack.mp4', 'film_burst.mp4', 'film_day_phone.mp4', 'key_lineup_start.png', 'endcard_vertical.png') {
  if (-not (Test-Path (Join-Path $r $f))) { throw "Missing source: $f" }
}
if (-not (Test-Path $wide)) { throw 'Run tools\make-ad.ps1 first: the vertical cut reuses its soundtrack.' }

$font = 'C\:/Windows/Fonts/georgiaz.ttf'   # Georgia Bold Italic, already on Windows
# a centered caption on a solid ink-colored bar (the can fills a tall frame, so bare text would sit on its label).
# It fades in and out inside a segment of length $d seconds and stays above the bottom fifth of the frame,
# which the apps cover with their own buttons.
function Super([string]$text, [double]$d) {
  "drawtext=fontfile='$font':text='$text':fontsize=66:fontcolor=0xFFF3DC:box=1:boxcolor=0x0A3A44@0.9:boxborderw=26:x=(w-text_w)/2:y=h*0.715:alpha='min(1\,max(0\,(t-0.25)/0.3))*min(1\,max(0\,($d-0.2-t)/0.3))'"
}
$norm = 'fps=24,setsar=1,format=yuv420p'
$cropTall = 'crop=ih*9/16:ih,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6:5:5:0.0'

$fc = @(
  "[0:v]trim=0.5:4.5,setpts=(PTS-STARTPTS)/1.3333,$cropTall,$norm,$(Super 'Crack one open.' 3.0)[v0]"
  "[1:v]trim=1.3:5.0,setpts=PTS-STARTPTS,$cropTall,$norm,$(Super 'Real fruit. Real fizz.' 3.7)[v1]"
  "[2:v]trim=0:10,setpts=(PTS-STARTPTS)/2.5,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,$norm,$(Super 'One long beach day.' 4.0)[v2]"
  # the still is scaled to the frame height, then a 9:16 window eases from the first can to the last
  "[3:v]scale=-2:1920:flags=lanczos,crop=1080:1920:x='278+1759*(0.5-0.5*cos(PI*t/4.0))':y=0,trim=0:4.0,setpts=PTS-STARTPTS,$norm,$(Super 'Six flavors.' 4.0)[v3]"
  "[4:v]scale=2160:3840:flags=lanczos,zoompan=z='1+0.035*on/77':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=77:s=1080x1920:fps=24,trim=0:3.2,setpts=PTS-STARTPTS,setsar=1,format=yuv420p,settb=AVTB[v4]"
  # xfade needs both inputs on the same timebase
  "[v0][v1][v2][v3]concat=n=4:v=1:a=0,fps=24,settb=AVTB[main]"
  "[main][v4]xfade=transition=fade:duration=0.4:offset=14.3[v]"
) -join ';'

ffmpeg -hide_banner -loglevel error -y `
  -i (Join-Path $r 'film_crack.mp4') -i (Join-Path $r 'film_burst.mp4') -i (Join-Path $r 'film_day_phone.mp4') `
  -loop 1 -framerate 24 -t 4.2 -i (Join-Path $r 'key_lineup_start.png') `
  -i (Join-Path $r 'endcard_vertical.png') -i $wide `
  -filter_complex $fc -map '[v]' -map '5:a' -t 17.5 `
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a copy -movflags +faststart $out
if ($LASTEXITCODE -ne 0) { throw 'ffmpeg failed while editing the vertical ad.' }

$info = ffprobe -v error -show_entries format=duration,size -of csv=p=0 $out
"vertical ad written: $out ($info)"
