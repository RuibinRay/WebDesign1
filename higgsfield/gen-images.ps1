# Generates the still images for the Hola Ola site on Higgsfield, a few at a time.
# Skips anything already rendered, so it is safe to re-run after a failure.
# Usage:  powershell -ExecutionPolicy Bypass -File higgsfield\gen-images.ps1 -Set cans,keyframes,elements
param(
  [string[]]$Set = @('cans', 'keyframes', 'elements'),
  [int]$Parallel = 4
)
. (Join-Path $PSScriptRoot 'hf-lib.ps1')

$hero = Join-Path $Renders 'can_golden-set.png'
if (-not (Test-Path $hero)) { throw 'Generate the golden-set can first: it is the reference for everything else.' }

$specs = @()
if ($Set -contains 'cans') {
  foreach ($f in $P.flavors | Where-Object { $_.id -ne 'golden-set' }) {
    $specs += @{ Name = "can_$($f.id)"; Model = 'gpt_image_2_6'; Ext = 'png'
      Prompt = (Expand-Prompt $P.can_render.prompt $f) + $P.can_render.reference_suffix
      Extra = "--aspect_ratio|3:4|--resolution|2k|--quality|high|--background|transparent|--output_format|png|--image|$hero" }
  }
}
if ($Set -contains 'keyframes') {
  foreach ($k in $P.keyframes.PSObject.Properties) {
    $specs += @{ Name = "key_$($k.Name)"; Model = 'gpt_image_2_6'; Ext = 'png'
      Prompt = Expand-Prompt $k.Value $null
      Extra = "--aspect_ratio|16:9|--resolution|2k|--quality|high|--output_format|png|--image|$hero" }
  }
}
if ($Set -contains 'elements') {
  foreach ($e in $P.elements.items) {
    $specs += @{ Name = "el_$($e.id)"; Model = 'gpt_image_2_6'; Ext = 'png'
      Prompt = (Expand-Prompt $e.prompt $null) + $P.elements.suffix
      Extra = '--aspect_ratio|1:1|--resolution|2k|--quality|medium|--background|transparent|--output_format|png' }
  }
}
if ($Set -contains 'lineup') {
  $refs6 = ($P.flavors | ForEach-Object { "--image|$(Join-Path $Renders "ref_can_$($_.id).png")" }) -join '|'
  foreach ($l in $P.lineup) {
    $specs += @{ Name = $l.id; Model = 'gpt_image_2_6'; Ext = 'png'
      Prompt = Expand-Prompt $l.prompt $null
      Extra = "--aspect_ratio|16:9|--resolution|2k|--quality|high|--output_format|png|$refs6" }
  }
}
if ($Set -contains 'lifestyle') {
  # smaller copies of the six cans upload faster and still carry the label design
  $refs = ($P.flavors | ForEach-Object {
      $small = Join-Path $Renders "ref_can_$($_.id).png"
      "--image|$(if (Test-Path $small) { $small } else { Join-Path $Renders "can_$($_.id).png" })"
    }) -join '|'
  foreach ($l in $P.lifestyle) {
    $specs += @{ Name = "life_$($l.id)"; Model = 'gpt_image_2_6'; Ext = 'png'
      Prompt = Expand-Prompt $l.prompt $null
      Extra = "--aspect_ratio|4:5|--resolution|2k|--quality|medium|--output_format|png|$refs" }
  }
}

$todo = @($specs | Where-Object { -not (Test-Path (Join-Path $Renders "$($_.Name).$($_.Ext)")) })
"Queued $($todo.Count) of $($specs.Count) (the rest already exist)."

$lib = Join-Path $PSScriptRoot 'hf-lib.ps1'
$jobs = @(); $i = 0
while ($i -lt $todo.Count -or $jobs.Count -gt 0) {
  while ($i -lt $todo.Count -and $jobs.Count -lt $Parallel) {
    $s = $todo[$i]; $i++
    $jobs += Start-Job -Name $s.Name -ArgumentList $lib, $s.Name, $s.Model, $s.Prompt, $s.Extra, $s.Ext -ScriptBlock {
      param($lib, $name, $model, $prompt, $extra, $ext)
      . $lib
      Invoke-HF -Name $name -Model $model -Prompt $prompt -Extra ($extra -split '\|') -Ext $ext
    }
  }
  $done = Wait-Job -Job $jobs -Any
  foreach ($j in @($done)) {
    try { Receive-Job $j -ErrorAction Stop } catch { "FAILED $($j.Name): $($_.Exception.Message)" }
    Remove-Job $j
    $jobs = @($jobs | Where-Object { $_.Id -ne $j.Id })
  }
}
Get-Balance
