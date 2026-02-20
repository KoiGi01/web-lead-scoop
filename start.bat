@echo off
cd /d "%~dp0"

echo Checking for node_modules...
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: npm install failed. Make sure Node.js is installed.
        pause
        exit /b 1
    )
)

echo Starting dev server...
npm run dev
pause
