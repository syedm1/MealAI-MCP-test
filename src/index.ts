import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  CallToolResult,
  ListToolsResult
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";
import { Pool } from "pg";

// Nutritionix API configuration
const NIX_BASE = "https://trackapi.nutritionix.com/v2";
const headers = {
  "x-app-id": process.env.NIX_APP_ID!,
  "x-app-key": process.env.NIX_APP_KEY!,
  "Content-Type": "application/json"
};

// Database connection
const db = new Pool({ 
  connectionString: process.env.DATABASE_URL || "postgresql://mealai_user:mealai_password@localhost:5432/mealai"
});

// Initialize MCP server
const server = new Server(
  { name: "nutritionix-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, prompts: {}, resources: {} } }
);

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_food": {
      const input = z.object({ 
        query: z.string().min(1, "Query must not be empty") 
      }).parse(args);

      try {
        const response = await axios.get(`${NIX_BASE}/search/instant`, {
          headers,
          params: { query: input.query }
        });

        const common = (response.data.common || []).slice(0, 5).map((c: any) => ({
          type: "common",
          name: c.food_name,
          photo: c.photo?.thumb || null
        }));

        const branded = (response.data.branded || []).slice(0, 5).map((b: any) => ({
          type: "branded",
          name: b.brand_name_item_name || b.food_name,
          nix_item_id: b.nix_item_id,
          brand_name: b.brand_name,
          photo: b.photo?.thumb || null
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              query: input.query,
              items: [...common, ...branded],
              total_results: {
                common: response.data.common?.length || 0,
                branded: response.data.branded?.length || 0
              }
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Failed to search foods",
              message: error.response?.data?.message || error.message,
              hint: "Check your Nutritionix API credentials"
            }, null, 2)
          }]
        };
      }
    }

    case "food_nutrients": {
      const input = z.object({
        nix_item_id: z.string().optional(),
        text: z.string().optional(),
        qty: z.number().default(1)
      }).parse(args);

      if (!input.nix_item_id && !input.text) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Must provide either nix_item_id or text parameter"
            }, null, 2)
          }]
        };
      }

      try {
        let macros: any;
        let raw: any;
        let foodName: string;

        if (input.nix_item_id) {
          // Branded food lookup
          const response = await axios.get(`${NIX_BASE}/search/item`, {
            headers,
            params: { nix_item_id: input.nix_item_id }
          });

          const item = response.data.foods?.[0];
          if (!item) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  error: "Food item not found",
                  nix_item_id: input.nix_item_id
                }, null, 2)
              }]
            };
          }

          macros = {
            kcal: (item.nf_calories || 0) * input.qty,
            protein_g: (item.nf_protein || 0) * input.qty,
            carbs_g: (item.nf_total_carbohydrate || 0) * input.qty,
            fat_g: (item.nf_total_fat || 0) * input.qty,
            fiber_g: (item.nf_dietary_fiber || 0) * input.qty,
            sugar_g: (item.nf_sugars || 0) * input.qty,
            sodium_mg: (item.nf_sodium || 0) * input.qty
          };
          raw = item;
          foodName = item.food_name || "Unknown branded food";

        } else if (input.text) {
          // Natural language parsing
          const response = await axios.post(`${NIX_BASE}/natural/nutrients`, {
            query: input.text
          }, { headers });

          // Sum all foods returned
          const sum = response.data.foods.reduce((acc: any, food: any) => ({
            kcal: acc.kcal + (food.nf_calories || 0),
            protein_g: acc.protein_g + (food.nf_protein || 0),
            carbs_g: acc.carbs_g + (food.nf_total_carbohydrate || 0),
            fat_g: acc.fat_g + (food.nf_total_fat || 0),
            fiber_g: acc.fiber_g + (food.nf_dietary_fiber || 0),
            sugar_g: acc.sugar_g + (food.nf_sugars || 0),
            sodium_mg: acc.sodium_mg + (food.nf_sodium || 0)
          }), {
            kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
            fiber_g: 0, sugar_g: 0, sodium_mg: 0
          });

          // Apply quantity multiplier
          macros = Object.keys(sum).reduce((acc: any, key) => {
            acc[key] = sum[key] * input.qty;
            return acc;
          }, {});

          raw = response.data.foods;
          foodName = input.text;
        } else {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: "Must provide either nix_item_id or text parameter"
              }, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              food_name: foodName,
              quantity: input.qty,
              macros,
              external_food_id: input.nix_item_id || "natural",
              raw_response: raw
            }, null, 2)
          }]
        };

      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Failed to get food nutrients",
              message: error.response?.data?.message || error.message,
              hint: "Check your Nutritionix API credentials"
            }, null, 2)
          }]
        };
      }
    }

    case "log_meal": {
      const input = z.object({
        user_id: z.string().uuid("Invalid user ID format"),
        eaten_at: z.string(),
        external_food_id: z.string().default("natural"),
        qty: z.number().default(1),
        food_name: z.string(),
        macros: z.object({
          kcal: z.number(),
          protein_g: z.number(),
          carbs_g: z.number(),
          fat_g: z.number(),
          fiber_g: z.number().optional(),
          sugar_g: z.number().optional(),
          sodium_mg: z.number().optional()
        }),
        raw_data: z.any().optional()
      }).parse(args);

      try {
        const result = await db.query(
          `INSERT INTO meals (user_id, eaten_at, external_food_id, qty, food_name, macros, raw_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, created_at`,
          [
            input.user_id,
            input.eaten_at,
            input.external_food_id,
            input.qty,
            input.food_name,
            JSON.stringify(input.macros),
            input.raw_data ? JSON.stringify(input.raw_data) : null
          ]
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              meal_id: result.rows[0].id,
              logged_at: result.rows[0].created_at,
              message: `Successfully logged "${input.food_name}" for user ${input.user_id}`
            }, null, 2)
          }]
        };

      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Failed to log meal",
              message: error.message,
              hint: "Make sure the database is running and user_id exists"
            }, null, 2)
          }]
        };
      }
    }

    case "analyze_day": {
      const input = z.object({
        user_id: z.string().uuid("Invalid user ID format"),
        day_iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      }).parse(args);

      try {
        // Get meals for the day
        const mealsResult = await db.query(
          `SELECT id, food_name, qty, macros, eaten_at, external_food_id
           FROM meals 
           WHERE user_id = $1 AND DATE(eaten_at) = DATE($2)
           ORDER BY eaten_at`,
          [input.user_id, input.day_iso]
        );

        // Calculate daily totals
        const totals = mealsResult.rows.reduce((acc: any, meal: any) => {
          const macros = meal.macros;
          return {
            kcal: acc.kcal + (macros.kcal || 0),
            protein_g: acc.protein_g + (macros.protein_g || 0),
            carbs_g: acc.carbs_g + (macros.carbs_g || 0),
            fat_g: acc.fat_g + (macros.fat_g || 0),
            fiber_g: acc.fiber_g + (macros.fiber_g || 0),
            sugar_g: acc.sugar_g + (macros.sugar_g || 0),
            sodium_mg: acc.sodium_mg + (macros.sodium_mg || 0)
          };
        }, {
          kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
          fiber_g: 0, sugar_g: 0, sodium_mg: 0
        });

        // Get user goals
        const profileResult = await db.query(
          `SELECT goals FROM profiles WHERE user_id = $1`,
          [input.user_id]
        );

        const goals = profileResult.rows[0]?.goals || null;
        let deltas = null;
        let progress = null;

        if (goals) {
          deltas = {
            kcal: totals.kcal - (goals.calories || 0),
            protein_g: totals.protein_g - (goals.protein_g || 0),
            carbs_g: totals.carbs_g - (goals.carbs_g || 0),
            fat_g: totals.fat_g - (goals.fat_g || 0)
          };

          progress = {
            kcal: goals.calories ? Math.round((totals.kcal / goals.calories) * 100) : 0,
            protein_g: goals.protein_g ? Math.round((totals.protein_g / goals.protein_g) * 100) : 0,
            carbs_g: goals.carbs_g ? Math.round((totals.carbs_g / goals.carbs_g) * 100) : 0,
            fat_g: goals.fat_g ? Math.round((totals.fat_g / goals.fat_g) * 100) : 0
          };
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              date: input.day_iso,
              user_id: input.user_id,
              meals_count: mealsResult.rows.length,
              meals: mealsResult.rows.map(meal => ({
                id: meal.id,
                food_name: meal.food_name,
                quantity: meal.qty,
                eaten_at: meal.eaten_at,
                macros: meal.macros
              })),
              daily_totals: totals,
              goals,
              deltas,
              progress_percent: progress,
              recommendations: generateRecommendations(totals, goals)
            }, null, 2)
          }]
        };

      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Failed to analyze day",
              message: error.message
            }, null, 2)
          }]
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Helper function to generate nutrition recommendations
function generateRecommendations(totals: any, goals: any): string[] {
  if (!goals) return ["Set up your nutritional goals in your profile to get personalized recommendations."];

  const recommendations: string[] = [];
  
  if (totals.kcal < goals.calories * 0.8) {
    recommendations.push("You're significantly under your calorie goal. Consider adding nutrient-dense foods.");
  } else if (totals.kcal > goals.calories * 1.2) {
    recommendations.push("You've exceeded your calorie goal. Consider lighter options for remaining meals.");
  }

  if (totals.protein_g < goals.protein_g * 0.8) {
    recommendations.push("Low protein intake. Consider adding lean meats, fish, eggs, or plant-based proteins.");
  }

  if (totals.fiber_g < 25) {
    recommendations.push("Increase fiber intake with fruits, vegetables, and whole grains.");
  }

  if (totals.sodium_mg > 2300) {
    recommendations.push("High sodium intake. Try to reduce processed foods and add fresh herbs for flavor.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Great job! Your nutrition looks well-balanced today.");
  }

  return recommendations;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async (): Promise<ListToolsResult> => {
  return {
    tools: [
      {
        name: "search_food",
        description: "Search for foods using Nutritionix autocomplete. Returns both common and branded foods.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term for food (e.g., 'chicken breast', 'apple')"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "food_nutrients",
        description: "Get detailed nutrition information for a food item using either branded lookup or natural language parsing.",
        inputSchema: {
          type: "object",
          properties: {
            nix_item_id: {
              type: "string",
              description: "Nutritionix item ID for branded foods (from search_food results)"
            },
            text: {
              type: "string",
              description: "Natural language description of food (e.g., '2 eggs and 1 slice of toast')"
            },
            qty: {
              type: "number",
              description: "Quantity multiplier (default: 1)",
              default: 1
            }
          }
        }
      },
      {
        name: "log_meal",
        description: "Log a meal with nutrition information to the database.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "UUID of the user logging the meal"
            },
            eaten_at: {
              type: "string",
              description: "ISO timestamp when the meal was eaten"
            },
            external_food_id: {
              type: "string",
              description: "Food identifier (nix_item_id or 'natural')",
              default: "natural"
            },
            qty: {
              type: "number",
              description: "Quantity consumed",
              default: 1
            },
            food_name: {
              type: "string",
              description: "Human-readable name of the food"
            },
            macros: {
              type: "object",
              description: "Macronutrient information",
              properties: {
                kcal: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                fiber_g: { type: "number" },
                sugar_g: { type: "number" },
                sodium_mg: { type: "number" }
              },
              required: ["kcal", "protein_g", "carbs_g", "fat_g"]
            },
            raw_data: {
              type: "object",
              description: "Raw API response for debugging (optional)"
            }
          },
          required: ["user_id", "eaten_at", "food_name", "macros"]
        }
      },
      {
        name: "analyze_day",
        description: "Analyze daily nutrition totals and compare against user goals.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              description: "UUID of the user to analyze"
            },
            day_iso: {
              type: "string",
              description: "Date in YYYY-MM-DD format"
            }
          },
          required: ["user_id", "day_iso"]
        }
      }
    ]
  };
});

// Handle server shutdown gracefully
async function cleanup() {
  await db.end();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
async function main() {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.error('✅ Database connection established');
    
    // Verify Nutritionix credentials
    if (!process.env.NIX_APP_ID || !process.env.NIX_APP_KEY) {
      console.error('⚠️  Warning: Nutritionix credentials not found. Set NIX_APP_ID and NIX_APP_KEY environment variables.');
    } else {
      console.error('✅ Nutritionix credentials configured');
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🚀 Nutritionix MCP Server started successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
