@echo off
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;C:\Program Files\Git\usr\bin;%PATH%"

:: Open a new terminal for the API server
start "API Server" cmd /k "cd /d %~dp0\artifacts\api-server && pnpm dev"

:: Open a new terminal for the Vite frontend
start "Frontend" cmd /k "cd /d %~dp0\artifacts\kinectra && pnpm dev"
