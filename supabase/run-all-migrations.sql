-- ============================================================================
-- COMBINED MIGRATIONS FOR DIRECTORS PALETTE
-- Run this in Supabase Dashboard -> SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ADMIN USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists, then create
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON admin_users;
CREATE POLICY "Allow read access to authenticated users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

-- Add yourself as admin (REPLACE WITH YOUR EMAIL)
INSERT INTO admin_users (email) VALUES ('your-email@example.com')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- 2. COMMUNITY ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('wildcard', 'recipe', 'prompt', 'director')),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  content JSONB NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_name TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  add_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_items_type ON community_items(type);
CREATE INDEX IF NOT EXISTS idx_community_items_status ON community_items(status);
CREATE INDEX IF NOT EXISTS idx_community_items_category ON community_items(category);
CREATE INDEX IF NOT EXISTS idx_community_items_submitted_by ON community_items(submitted_by);

-- ============================================================================
-- 3. COMMUNITY RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_item_id UUID NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, community_item_id)
);

CREATE INDEX IF NOT EXISTS idx_community_ratings_item ON community_ratings(community_item_id);
CREATE INDEX IF NOT EXISTS idx_community_ratings_user ON community_ratings(user_id);

-- ============================================================================
-- 4. USER LIBRARY ITEMS TABLE
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
  UNIQUE(user_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_user_library_items_user ON user_library_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_library_items_type ON user_library_items(type);
CREATE INDEX IF NOT EXISTS idx_user_library_items_community ON user_library_items(community_item_id);

-- ============================================================================
-- 5. RLS POLICIES FOR COMMUNITY
-- ============================================================================
ALTER TABLE community_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_library_items ENABLE ROW LEVEL SECURITY;

-- Community Items Policies
DROP POLICY IF EXISTS "Anyone can view approved community items" ON community_items;
CREATE POLICY "Anyone can view approved community items"
  ON community_items FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Users can view their own submissions" ON community_items;
CREATE POLICY "Users can view their own submissions"
  ON community_items FOR SELECT
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Users can insert community items" ON community_items;
CREATE POLICY "Users can insert community items"
  ON community_items FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Admins can do anything with community items" ON community_items;
CREATE POLICY "Admins can do anything with community items"
  ON community_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Community Ratings Policies
DROP POLICY IF EXISTS "Anyone can view ratings" ON community_ratings;
CREATE POLICY "Anyone can view ratings"
  ON community_ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own ratings" ON community_ratings;
CREATE POLICY "Users can insert their own ratings"
  ON community_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON community_ratings;
CREATE POLICY "Users can update their own ratings"
  ON community_ratings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON community_ratings;
CREATE POLICY "Users can delete their own ratings"
  ON community_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- User Library Items Policies
DROP POLICY IF EXISTS "Users can view their own library items" ON user_library_items;
CREATE POLICY "Users can view their own library items"
  ON user_library_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own library items" ON user_library_items;
CREATE POLICY "Users can insert their own library items"
  ON user_library_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own library items" ON user_library_items;
CREATE POLICY "Users can update their own library items"
  ON user_library_items FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own library items" ON user_library_items;
CREATE POLICY "Users can delete their own library items"
  ON user_library_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. TRIGGERS FOR COMMUNITY
-- ============================================================================
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

DROP TRIGGER IF EXISTS trigger_update_community_ratings ON community_ratings;
CREATE TRIGGER trigger_update_community_ratings
AFTER INSERT OR UPDATE OR DELETE ON community_ratings
FOR EACH ROW EXECUTE FUNCTION update_community_item_ratings();

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

DROP TRIGGER IF EXISTS trigger_update_add_count ON user_library_items;
CREATE TRIGGER trigger_update_add_count
AFTER INSERT ON user_library_items
FOR EACH ROW EXECUTE FUNCTION update_community_item_add_count();

-- ============================================================================
-- 7. COUPONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Coupons policies
DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;
CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;
CREATE POLICY "Admins can manage coupons"
  ON coupons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Coupon redemptions policies
DROP POLICY IF EXISTS "Users can view their redemptions" ON coupon_redemptions;
CREATE POLICY "Users can view their redemptions"
  ON coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can redeem coupons" ON coupon_redemptions;
CREATE POLICY "Users can redeem coupons"
  ON coupon_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DONE! Remember to update the admin email above.
-- ============================================================================
SELECT 'Migrations completed successfully!' as status;
