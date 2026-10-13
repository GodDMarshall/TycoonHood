# Build With Marshall - read-only PC audit.
# Reads system info and prints it. Writes nothing, installs nothing, changes no settings.
# Use: open Windows PowerShell (normal, not admin), paste everything below, press Enter,
# then copy the printed lines back to Claude.

$os  = Get-CimInstance Win32_OperatingSystem
$cv  = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
"Windows : {0} {1} (build {2}.{3}, {4})" -f $os.Caption, $cv.DisplayVersion, $cv.CurrentBuild, $cv.UBR, $os.OSArchitecture
"CPU     : {0} | {1} cores / {2} threads" -f $cpu.Name.Trim(), $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors
"RAM     : {0:N1} GB total, {1:N1} GB free now" -f ($os.TotalVisibleMemorySize / 1MB), ($os.FreePhysicalMemory / 1MB)
Get-CimInstance Win32_VideoController | ForEach-Object { "GPU     : {0} | driver {1}" -f $_.Name, $_.DriverVersion }
Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0*' -ErrorAction SilentlyContinue |
  Where-Object { $_.'HardwareInformation.qwMemorySize' } |
  ForEach-Object { "VRAM    : {0} | {1:N1} GB" -f $_.DriverDesc, ($_.'HardwareInformation.qwMemorySize' / 1GB) }
Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } |
  ForEach-Object { "Disk    : {0}: {1:N0} GB free of {2:N0} GB" -f $_.Name, ($_.Free / 1GB), (($_.Used + $_.Free) / 1GB) }
$keys = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
Get-ItemProperty $keys -ErrorAction SilentlyContinue |
  Where-Object { $_.DisplayName -match 'Blender|Python|Krita|GIMP|Inkscape|DaVinci|OBS Studio|FFmpeg|Audacity|^Git\b|Steam' } |
  Sort-Object DisplayName -Unique | ForEach-Object { "App     : {0} {1}" -f $_.DisplayName, $_.DisplayVersion }
Get-AppxPackage -Name '*Blender*' -ErrorAction SilentlyContinue | ForEach-Object { "App     : {0} {1} (Microsoft Store)" -f $_.Name, $_.Version }
$exe = @(Get-ChildItem "$env:ProgramFiles\Blender Foundation\*\blender.exe", "${env:ProgramFiles(x86)}\Steam\steamapps\common\Blender\blender.exe" -ErrorAction SilentlyContinue | ForEach-Object FullName) +
       @(Get-Command blender -ErrorAction SilentlyContinue | ForEach-Object Source) | Select-Object -Unique
if ($exe) { foreach ($e in $exe) { "Blender : $e -> " + ((& $e --factory-startup --version 2>$null | Select-Object -First 1) -join '') } } else { "Blender : not found in standard locations (if you use a portable/zip Blender, tell Claude its folder)" }
