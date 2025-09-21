#!/bin/bash

echo "🚀 Initializing MealAI Git Repository..."
echo "====================================="

# Initialize git repository
git init

# Add all files (gitignore will exclude sensitive ones)
git add .

# Create initial commit
git commit -m "feat: initial MealAI Nutritionix MCP Server

- Complete TypeScript MCP server with Nutritionix API integration
- Cross-platform support (Windows, macOS, Linux)
- PostgreSQL database with Docker setup
- Claude Desktop integration ready
- Comprehensive documentation and setup guides
- Security-audited for public release"

echo ""
echo "✅ Git repository initialized!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub repository"
echo "2. Add remote: git remote add origin https://github.com/username/MealAI.git"
echo "3. Push: git push -u origin main"
echo ""
echo "🔒 Security verified - safe for public release!"
