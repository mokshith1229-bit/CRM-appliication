@echo off
echo ========================================
echo Upgrading to Expo SDK 54
echo ========================================
echo.
cd /d "%~dp0"

echo Step 1: Installing dependencies...
echo This may take a few minutes...
echo.
npm install

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Your project is now using Expo SDK 54
echo Compatible with the latest Expo Go app
echo.
echo To start the app, run: npm start
echo Or double-click start.bat
echo.
pause
