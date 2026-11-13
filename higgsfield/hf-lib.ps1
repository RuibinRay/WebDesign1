# Helpers for generating the Hola Ola assets with the Higgsfield CLI.
# Dot-source it:  . .\higgsfield\hf-lib.ps1
$ErrorActionPreference = 'Stop'

$HF = Join-Path $env:LOCALAPPDATA 'Programs\higgsfield-cli\hf.exe'
if (-not (Test-Path $HF)) {
  $cmd = Get-Command higgsfield -ErrorAction SilentlyContinue
  if ($cmd) { $HF = $cmd.Source } else { throw 'Higgsfield CLI not found.' }
}
$HFDir = $PSScriptRoot
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Renders = Join-Path $HFDir 'renders'
New-Item -ItemType Directory -Force $Renders | Out-Null
$P = Get-Content (Join-Path $HFDir 'prompts.json') -Raw -Encoding UTF8 | ConvertFrom-Json

# Fill {PREAMBLE} and {CAN}; pass a flavor object to fill the can's colors and text.
function Expand-Prompt([string]$Text, $Flavor) {
  $can = $P.can
  if ($Flavor) { foreach ($k in 'NAME', 'SUB', 'BASE', 'INK', 'WAVE1', 'WAVE2', 'SUN') { $can = $can.Replace('{' + $k + '}', [string]$Flavor.$k) } }
  return $Text.Replace('{PREAMBLE}', $P.preamble).Replace('{CAN}', $can)
}

function Get-Flavor([string]$Id) { $P.flavors | Where-Object { $_.id -eq $Id } }

# Run one generation, wait for it, download the result to renders\<Name>.<Ext>.
function Invoke-HF {
  param([string]$Name, [string]$Model, [string]$Prompt, [string[]]$Extra = @(), [string]$Ext = 'png')
  $out = Join-Path $Renders "$Name.$Ext"
  $jsonPath = Join-Path $Renders "$Name.json"
  $cli = @('generate', 'create', $Model, '--prompt', $Prompt) + $Extra + @('--wait', '--wait-timeout', '25m', '--json')
  $raw = (& $HF @cli | Out-String)
  $code = $LASTEXITCODE
  [IO.File]::WriteAllText($jsonPath, $raw, (New-Object Text.UTF8Encoding($false)))
  if ($code -ne 0) { throw "[$Name] generation failed (exit $code): $($raw.Trim())" }
  $m = [regex]::Match($raw, '"result_url"\s*:\s*"([^"]+)"')
  if (-not $m.Success) { $m = [regex]::Match($raw, '"(https://[^"\s]+\.(?:png|webp|jpe?g|mp4|svg)[^"\s]*)"') }
  if (-not $m.Success) { throw "[$Name] no result URL in the response; see $jsonPath" }
  $url = $m.Groups[1].Value.Replace('&', '&').Replace('\/', '/')
  curl.exe -fsSL $url -o $out
  if ($LASTEXITCODE -ne 0) { throw "[$Name] download failed" }
  '{0} -> {1} ({2:N0} KB)' -f $Name, $out, ((Get-Item $out).Length / 1KB)
}

function Get-Balance { (& $HF account status | Out-String).Trim() }
