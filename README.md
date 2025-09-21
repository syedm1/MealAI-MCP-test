# MealAI - Nutritionix MCP Server

A Model Context Protocol (MCP) server that integrates with the Nutritionix API to provide nutrition tracking and meal logging capabilities for Claude.

## 🏗️ Architecture

```
Claude Desktop ←→ MCP Server ←→ Nutritionix API
                      ↓
                 PostgreSQL DB
```

**📊 [View Detailed Architecture](ARCHITECTURE.md)**  **🔧 [Component Breakdown](COMPONENTS.md)**





<video src='https://github.com/user-attachments/assets/88c0f23e-a811-4635-93cc-571402e95b94' width=200/>

  
## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- Nutritionix API credentials

## Quick Start

### 1. Get Nutritionix API Keys

1. Create an account at [Nutritionix Developer Portal](https://developer.nutritionix.com/)
2. Request Track API access to get your `APP_ID` and `APP_KEY`

### 2. Platform-Specific Setup

**🖥️ Windows Setup:**
```bash
# Clone and install
git clone https://github.com/your-username/MealAI.git
cd MealAI
npm install

# Configure environment
cp env.example .env
# Edit .env with your Nutritionix API credentials

# Quick setup (database + build)
npm run setup:windows

# Start the server (after configuring credentials)
.\start.ps1
```

**🍎 macOS Setup:**
```bash
# Clone and install  
git clone https://github.com/your-username/MealAI.git
cd MealAI
npm install

# Configure environment
cp env.example .env
# Edit .env with your Nutritionix API credentials

# Quick setup (database + build)
npm run setup:mac

# Start the server (after configuring credentials)
./start.sh
```

**🐧 Linux Setup:**
```bash
# Clone and install
git clone https://github.com/your-username/MealAI.git
cd MealAI
npm install

# Configure environment
cp env.example .env
# Edit .env with your Nutritionix API credentials

# Start database
docker compose up -d

# Build and start
npm run build
./start.sh
```

## Claude Desktop Integration

### Configuration File Locations:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows Configuration:
```json
{
  "mcpServers": {
    "nutritionix-mcp": {
      "command": "node",
      "args": ["C:/Users/YOUR_USERNAME/MealAI/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://mealai_user:mealai_password@localhost:5432/mealai",
        "NIX_APP_ID": "your_nutritionix_app_id",
        "NIX_APP_KEY": "your_nutritionix_app_key"
      }
    }
  }
}
```

### macOS Configuration:
```json
{
  "mcpServers": {
    "nutritionix-mcp": {
      "command": "node", 
      "args": ["/Users/YOUR_USERNAME/MealAI/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://mealai_user:mealai_password@localhost:5432/mealai",
        "NIX_APP_ID": "your_nutritionix_app_id",
        "NIX_APP_KEY": "your_nutritionix_app_key"
      }
    }
  }
}
```

### Setup Steps:
1. **Replace `YOUR_USERNAME`** with your actual username
2. **Use absolute paths** (required by Claude Desktop)
3. **Restart Claude Desktop** after configuration changes
4. Look for the 🔧 icon in Claude to confirm MCP server is connected

## Available Tools

### `search_food`
Autocomplete search for foods (common + branded)
```
Input: { query: "chicken breast" }
Output: List of matching foods with nix_item_id for branded items
```

### `food_nutrients`
Get detailed nutrition information
```
# For branded foods:
Input: { nix_item_id: "513fceb475b8dbbc21000fd3", qty: 1 }

# For natural language:
Input: { text: "2 eggs and 1 slice sourdough toast", qty: 1 }

Output: Detailed macronutrient breakdown
```

### `log_meal`
Log a meal to the database
```
Input: {
  user_id: "uuid",
  eaten_at: "2024-01-15T12:30:00Z",
  food_name: "Chicken Breast",
  macros: { kcal: 250, protein_g: 46, carbs_g: 0, fat_g: 3.6 }
}
```

### `analyze_day`
Analyze daily nutrition totals vs goals
```
Input: { user_id: "uuid", day_iso: "2024-01-15" }
Output: Daily totals, progress %, recommendations
```

## Usage Examples

**Search and log a meal:**
```
Claude: "Search for 'grilled salmon' and log 6oz for lunch today"
→ search_food → food_nutrients → log_meal → analyze_day
```

**Natural language meal logging:**
```
Claude: "I had 2 scrambled eggs with cheese and a slice of toast for breakfast"
→ food_nutrients(text="2 scrambled eggs with cheese and slice of toast") → log_meal
```

**Daily nutrition analysis:**
```
Claude: "Show me my nutrition totals for today and how I'm tracking against my goals"
→ analyze_day → detailed breakdown with recommendations
```

## Database Schema

- **users**: Basic user information
- **profiles**: Nutrition goals and preferences  
- **meals**: Logged meals with cached nutrition data

## Development

```bash
# Development with hot reload
npm run dev

# Watch mode
npm run watch

# Build for production
npm run build
```

## Troubleshooting

**Claude doesn't see the server:**
- Verify absolute paths in config
- Check environment variables
- Restart Claude Desktop
- Check Claude logs for errors

**Database connection fails:**
- Ensure PostgreSQL is running
- Verify DATABASE_URL format
- Check database credentials

**Nutritionix API errors:**
- Verify API credentials are correct
- Check rate limits (free tier: 200 requests/day)
- Ensure internet connectivity

## API Documentation

- [Nutritionix API v2 Overview](https://developer.nutritionix.com/docs/v2)
- [Natural Language Endpoint](https://docx.syndigo.com/developers/docs/natural-language-for-nutrients)
- [Search Endpoints](https://docx.syndigo.com/developers/docs/instant-endpoint)

## License

MIT License - see LICENSE file for details.

