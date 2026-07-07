@echo off
set HTTPS_PROXY=
set HTTP_PROXY=
cd /d "%~dp0"
echo Starting AI Sync Desktop...
npx electron .
