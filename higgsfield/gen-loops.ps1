# Generates one short looping video per flavor (fruit drifting in slow motion on the flavor's accent color)
# for the flavor picker. Start frames are renders\key_loop_<id>.png. Two at a time: the Starter plan's video limit.
# Skips anything already rendered. Usage:  & .\higgsfield\gen-loops.ps1 [-Only golden-set,pina-colada]
param([string[]]$Only = @(), [int]$Parallel = 2)
. (Join-Path $PSScriptRoot 'hf-lib.ps1')

$things = [ordered]@{
  'golden-set'    = 'Mango cheeks scored into cubes, loose mango cubes, halved passion fruit and golden juice droplets'
  'pina-colada'   = 'A cracked coconut half, golden pineapple wedges and an arc of clear coconut water'
  'dawn-patrol'   = 'Glossy roasted coffee beans, cracked cacao nibs and a ribbon of cold brew coffee'
  'low-tide-lime' = 'Halved mandarin limes, lime wedges, flaky sea salt crystals and juice droplets'
  'sunset-sandia' = 'Watermelon wedges, watermelon cubes, red hibiscus flowers and pink juice droplets'
  'midnight-mora' = 'Plump blackberries, slices of fresh ginger, mint leaves and dark purple juice droplets'
}
$tail = ' float weightlessly in mid-air against a seamless flat studio backdrop, filmed in extreme slow motion as if at 1000 frames per second with a locked-off camera. The pieces tumble and rotate very slowly and drift gently apart from the center toward the edges of the frame, while droplets hang and sparkle between them. The backdrop stays a perfectly even solid color with no shadows, no floor and no gradient. Soft even studio light, crisp focus, minimal motion blur. No hands, no people, no containers, no cans, no text.'

$todo = @($things.Keys | Where-Object { ($Only.Count -eq 0 -or $Only -contains $_) -and -not (Test-Path (Join-Path $Renders "loop_$_.mp4")) })
"Queued $($todo.Count) loop videos."

$lib = Join-Path $PSScriptRoot 'hf-lib.ps1'
$jobs = @(); $i = 0
while ($i -lt $todo.Count -or $jobs.Count -gt 0) {
  while ($i -lt $todo.Count -and $jobs.Count -lt $Parallel) {
    $id = $todo[$i]; $i++
    $jobs += Start-Job -Name $id -ArgumentList $lib, $id, ($things[$id] + $tail) -ScriptBlock {
      param($lib, $id, $prompt)
      . $lib
      Invoke-HF -Name "loop_$id" -Model 'kling4_0' -Prompt $prompt -Ext 'mp4' -Extra @(
        '--mode', 'image-to-video', '--resolution', '1080p', '--duration', '5', '--aspect_ratio', '1:1',
        '--start-image', (Join-Path $Renders "key_loop_$id.png"))
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
