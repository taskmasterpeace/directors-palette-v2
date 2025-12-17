-- Community Feature Tables
-- Created: 2025-12-16

-- ============================================================================
-- COMMUNITY ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('wildcard', 'recipe', 'prompt', 'director')),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  content JSONB NOT NULL,

  -- Submission info
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_name TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Approval status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,

  -- Stats
  add_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for community_items
CREATE INDEX idx_community_items_type ON community_items(type);
CREATE INDEX idx_community_items_status ON community_items(status);
CREATE INDEX idx_community_items_category ON community_items(category);
CREATE INDEX idx_community_items_submitted_by ON community_items(submitted_by);

-- ============================================================================
-- COMMUNITY RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_item_id UUID NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One rating per user per item
  UNIQUE(user_id, community_item_id)
);

-- Indexes for community_ratings
CREATE INDEX idx_community_ratings_item ON community_ratings(community_item_id);
CREATE INDEX idx_community_ratings_user ON community_ratings(user_id);

-- ============================================================================
-- USER LIBRARY ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_item_id UUID REFERENCES community_items(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('wildcard', 'recipe', 'prompt', 'director')),
  name TEXT NOT NULL,
  content JSONB NOT NULL,
  is_modified BOOLEAN DEFAULT FALSE,
  submitted_to_community BOOLEAN DEFAULT FALSE,
  community_status TEXT CHECK (community_status IN ('pending', 'approved', 'rejected')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique name per user per type
  UNIQUE(user_id, type, name)
);

-- Indexes for user_library_items
CREATE INDEX idx_user_library_items_user ON user_library_items(user_id);
CREATE INDEX idx_user_library_items_type ON user_library_items(type);
CREATE INDEX idx_user_library_items_community ON user_library_items(community_item_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE community_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_library_items ENABLE ROW LEVEL SECURITY;

-- Community Items Policies
CREATE POLICY "Anyone can view approved community items"
  ON community_items FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view their own submissions"
  ON community_items FOR SELECT
  USING (auth.uid() = submitted_by);

CREATE POLICY "Users can insert community items"
  ON community_items FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Admins can do anything with community items"
  ON community_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Community Ratings Policies
CREATE POLICY "Anyone can view ratings"
  ON community_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON community_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON community_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON community_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- User Library Items Policies
CREATE POLICY "Users can view their own library items"
  ON user_library_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own library items"
  ON user_library_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own library items"
  ON user_library_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own library items"
  ON user_library_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update rating aggregates when a rating is added/updated/deleted
CREATE OR REPLACE FUNCTION update_community_item_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE community_items
    SET
      rating_sum = rating_sum - OLD.rating,
      rating_count = rating_count - 1,
      updated_at = NOW()
    WHERE id = OLD.community_item_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE community_items
    SET
      rating_sum = rating_sum - OLD.rating + NEW.rating,
      updated_at = NOW()
    WHERE id = NEW.community_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE community_items
    SET
      rating_sum = rating_sum + NEW.rating,
      rating_count = rating_count + 1,
      updated_at = NOW()
    WHERE id = NEW.community_item_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_community_ratings
AFTER INSERT OR UPDATE OR DELETE ON community_ratings
FOR EACH ROW EXECUTE FUNCTION update_community_item_ratings();

-- Update add_count when library item is added
CREATE OR REPLACE FUNCTION update_community_item_add_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.community_item_id IS NOT NULL THEN
    UPDATE community_items
    SET
      add_count = add_count + 1,
      updated_at = NOW()
    WHERE id = NEW.community_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_add_count
AFTER INSERT ON user_library_items
FOR EACH ROW EXECUTE FUNCTION update_community_item_add_count();

-- Updated_at trigger for community_items
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_community_items_updated_at
BEFORE UPDATE ON community_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_library_items_updated_at
BEFORE UPDATE ON user_library_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
