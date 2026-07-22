Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName PresentationCore

$srcPath = "d:\迅雷下载\vibe coding\Chrome Extensions\PinMate\logo.jpeg"
$outDir = "d:\迅雷下载\vibe coding\Chrome Extensions\PinMate\assets\icons"

# Decode WebP using WIC (supports WebP on Win10/11)
$fs = [System.IO.File]::OpenRead($srcPath)
$decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($fs, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
$frame = $decoder.Frames[0]
$w = $frame.PixelWidth
$h = $frame.PixelHeight
Write-Host "Source: ${w}x${h}, Format=$($frame.Format)"

# Convert to BitmapSource for pixel access, then find content bounds
# Use WIC's built-in crop/transform
$cropped = $frame

# Find bounding box by checking alpha channel
# Convert to writable bitmap for pixel inspection
$pb = New-Object System.Windows.Media.Imaging.WriteableBitmap($frame)
$bytes = [byte[]]::new($pb.BackBufferStride * $h)
$pb.CopyBackBuffer($bytes)

# Find non-transparent bounds (alpha > 10)
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $idx = $y * $pb.BackBufferStride + $x * 4
        $a = $bytes[$idx + 3]  # BGRA format
        if ($a -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

# Small padding for anti-aliased edges
$pad = 2
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($w - 1, $maxX + $pad)
$maxY = [Math]::Min($h - 1, $maxY + $pad)

$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1
Write-Host "Content region: ${cw}x${ch} at ($minX,$minY)"

# Crop using CroppedBitmap
$cropRect = [System.Windows.Int32Rect]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)
$croppedBmp = New-Object System.Windows.Media.Imaging.CroppedBitmap($frame, $cropRect)

# Save each size as PNG
foreach ($sz in @(16, 48, 128)) {
    # Scale using TransformedBitmap
    $scaleX = $sz / [double]$cw
    $scaleY = $sz / [double]$ch
    $transform = New-Object System.Windows.Media.ScaleTransform($scaleX, $scaleY)
    $scaled = New-Object System.Windows.Media.Imaging.TransformedBitmap($croppedBmp, $transform)
    
    # Encode as PNG
    $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
    $enc.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($scaled))
    
    $outFile = Join-Path $outDir "icon${sz}.png"
    $ofs = [System.IO.FileStream]::new($outFile, [System.IO.FileMode]::Create)
    $enc.Save($ofs)
    $ofs.Close()
    Write-Host "  wrote icon${sz}.png (${sz}x${sz})"
}

# Save 128 preview in proposals
$previewDir = Join-Path $outDir "proposals"
if (-not (Test-Path $previewDir)) { New-Item -ItemType Directory -Path $previewDir | Out-Null }

$scaleX128 = 128 / [double]$cw
$scaleY128 = 128 / [double]$ch
$transform128 = New-Object System.Windows.Media.ScaleTransform($scaleX128, $scaleY128)
$scaled128 = New-Object System.Windows.Media.Imaging.TransformedBitmap($croppedBmp, $transform128)
$enc128 = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
$enc128.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($scaled128))
$prevPath = Join-Path $previewDir "chatgpt-icon-128.png"
$ofs128 = [System.IO.FileStream]::new($prevPath, [System.IO.FileMode]::Create)
$enc128.Save($ofs128)
$ofs128.Close()
Write-Host "  wrote chatgpt-icon-128.png (preview)"

$fs.Close()
Write-Host "`nDone! Icons replaced."
