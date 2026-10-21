# Re-encodes the generated artwork into a compact, text-only form.
#
# The GitHub App's file tools can only write text, so every raster asset is
# inlined as a data URI inside assets/data/artwork.js. Two tricks keep the
# payload small:
#
#   * the icons are re-encoded as 8-bit indexed PNGs - flat vector-style
#     artwork quantises beautifully (259 KB -> 18 KB),
#   * the word illustrations are scaled to the size they are actually
#     displayed at (320 px) and saved as JPEG.
#
# Sources live in source-assets/ (git-ignored) so the repository itself stays
# 100% text - the committed build output is assets/data/artwork.js.
#
# Run:  powershell -File tools/build-artwork.ps1
param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$srcDir   = Join-Path $Root 'source-assets'
$wordDir  = Join-Path $srcDir 'words'
$outDir   = Join-Path $Root 'assets\img'
$outFile  = Join-Path $Root 'assets\data\artwork.js'
$wordSize = 320

function To-IndexedPng {
  param([string]$Path, [string]$Out)
  $src = [System.Drawing.Image]::FromFile($Path)
  $tmp = New-Object System.Drawing.Bitmap $src.Width, $src.Height
  $g = [System.Drawing.Graphics]::FromImage($tmp)
  $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $g.Dispose(); $src.Dispose()
  $rect = New-Object System.Drawing.Rectangle 0, 0, $tmp.Width, $tmp.Height
  $idx = $tmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format8bppIndexed)
  $idx.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
  $idx.Dispose(); $tmp.Dispose()
}

function To-Jpeg {
  param([System.Drawing.Image]$Source, [string]$Path, [int]$Size, [int]$Quality = 82)
  $dst = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $srcSize = [Math]::Min($Source.Width, $Source.Height)
  $srcRect = New-Object System.Drawing.Rectangle ([int](($Source.Width - $srcSize) / 2)), ([int](($Source.Height - $srcSize) / 2)), $srcSize, $srcSize
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $g.DrawImage($Source, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
           Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
  $dst.Save($Path, $codec, $params)
  $dst.Dispose()
}

function ToDataUri {
  param([string]$Path, [string]$Mime)
  # The "data:" prefix is mandatory - without it the browser treats the value
  # as a relative URL and the image 404s.
  return "data:$Mime;base64," + [Convert]::ToBase64String([IO.File]::ReadAllBytes($Path))
}

$entries = @{}
$tmpDir = Join-Path $env:TEMP ("ejaan-art-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

Write-Output 'Icons:'
foreach ($size in 192, 512) {
  $src = Join-Path $srcDir "icon-$size.png"
  if (-not (Test-Path $src)) { continue }
  $indexed = Join-Path $tmpDir "icon-$size.png"
  To-IndexedPng -Path $src -Out $indexed
  $entries["icon$size"] = ToDataUri -Path $indexed -Mime 'image/png'
  Write-Output ("  icon-{0}.png  {1,8} -> {2,8} bytes" -f $size, (Get-Item $src).Length, (Get-Item $indexed).Length)
}

Write-Output ''
Write-Output 'Word illustrations:'
Get-ChildItem $wordDir -File | ForEach-Object {
  $src = [System.Drawing.Image]::FromFile($_.FullName)
  $out = Join-Path $tmpDir ($_.BaseName + '.jpg')
  To-Jpeg -Source $src -Path $out -Size $wordSize
  $src.Dispose()
  $entries[$_.BaseName] = ToDataUri -Path $out -Mime 'image/jpeg'
  Write-Output ("  {0,-22} {1,8} -> {2,8} bytes" -f $_.BaseName, $_.Length, (Get-Item $out).Length)
}

# A standalone SVG so the app bar and the manifest can point at a real file
# instead of a giant inline data URI.
$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192" role="img" aria-label="Ejaan Kids">
  <title>Ejaan Kids</title>
  <image width="192" height="192" href="$($entries['icon192'])" />
</svg>
"@
$svgPath = Join-Path $outDir 'icon.svg'
[IO.File]::WriteAllText($svgPath, $svg, (New-Object Text.UTF8Encoding($false)))
Write-Output ''
Write-Output ("Wrote {0} ({1:N0} bytes)" -f $svgPath, (Get-Item $svgPath).Length)

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('/**')
$lines.Add(' * Ejaan Kids — inline artwork (generated)')
$lines.Add(' * ---------------------------------------------------------------------------')
$lines.Add(' * Every image is embedded as a data URI so the whole app can be served from a')
$lines.Add(' * handful of text files. That keeps the repository lightweight, makes the app')
$lines.Add(' * work perfectly offline, and means the artwork can never 404.')
$lines.Add(' *')
$lines.Add(' * Regenerate with:  powershell -File tools/build-artwork.ps1')
$lines.Add(' */')
$lines.Add('(function (global) {')
$lines.Add("  'use strict';")
$lines.Add('')
$lines.Add('  var ARTWORK = {')
$lines.Add("    version: '3.0.0',")
foreach ($key in ($entries.Keys | Sort-Object)) {
  $lines.Add("    '$key': '$($entries[$key])',")
}
$lines.Add('  };')
$lines.Add('')
$lines.Add('  global.EjaanKidsArtwork = ARTWORK;')
$lines.Add("})(typeof window !== 'undefined' ? window : globalThis);")
$lines.Add('')

[IO.File]::WriteAllText($outFile, ($lines -join "`n"), (New-Object Text.UTF8Encoding($false)))
Write-Output ("Wrote {0} ({1:N0} bytes)" -f $outFile, (Get-Item $outFile).Length)

Remove-Item $tmpDir -Recurse -Force
