-- Add usage_count to style_guides so the admin UI can show how often each style is used.
ALTER TABLE style_guides ADD COLUMN IF NOT EXISTS usage_count INT NOT NULL DEFAULT 0;

-- Index for sorting by most used
CREATE INDEX IF NOT EXISTS style_guides_usage_count_idx ON style_guides (usage_count DESC);

-- Atomic increment helper used by the image generation endpoint
CREATE OR REPLACE FUNCTION increment_style_usage(p_style_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE style_guides
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = p_style_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
