#!/bin/bash

echo "🚀 MealAI Cross-Platform Installer"
echo "=================================="

# Detect OS
OS="Unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="Windows"
fi

echo "Detected OS: $OS"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker from https://docker.com/"
    exit 1
fi

echo "✅ Docker found: $(docker --version)"

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build project
echo "🔨 Building TypeScript..."
npm run build

# Set permissions for scripts
if [[ "$OS" == "macOS" ]] || [[ "$OS" == "Linux" ]]; then
    chmod +x start.sh
    echo "✅ Set executable permissions for start.sh"
fi

# Start database based on OS
echo "🐘 Starting PostgreSQL database..."
if [[ "$OS" == "macOS" ]]; then
    docker compose -f docker-compose.mac.yml up -d
else
    docker compose up -d
fi

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure Claude Desktop (see README.md)"
echo "2. Start the server:"
if [[ "$OS" == "Windows" ]]; then
    echo "   - PowerShell: .\\start.ps1"
    echo "   - CMD: start.bat"
    echo "   - npm: npm run start:windows"
else
    echo "   - ./start.sh"
    echo "   - npm run start:mac (macOS)"
fi
echo "3. Test in Claude Desktop"
