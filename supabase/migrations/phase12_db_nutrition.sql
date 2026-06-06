-- Migration: Phase 12 - Nutrition (CIQUAL & OFF Hybrid Architecture)

-- 1. Table CIQUAL pour les aliments bruts (Recherche locale rapide)
CREATE TABLE ciqual_foods (
    id TEXT PRIMARY KEY, -- Code CIQUAL
    name_fr TEXT NOT NULL,
    name_en TEXT,
    group_name_fr TEXT,
    subgroup_name_fr TEXT,
    calories_100g NUMERIC DEFAULT 0,
    proteins_100g NUMERIC DEFAULT 0,
    carbs_100g NUMERIC DEFAULT 0,
    fats_100g NUMERIC DEFAULT 0,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('french', name_fr)) STORED
);

CREATE INDEX idx_ciqual_search ON ciqual_foods USING GIN(search_vector);
CREATE INDEX idx_ciqual_name ON ciqual_foods(name_fr);

-- 2. Table pour les journaux de nutrition quotidiens
CREATE TABLE nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    total_calories NUMERIC DEFAULT 0,
    total_proteins NUMERIC DEFAULT 0,
    total_carbs NUMERIC DEFAULT 0,
    total_fats NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(user_id, log_date)
);

CREATE INDEX idx_nutrition_logs_user_date ON nutrition_logs(user_id, log_date);

-- 3. Table pour les entrées spécifiques (Aliments consommés)
CREATE TABLE nutrition_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES nutrition_logs(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
    food_name TEXT NOT NULL,
    ciqual_id TEXT REFERENCES ciqual_foods(id) ON DELETE SET NULL, -- Si c'est un aliment brut
    off_barcode TEXT, -- Si c'est un produit scanné via Open Food Facts
    quantity_g NUMERIC NOT NULL,
    calories NUMERIC DEFAULT 0,
    proteins NUMERIC DEFAULT 0,
    carbs NUMERIC DEFAULT 0,
    fats NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE INDEX idx_nutrition_entries_log ON nutrition_entries(log_id);

-- RLS (Row Level Security)
ALTER TABLE ciqual_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;

-- CIQUAL est lisible par tous les utilisateurs authentifiés
CREATE POLICY "Les utilisateurs peuvent lire CIQUAL" ON ciqual_foods
    FOR SELECT USING (auth.role() = 'authenticated');

-- Logs de nutrition
CREATE POLICY "Lecture propre log" ON nutrition_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Insertion propre log" ON nutrition_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mise à jour propre log" ON nutrition_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Suppression propre log" ON nutrition_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Entrées de nutrition (via le log_id)
CREATE POLICY "Lecture propres entrées" ON nutrition_entries
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM nutrition_logs WHERE id = nutrition_entries.log_id AND user_id = auth.uid())
    );

CREATE POLICY "Insertion propres entrées" ON nutrition_entries
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM nutrition_logs WHERE id = nutrition_entries.log_id AND user_id = auth.uid())
    );

CREATE POLICY "Mise à jour propres entrées" ON nutrition_entries
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM nutrition_logs WHERE id = nutrition_entries.log_id AND user_id = auth.uid())
    );

CREATE POLICY "Suppression propres entrées" ON nutrition_entries
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM nutrition_logs WHERE id = nutrition_entries.log_id AND user_id = auth.uid())
    );
