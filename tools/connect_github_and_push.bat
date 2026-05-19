@echo off
setlocal

cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\connect_github_and_push.ps1"

endlocal
