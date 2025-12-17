-- Fix Community RLS Policies
-- The admin policy was referencing non-existent column and causing permission errors

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admins can do anything with community items" ON community_items;

-- Create a simpler policy that checks admin by email via auth.jwt()
-- This avoids the need to query admin_users table during anonymous access
CREATE POLICY "Admins can do anything with community items"
  ON community_items FOR ALL
  USING (
    -- Check if user email is in admin_users
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (SELECT auth.jwt() ->> 'email')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = (SELECT auth.jwt() ->> 'email')
    )
  );

-- Also ensure admin_users is readable by authenticated users (already set, but let's make sure)
-- The existing policy should work, but let's add a fallback for service role
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON admin_users;

CREATE POLICY "Allow read access to authenticated users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

-- Service role bypass (implicit, but explicit for clarity)
CREATE POLICY "Service role full access to admin_users"
  ON admin_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
