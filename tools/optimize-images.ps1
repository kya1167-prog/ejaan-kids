# Optimises the generated artwork for the web.
#   - word illustrations -> 400x400 JPEG (quality 84)
#   - app icon           -> 512x512 + 192x192 PNG, circular mask on brand colour
#
# Sources and outputs live in source-assets/ (git-ignored) so the repository
# itself stays 100% text. The committed result of this step is only consumed
# by tools/build-artwork.ps1.
#
#   source-assets/raw/icon.png      raw generated artwork
#   source-assets/raw/words/*.png   raw generated word illustrations
#
# Run:  powershell -File tools/optimize-images.ps1
param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$rawDir   = Join-Path $Root 'source-assets\raw'
$imgDir   = Join-Path $Root 'source-assets'
$wordDir  = Join-Path $imgDir 'words'

function New-ResizedBitmap {
  param(
    [System.Drawing.Image]$Source,
    [int]$Size,
    [switch]$Circular,
    [string]$Background = '#C9C6F2'
  )
  $dst = New-Object System.Drawing.Bitmap $Size, $Size
  $dst.SetResolution(96, 96)
  $g = [System.Drawing.Graphics]::FromImage($dst)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality= [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $bg = [System.Drawing.ColorTranslator]::FromHtml($Background)
  $g.Clear($bg)

  if ($Circular) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $Size, $Size)
    $g.SetClip($path)
  }

  # Cover-fit: crop the source square to the destination square.
  $srcSize = [Math]::Min($Source.Width, $Source.Height)
  $srcX = [int](($Source.Width  - $srcSize) / 2)
  $srcY = [int](($Source.Height - $srcSize) / 2)
  $srcRect = New-Object System.Drawing.Rectangle $srcX, $srcY, $srcSize, $srcSize
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $g.DrawImage($Source, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

  if ($Circular) { $g.ResetClip() }
  $g.Dispose()
  return $dst
}

function Save-Jpeg {
  param([System.Drawing.Image]$Image, [string]$Path, [int]$Quality = 84)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
           Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
  $Image.Save($Path, $codec, $params)
}

$before = 0
$after  = 0

Write-Output 'Word illustrations:'
Get-ChildItem (Join-Path $rawDir 'words') -File | ForEach-Object {
  $before += $_.Length
  $src = [System.Drawing.Image]::FromFile($_.FullName)
  $out = New-ResizedBitmap -Source $src -Size 400
  # Release the source file handle before writing: some sources are already
  # .jpg, and GDI+ cannot save over a file that is still open for reading.
  $src.Dispose()
  $dest = Join-Path $wordDir ($_.BaseName + '.jpg')
  Save-Jpeg -Image $out -Path $dest -Quality 84
  $out.Dispose()
  if ($dest -ne $_.FullName) { Remove-Item $_.FullName -Force }
  $after += (Get-Item $dest).Length
  Write-Output ("  {0,-22} {1,8} -> {2,8} bytes" -f $_.BaseName, $_.Length, (Get-Item $dest).Length)
}

Write-Output ''
Write-Output 'App icon:'
$iconPath = Join-Path $rawDir 'icon.png'
if (Test-Path $iconPath) {
  $before += (Get-Item $iconPath).Length
  $src = [System.Drawing.Image]::FromFile($iconPath)

  foreach ($size in 512, 192, 128) {
    $out = New-ResizedBitmap -Source $src -Size $size -Circular
    $src.Dispose()
    $dest = Join-Path $imgDir "icon-$size.png"
    $out.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    $after += (Get-Item $dest).Length
    Write-Output ("  icon-{0,-19} {1,8} bytes" -f "$size.png", (Get-Item $dest).Length)
    if ($size -ne 128) { $src = [System.Drawing.Image]::FromFile($iconPath) }
  }
  $src.Dispose()
  Remove-Item $iconPath -Force
}

$kb1 = [Math]::Round($before / 1KB, 1)
$kb2 = [Math]::Round($after / 1KB, 1)
Write-Output ''
Write-Output ("Total {0} KB -> {1} KB  ({2}% smaller)" -f $kb1, $kb2, [Math]::Round((1 - $after / $before) * 100))
