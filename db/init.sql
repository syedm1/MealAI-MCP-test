-- Enable the vector extension for future RAG capabilities
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles with nutritional goals and preferences
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER,
    sex TEXT CHECK (sex IN ('male', 'female', 'other')),
    height_cm INTEGER,
    weight_kg NUMERIC(5,2),
    activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
    dietary_prefs JSONB DEFAULT '{}', -- e.g., {"vegetarian": true, "gluten_free": false}
    allergies JSONB DEFAULT '[]', -- e.g., ["peanuts", "shellfish"]
    goals JSONB DEFAULT '{}', -- e.g., {"calories": 2200, "protein_g": 160, "carbs_g": 220, "fat_g": 70}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meals logging table
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    eaten_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT DEFAULT 'nutritionix',
    external_food_id TEXT, -- nix_item_id for branded items, "natural" for parsed text
    qty NUMERIC(8,3) DEFAULT 1,
    macros JSONB NOT NULL, -- cached macros: {"kcal": 250, "protein_g": 20, "carbs_g": 30, "fat_g": 10}
    food_name TEXT, -- human-readable food description
    raw_data JSONB, -- store full Nutritionix response for debugging
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_meals_user_date ON meals(user_id, DATE(eaten_at));
CREATE INDEX idx_meals_eaten_at ON meals(eaten_at);
CREATE INDEX idx_users_email ON users(email);

-- Insert a sample user for testing
INSERT INTO users (id, email) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'test@mealai.com');

INSERT INTO profiles (user_id, age, sex, height_cm, weight_kg, activity_level, goals) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 30, 'male', 175, 70.5, 'moderately_active', 
     '{"calories": 2200, "protein_g": 160, "carbs_g": 220, "fat_g": 70}');

