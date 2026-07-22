Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $scriptDir "..\logo.png"
$outDir = Join-Path $scriptDir "icons"

# Load image (JPEG or PNG)
$srcFull = Resolve-Path $src
$bmp = [System.Drawing.Bitmap]::FromFile($srcFull)
Write-Host "Source size: $($bmp.Width)x$($bmp.Height)"

# Find bounding box of NON-WHITE content (white bg = R,G,B >= 250)
$minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $px = $bmp.GetPixel($x, $y)
        # Treat near-white as background, everything else as content
        $isWhite = ($px.R -ge 250) -and ($px.G -ge 250) -and ($px.B -ge 250)
        if (-not $isWhite) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

# Small padding to keep anti-aliased edge
$pad = 2
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($bmp.Width - 1, $maxX + $pad)
$maxY = [Math]::Min($bmp.Height - 1, $maxY + $pad)

$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1
Write-Host "Cropped region: ${cw}x${ch}"

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
$previewDir = Join-Path $scriptDir "icons\proposals"
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
