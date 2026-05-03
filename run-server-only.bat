@echo off
echo [INFO] Starting Hand Pose Game Server with Supabase...
echo [INFO] Checking for .env file...

if not exist ".env" (
    echo [WARNING] .env file not found! Supabase integration will be disabled.
)

node server.js
pause
