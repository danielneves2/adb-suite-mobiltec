# Baixa o Android platform-tools oficial do Google e coloca o adb no app.
# Uso (na raiz do projeto):  powershell -ExecutionPolicy Bypass -File scripts\baixar-platform-tools.ps1 [-Force]
# Resultado: src-tauri\binaries\adb\ com adb.exe, AdbWinApi.dll e AdbWinUsbApi.dll (fora do git).
param([switch]$Force)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root 'src-tauri\binaries\adb'
$files = 'adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll'

$present = $files | Where-Object { Test-Path (Join-Path $dest $_) }
if (-not $Force -and $present.Count -eq $files.Count) {
  Write-Host "adb ja esta em $dest (use -Force pra baixar de novo)."
} else {
  $url = 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip'
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ("platform-tools-" + [guid]::NewGuid())
  New-Item -ItemType Directory -Force $tmp | Out-Null
  $zip = Join-Path $tmp 'platform-tools.zip'
  Write-Host "Baixando $url ..."
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  New-Item -ItemType Directory -Force $dest | Out-Null
  foreach ($f in $files) { Copy-Item (Join-Path $tmp "platform-tools\$f") $dest -Force }
  Remove-Item -Recurse -Force $tmp
}

& (Join-Path $dest 'adb.exe') version
