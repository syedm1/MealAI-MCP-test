# MealAI Build Script for Windows
Write-Host "🚀 Building MealAI Nutritionix MCP Server..." -ForegroundColor Green

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is available
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found. Please install Node.js with npm." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Get Nutritionix API credentials from https://developer.nutritionix.com/" -ForegroundColor White
Write-Host "2. Copy env.example to .env and fill in your credentials" -ForegroundColor White
Write-Host "3. Start PostgreSQL database: docker compose up -d" -ForegroundColor White
Write-Host "4. Add the server to Claude Desktop config (see README.md)" -ForegroundColor White
Write-Host "5. Restart Claude Desktop" -ForegroundColor White

