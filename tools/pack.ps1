param(
    [string]$OutFile = ""
)
$ErrorActionPreference = 'Stop'
$src = Split-Path $PSScriptRoot -Parent
$tmp = Join-Path $env:TEMP "PinMate-build"
if ($OutFile -eq "") {
    $out = Join-Path (Split-Path (Split-Path $src -Parent) -Parent) "PinMate-1.1.2.zip"
} else {
    $out = $OutFile
}

if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

# Whitelist copy: only runtime files
$copy = @('manifest.json','popup.html','settings.html','_locales','js','css')
foreach ($c in $copy) {
    Copy-Item -Path (Join-Path $src $c) -Destination (Join-Path $tmp $c) -Recurse -Force
}

# Copy only root-level icon png (exclude proposals/ and __pycache__)
$iconSrc = Join-Path $src 'assets\icons'
$iconDst = Join-Path $tmp 'assets\icons'
New-Item -ItemType Directory -Path $iconDst -Force | Out-Null
Get-ChildItem -Path $iconSrc -File -Filter *.png | Copy-Item -Destination $iconDst -Force

# Copy reward QR code
Copy-Item -Path (Join-Path $src 'assets\wechat-reward.png') -Destination (Join-Path $tmp 'assets') -Force

# Build zip
if (Test-Path $out) { Remove-Item $out -Force }
Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $out -Force

Write-Output ("SIZE: " + (Get-Item $out).Length + " bytes")
Write-Output "=== ZIP CONTENTS ==="
Get-ChildItem -Path $tmp -Recurse -File | ForEach-Object { $_.FullName.Substring($tmp.Length + 1) } | Sort-Object
