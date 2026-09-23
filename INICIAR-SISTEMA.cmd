@echo off
cd /d "%~dp0"
node scripts\iniciar.cjs
if errorlevel 1 pause
