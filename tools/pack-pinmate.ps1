$ErrorActionPreference='Stop'
$src = $PSScriptRoot
if (-not (Test-Path (Join-Path $src 'manifest.json'))) { $src = 'd:\迅雷下载\vibe coding\Chrome Extensions\PinMate' }
$out = 'd:\迅雷下载\vibe coding\PinMate-1.1.3.zip'
$excludes = @('.git', '.codebuddy', 'assets\proposals', 'store-assets', 'tools', 'STORE-ASSETS-GUIDE.md', 'pinmate-1.1.3.zip', '微信赞赏码.png', 'logo.jpeg', 'README.md', 'LICENSE')
function ShouldExclude($rel) {
  foreach ($e in $excludes) {
    $n = $e.Replace('\', '/')
    if ($rel -eq $n) { return $true }
    if ($rel.StartsWith($n + '/')) { return $true }
  }
  return $false
}
if (Test-Path $out) { Remove-Item $out -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
$base = $src.Replace('\', '/')
foreach ($f in Get-ChildItem -Path $src -Recurse -File) {
  $fp = $f.FullName.Replace('\', '/')
  if ($fp -match '/(assets|store-assets)/.*\.(py|ps1|pyc)$') { continue }
  $rel = $fp.Substring($base.Length + 1)
  if (ShouldExclude $rel) { continue }
  [System.IO.Compression.ZipFile]::CreateEntryFromFile($zip, $f.FullName, $rel) | Out-Null
}
$zip.Dispose()
Write-Host "PACKED $((Get-Item $out).Length) bytes"
