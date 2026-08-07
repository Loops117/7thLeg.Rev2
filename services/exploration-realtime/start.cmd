@echo off
REM Optional helper if you run from GSA serverfiles with a portable Node folder.
REM Prefer Dockerfile.windows + Custom blueprint CMD instead.
cd /d "%~dp0"
if exist "node\node.exe" (
  "node\node.exe" server.js
) else (
  node server.js
)
