-- Add is_featured column to community_items
ALTER TABLE community_items
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Create index for featured items
CREATE INDEX IF NOT EXISTS idx_community_items_featured
ON community_items(is_featured)
WHERE is_featured = TRUE AND status = 'approved';
