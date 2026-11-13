# Edits the Hola Ola commercial from the Higgsfield films: crack-open hook, fruit burst,
# the day time-lapse, the six-can lineup, then the end card. Music under, can and splash sound on top.
# Needs ffmpeg on PATH. Output: assets\ad\hola-ola-ad.mp4
$ErrorActionPreference = 'Stop'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$r = Join-Path $root 'higgsfield\renders'
$out = Join-Path $root 'assets\ad\hola-ola-ad.mp4'
New-Item -ItemType Directory -Force (Split-Path $out) | Out-Null
foreach ($f in 'film_crack.mp4', 'film_burst.mp4', 'film_day.mp4', 'film_lineup.mp4', 'endcard.png', 'ad_music.mp3') {
  if (-not (Test-Path (Join-Path $r $f))) { throw "Missing source: $f" }
}

$font = 'C\:/Windows/Fonts/georgiaz.ttf'   # Georgia Bold Italic, already on Windows
# a caption that fades in and out inside a segment of length $d seconds
function Super([string]$text, [double]$d) {
  "drawtext=fontfile='$font':text='$text':fontsize=80:fontcolor=0xFFF3DC:shadowcolor=black@0.5:shadowx=0:shadowy=5:x=110:y=h-210:alpha='min(1\,max(0\,(t-0.25)/0.3))*min(1\,max(0\,($d-0.2-t)/0.3))'"
}
$norm = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,setsar=1,format=yuv420p'

$fc = @(
  # 1. hook: the can cracks open (4.0 s of footage played in 3.0 s)
  "[0:v]trim=0.5:4.5,setpts=(PTS-STARTPTS)/1.3333,$norm,$(Super 'Crack one open.' 3.0)[v0]"
  # 2. the fruit burst at full slow motion (3.7 s)
  "[1:v]trim=1.3:5.0,setpts=PTS-STARTPTS,$norm,$(Super 'Real fruit. Real fizz.' 3.7)[v1]"
  # 3. the whole day as a time-lapse (10 s played in 4.0 s)
  "[2:v]trim=0:10,setpts=(PTS-STARTPTS)/2.5,$norm,$(Super 'One long beach day.' 4.0)[v2]"
  # 4. the lineup (5 s played in 4.0 s)
  "[3:v]trim=0:5,setpts=(PTS-STARTPTS)/1.25,$norm,$(Super 'Six flavors.' 4.0)[v3]"
  # 5. end card with a slow push-in (3.2 s)
  "[4:v]scale=3840:2160:flags=lanczos,zoompan=z='1+0.035*on/77':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=77:s=1920x1080:fps=24,trim=0:3.2,setpts=PTS-STARTPTS,setsar=1,format=yuv420p,settb=AVTB[v4]"
  # xfade needs both inputs on the same timebase
  "[v0][v1][v2][v3]concat=n=4:v=1:a=0,fps=24,settb=AVTB[main]"
  "[main][v4]xfade=transition=fade:duration=0.4:offset=14.3[v]"
  # sound: the can crack and the splash from the films, music under everything
  "[0:a]atrim=0.5:4.5,asetpts=PTS-STARTPTS,atempo=1.3333,volume=0.55[a0]"
  "[1:a]atrim=1.3:5.0,asetpts=PTS-STARTPTS,volume=0.5[a1]"
  "[a0][a1]concat=n=2:v=0:a=1,apad=whole_dur=17.5[sfx]"
  "[5:a]atrim=0:17.5,asetpts=PTS-STARTPTS,volume=0.85,afade=t=in:d=0.08,afade=t=out:st=16.2:d=1.3[mus]"
  "[mus][sfx]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.93[a]"
) -join ';'

ffmpeg -hide_banner -loglevel error -y `
  -i (Join-Path $r 'film_crack.mp4') -i (Join-Path $r 'film_burst.mp4') -i (Join-Path $r 'film_day.mp4') -i (Join-Path $r 'film_lineup.mp4') `
  -loop 1 -framerate 24 -t 4 -i (Join-Path $r 'endcard.png') -i (Join-Path $r 'ad_music.mp3') `
  -filter_complex $fc -map '[v]' -map '[a]' -t 17.5 `
  -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart $out
if ($LASTEXITCODE -ne 0) { throw 'ffmpeg failed while editing the ad.' }

$info = ffprobe -v error -show_entries format=duration,size -of csv=p=0 $out
"ad written: $out ($info)"
