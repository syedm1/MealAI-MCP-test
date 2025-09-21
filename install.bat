@echo off
echo 🚀 MealAI Windows Installer
echo ===========================

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker not found. Please install Docker from https://docker.com/
    pause
    exit /b 1
)

echo ✅ Docker found
docker --version

REM Install dependencies
echo 📦 Installing Node.js dependencies...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Build project
echo 🔨 Building TypeScript...
npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

REM Start database
echo 🐘 Starting PostgreSQL database...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to start database
    pause
    exit /b 1
)

echo.
echo 🎉 Installation completed successfully!
echo.
echo Next steps:
echo 1. Configure Claude Desktop (see README.md)
echo 2. Start the server:
echo    - PowerShell: .\start.ps1
echo    - CMD: start.bat
echo    - npm: npm run start:windows
echo 3. Test in Claude Desktop
echo.
pause
