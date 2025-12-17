-- Storage Limits Migration
-- Date: 2025-12-17
-- Purpose: Add expiration for videos (7 days) and tracking for image limits (500 max)

-- Add expires_at column to gallery table
ALTER TABLE public.gallery
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for efficient expired content queries
CREATE INDEX IF NOT EXISTS idx_gallery_expires_at ON public.gallery(expires_at)
WHERE expires_at IS NOT NULL;

-- Create index for counting user images efficiently
CREATE INDEX IF NOT EXISTS idx_gallery_user_type ON public.gallery(user_id, generation_type)
WHERE status = 'completed';

-- Function to set expiration on video insert
CREATE OR REPLACE FUNCTION set_video_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set expiration for videos, not images
  IF NEW.generation_type = 'video' THEN
    NEW.expires_at := NOW() + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set expiration on video creation
DROP TRIGGER IF EXISTS trigger_set_video_expiration ON public.gallery;
CREATE TRIGGER trigger_set_video_expiration
  BEFORE INSERT ON public.gallery
  FOR EACH ROW
  EXECUTE FUNCTION set_video_expiration();

-- Function to get user's image count
CREATE OR REPLACE FUNCTION get_user_image_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.gallery
    WHERE user_id = p_user_id
      AND generation_type = 'image'
      AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create more images (under 500 limit)
CREATE OR REPLACE FUNCTION can_create_image(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_image_count(p_user_id) < 500;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete expired content (run via cron/scheduled task)
CREATE OR REPLACE FUNCTION delete_expired_content()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired gallery entries
  WITH deleted AS (
    DELETE FROM public.gallery
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set expiration for any existing videos (7 days from now)
UPDATE public.gallery
SET expires_at = NOW() + INTERVAL '7 days'
WHERE generation_type = 'video'
  AND expires_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN public.gallery.expires_at IS 'Auto-delete timestamp. Videos: 7 days. Images: no expiration (500 limit instead).';
