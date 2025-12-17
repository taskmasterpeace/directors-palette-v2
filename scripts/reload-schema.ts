/**
 * Reload Supabase PostgREST Schema Cache
 *
 * Usage: npx tsx scripts/reload-schema.ts
 *
 * Prerequisites: Run this SQL once in Supabase Dashboard:
 *   CREATE OR REPLACE FUNCTION public.reload_schema() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NOTIFY pgrst, 'reload schema'; END; $$;
 *   GRANT EXECUTE ON FUNCTION public.reload_schema() TO service_role;
 */

import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function main() {
  console.log('🔄 Reloading Supabase PostgREST Schema Cache...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Call the reload_schema function
  const { error } = await supabase.rpc('reload_schema');

  if (error) {
    if (error.message.includes('does not exist') || error.code === 'PGRST202') {
      console.log('❌ reload_schema() function not found.\n');
      console.log('📋 Run this SQL in Supabase Dashboard first:');
      console.log('   https://supabase.com/dashboard/project/tarohelkwuurakbxjyxm/sql/new\n');
      console.log('   NOTIFY pgrst, \'reload schema\';');
      console.log('   CREATE OR REPLACE FUNCTION public.reload_schema() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NOTIFY pgrst, \'reload schema\'; END; $$;');
      console.log('   GRANT EXECUTE ON FUNCTION public.reload_schema() TO service_role;\n');
      process.exit(1);
    }
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Schema cache reloaded successfully!\n');

  // Verify tables are now accessible
  console.log('📊 Verifying tables...');
  const tables = ['community_items', 'community_ratings', 'user_library_items', 'coupons', 'admin_users'];

  for (const table of tables) {
    const { error: tableError } = await supabase.from(table).select('*').limit(0);
    if (tableError) {
      console.log(`   ⚠️  ${table}: ${tableError.message}`);
    } else {
      console.log(`   ✅ ${table}`);
    }
  }

  console.log('\n✨ Done!\n');
}

main().catch(console.error);
