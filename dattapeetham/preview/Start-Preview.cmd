@echo off
rem Datta Peetham website - local preview for Windows.
rem Double-click this file to look at the website on this computer (and on a
rem phone on the same Wi-Fi). It needs Node.js 20 or newer: https://nodejs.org
rem From a terminal you can add options, e.g.  Start-Preview.cmd --port=9000
setlocal
title Datta Peetham website - preview

rem Opened from inside the zip, Windows extracts this one file alone.
if not exist "%~dp0serve.mjs" goto notextracted
if not exist "%~dp0..\website\index.html" goto notextracted

where node >nul 2>nul
if errorlevel 1 goto nonode

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 goto oldnode

node "%~dp0serve.mjs" "%~dp0..\website" %*
if errorlevel 1 goto failed
goto done

:notextracted
echo.
echo   The preview cannot start: the files it needs are not next to it.
echo.
echo   It needs serve.mjs beside it, and the package's "website" folder next
echo   to this "preview" folder. Usually this means Start-Preview.cmd was
echo   opened from inside the zip. Then:
echo   1. Close this window.
echo   2. Right-click the zip and choose "Extract All".
echo   3. In the extracted folder, open "preview" and double-click
echo      Start-Preview.cmd again.
echo.
pause
exit /b 1

:nonode
echo.
echo   Node.js is not installed on this computer, so the preview cannot start.
echo.
echo   1. Download Node.js (the LTS version, 20 or newer) from  https://nodejs.org
echo   2. Install it with the default options.
echo   3. Double-click Start-Preview.cmd again.
echo.
echo   You do not need Node.js to put the website online: upload the contents
echo   of the "website" folder to the web server (see README-FIRST.html).
echo.
pause
exit /b 1

:oldnode
echo.
echo   The Node.js on this computer is too old for the preview:
node -v
echo   It needs version 20 or newer. Download the LTS version from
echo   https://nodejs.org , install it, then double-click Start-Preview.cmd again.
echo.
pause
exit /b 1

:failed
echo.
echo   The preview stopped with an error (see the message above).
echo.
pause
exit /b 1

:done
endlocal
