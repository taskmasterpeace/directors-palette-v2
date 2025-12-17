/**
 * Run API Keys migration using Supabase service role
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tarohelkwuurakbxjyxm.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function runMigration() {
  if (!SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  })

  console.log('Running API Keys migration...')

  // Check if api_keys table already exists
  const { data: existingTable, error: checkError } = await supabase
    .from('api_keys')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('api_keys table already exists, skipping migration')
    return
  }

  // The table doesn't exist, we need to create it
  // Unfortunately, Supabase JS client doesn't support DDL operations
  // We need to use the pg client directly or run via dashboard

  console.log('\n⚠️  Cannot run DDL (CREATE TABLE) via Supabase JS client')
  console.log('\nPlease run the following SQL in the Supabase Dashboard SQL Editor:')
  console.log('Dashboard: https://supabase.com/dashboard/project/tarohelkwuurakbxjyxm/sql/new')
  console.log('\n--- Copy everything below this line ---\n')

  const migrationSQL = `
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

CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys"
  ON api_keys FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own API usage"
  ON api_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to api_keys"
  ON api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);

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

  console.log(migrationSQL)
}

runMigration().catch(console.error)
