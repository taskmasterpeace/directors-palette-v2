-- Add source tracking columns to user_recipes
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'created';
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS source_catalog_id UUID;

-- Backfill existing data
UPDATE user_recipes SET source = 'system' WHERE is_system = true;
UPDATE user_recipes SET source = 'created' WHERE is_system = false AND source = 'created';

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_user_recipes_source ON user_recipes(source);

COMMENT ON COLUMN user_recipes.source IS 'created | catalog | imported | system';
COMMENT ON COLUMN user_recipes.source_catalog_id IS 'References community_items.id for catalog-sourced recipes';
