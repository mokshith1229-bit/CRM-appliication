@echo off
echo ============================================
echo Navigation Drawer Dependencies Installer
echo ============================================
echo.
echo This will install:
echo - @react-navigation/drawer
echo - react-native-gesture-handler
echo - react-native-reanimated
echo - @react-native-community/datetimepicker
echo.
echo NOTE: The app already works without these!
echo These are optional enhancements.
echo.
pause

cd /d "%~dp0"
call npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated @react-native-community/datetimepicker

echo.
echo ============================================
echo Installation complete!
echo ============================================
echo.
echo Next steps:
echo 1. Reload the app (press 'r' in terminal)
echo 2. Test the drawer by tapping the menu icon
echo.
pause
