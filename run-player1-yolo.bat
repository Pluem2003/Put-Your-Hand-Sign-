@echo off
setlocal enabledelayedexpansion

:: --- CONFIGURATION ---
set DEFAULT_PLAYER=player1
set DEFAULT_SERVER=http://localhost:3000

echo ==========================================
echo    Hand Pose Game - YOLO Inference (Local)
echo ==========================================

:: Ask for Camera Index
set /p CAMERA_ID="Enter Camera Index (0=Default, 1=External) [Default=0]: "
if "!CAMERA_ID!"=="" set CAMERA_ID=0

:: Check if .venv exists
set "VENV_PYTHON=%~dp0.venv\Scripts\python.exe"
if exist "!VENV_PYTHON!" (
    set "PYTHON_EXE=!VENV_PYTHON!"
    echo [INFO] Using virtual environment.
) else (
    set "PYTHON_EXE=python"
    echo [INFO] .venv not found, using global python.
)

:: Run script
cd /d "%~dp0puteyourhandsign\Put-Your-Hand-Sign"
echo [INFO] Starting AI for %DEFAULT_PLAYER%...
echo [INFO] Camera: !CAMERA_ID!
echo [INFO] Server: %DEFAULT_SERVER%
echo.

"!PYTHON_EXE!" inferance_Yolo.py --player %DEFAULT_PLAYER% --camera !CAMERA_ID! --server %DEFAULT_SERVER%

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] The AI script failed or crashed.
    echo [TIP] Make sure you have installed: pip install ultralytics opencv-python socketio[client] requests
    echo.
)

pause
