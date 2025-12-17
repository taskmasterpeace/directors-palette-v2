/**
 * Admin Migration Endpoint
 * POST /api/admin/migrate
 *
 * Runs database migrations. Requires admin authentication.
 * Only accessible to admins via the dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const MIGRATION_SQL = `
-- API Keys table for external API access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'Default API Key',
  scopes TEXT[] DEFAULT ARRAY['images:generate', 'recipes:execute'],
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Trigger function to validate admin
CREATE OR REPLACE FUNCTION validate_api_key_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Only admin users can have API keys';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_api_key_admin_trigger ON api_keys;
CREATE TRIGGER validate_api_key_admin_trigger
  BEFORE INSERT ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION validate_api_key_admin();

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  credits_used NUMERIC(10,2) DEFAULT 0,
  request_metadata JSONB,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own API keys" ON api_keys;
CREATE POLICY "Users can update their own API keys"
  ON api_keys FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own API usage" ON api_usage;
CREATE POLICY "Users can view their own API usage"
  ON api_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access to api_keys" ON api_keys;
CREATE POLICY "Service role full access to api_keys"
  ON api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access to api_usage" ON api_usage;
CREATE POLICY "Service role full access to api_usage"
  ON api_usage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Auto-generate API key for new admins
CREATE OR REPLACE FUNCTION generate_admin_api_key()
RETURNS TRIGGER AS $$
DECLARE
  new_key TEXT;
  key_hash TEXT;
BEGIN
  new_key := 'dp_' || encode(gen_random_bytes(16), 'hex');
  key_hash := encode(sha256(new_key::bytea), 'hex');
  INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
  VALUES (NEW.user_id, key_hash, substring(new_key, 1, 11), 'Auto-generated Admin Key');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_admin_created ON admin_users;
CREATE TRIGGER on_admin_created
  AFTER INSERT ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION generate_admin_api_key();
`

export async function POST(_request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const cookieStore = await cookies()
    const supabaseUser = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const { data: adminCheck } = await supabaseUser
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Use service role for DDL operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured', sql: MIGRATION_SQL },
        { status: 500 }
      )
    }

    // Unfortunately, Supabase JS client doesn't support raw SQL DDL
    // Return the SQL for manual execution
    return NextResponse.json({
      success: false,
      message: 'DDL operations require database direct access. Please run the SQL below in Supabase Dashboard.',
      dashboardUrl: 'https://supabase.com/dashboard/project/tarohelkwuurakbxjyxm/sql/new',
      sql: MIGRATION_SQL,
    })

  } catch (error) {
    console.error('[Admin] Migration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/migrate',
    method: 'POST',
    description: 'Run database migrations (admin only)',
    note: 'DDL operations must be run manually in Supabase Dashboard',
  })
}
