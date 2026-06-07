-- Migration: Phase 13 - Nutrition Settings (Activity Level & Custom Meal Distribution)

-- Add activity level (e.g., Sédentaire, Léger, Modéré, Intense, Très intense)
ALTER TABLE nutrition_profiles ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'Modéré';

-- Add custom meal distribution percentage (JSONB object)
ALTER TABLE nutrition_profiles ADD COLUMN IF NOT EXISTS meal_distribution JSONB DEFAULT '{"Petit-déjeuner": 25, "Déjeuner": 35, "Collation": 10, "Dîner": 30}'::jsonb;

-- Add a flag to indicate if the user manually modified their distribution
ALTER TABLE nutrition_profiles ADD COLUMN IF NOT EXISTS is_custom_distribution BOOLEAN DEFAULT false;
