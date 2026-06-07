-- Migration: Phase 14 - AI Estimated Flag

ALTER TABLE nutrition_entries ADD COLUMN IF NOT EXISTS is_ai_estimated BOOLEAN DEFAULT FALSE;
