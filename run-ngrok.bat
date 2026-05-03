@echo off
echo Starting Hand Pose Game Server...
start /b node server.js

echo.
echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting ngrok Tunnel...
echo ------------------------------------------------------------
echo YOUR PUBLIC URL WILL APPEAR BELOW (look for Forwarding: https://...)
echo ------------------------------------------------------------
:: หากคุณย้าย ngrok.exe ไปไว้ที่อื่น ให้แก้ path ด้านล่างนี้
ngrok http 3000
pause
