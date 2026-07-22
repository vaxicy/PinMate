"""Crop transparent padding + generate 16/48/128 using System.Drawing (no external deps).
Run with: powershell -ExecutionPolicy Bypass -File process_chatgpt_icon.ps1
"""
import subprocess
import sys

# Actually let's just do it in PowerShell directly
ps_script = r'''
Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "..\icons\proposals\chatgpt-logo-source.png"
$outDir = Join-Path $PSScriptRoot "..\icons"

# Load image (JPEG or PNG)
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $src))
Write-Host "Source size: $($bmp.Width)x$($bmp.Height)"

# Find bounding box of non-transparent (or non-white-ish) pixels
# For JPEG (no alpha), find the content bounds by checking color distance from white
$minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
$isAlpha = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb -eq $bmp.PixelFormat `
       -or [System.Drawing.Imaging.PixelFormat]::Format32bppPArgb -eq $bmp.PixelFormat

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $px = $bmp.GetPixel($x, $y)
        if ($isAlpha) {
            if ($px.A -gt 10) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        } else {
            # JPEG: treat non-white as content
            if ($px.R -lt 250 -or $px.G -lt 250 -or $px.B -lt 250) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
}

# Add small padding
$pad = 4
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad)
$maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)

$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1
Write-Host "Cropped region: ${cw}x${ch} at ($minX,$minY)-($maxX,$maxY)"

# Crop
$croppedRect = [System.Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)
$cropped = $bmp.Clone($croppedRect, $bmp.PixelFormat)

foreach ($sz in @(16, 48, 128)) {
    $resized = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($cropped, 0, 0, $sz, $sz)
    $g.Dispose()
    
    $outPath = Join-Path $outDir "icon${sz}.png"
    $resized.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "  wrote icon${sz}.png (${sz}x${sz})"
    $resized.Dispose()
}

# Save 128 preview in proposals
$previewDir = Split-Path $src
$prev128 = New-Object System.Drawing.Bitmap(128, 128)
$gv = [System.Drawing.Graphics]::FromImage($prev128)
$gv.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gv.DrawImage($cropped, 0, 0, 128, 128)
$gv.Dispose()
$prevPath = Join-Path $previewDir "chatgpt-icon-128.png"
$prev128.Save($prevPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "  wrote chatgpt-icon-128.png (preview)"
$prev128.Dispose()

$cropped.Dispose()
$bmp.Dispose()
Write-Host "`nDone! Icons replaced."
'''

script_path = r'd:\迅雷下载\vibe coding\Chrome Extensions\PinMate\assets\process_chatgpt_icon.ps1'
with open(script_path, 'w', encoding='utf-8') as f:
    f.write(ps_script)
print(f"Written: {script_path}")
