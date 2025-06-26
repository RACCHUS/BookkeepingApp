@echo off
title Bookkeeping App
echo Starting Bookkeeping App...
echo.

echo Starting Server...
cd /d "c:\Users\richa\Documents\Code\BookkeepingApp\server"
start "Server" cmd /k "echo Server starting... && node index.js"

echo Waiting 3 seconds for server to start...
timeout /t 3 /nobreak > nul

echo Starting Client...
cd /d "c:\Users\richa\Documents\Code\BookkeepingApp\client"
start "Client" cmd /k "echo Client starting... && npm run dev"

echo.
echo Both services should be starting in separate windows...
echo Server: http://localhost:5000
echo Client: http://localhost:3000
echo.
pause
