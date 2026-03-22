-- Add bundled_wildcards column to community_items
-- Stores wildcards bundled with recipe shares for auto-import
ALTER TABLE community_items
ADD COLUMN IF NOT EXISTS bundled_wildcards JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN community_items.bundled_wildcards IS 'Wildcards bundled with recipe for auto-import. Array of {name, category, content, description}. Max 10 wildcards, 1000 entries each.';
