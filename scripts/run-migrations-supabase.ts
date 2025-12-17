/**
 * Database Migration Runner (Supabase Admin API)
 * Uses service role key to run migrations
 */

import { config } from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTable(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('*').limit(1);
  return !error || !error.message.includes('does not exist');
}

async function main() {
  console.log('🚀 Director\'s Palette Migration Check');
  console.log('=====================================\n');
  console.log(`📡 URL: ${SUPABASE_URL}\n`);

  // Check existing tables
  const tables = ['admin_users', 'community_items', 'coupons', 'user_library_items', 'coupon_redemptions'];

  console.log('📊 Checking tables...');
  for (const table of tables) {
    const exists = await checkTable(table);
    console.log(`   ${exists ? '✅' : '❌'} ${table}`);
  }

  // Check admin_users
  console.log('\n📋 Checking admin_users...');
  const { data: admins, error: adminError } = await supabase
    .from('admin_users')
    .select('*');

  if (adminError) {
    console.log(`   ❌ Error: ${adminError.message}`);
    console.log('\n⚠️  Tables need to be created. Run this SQL in Supabase Dashboard:\n');
    console.log('   Go to: https://supabase.com/dashboard/project/tarohelkwuurakbxjyxm/sql/new');
    console.log('   Copy/paste from: supabase/run-all-migrations.sql\n');
  } else {
    console.log(`   ✅ Found ${admins?.length || 0} admin(s)`);
    if (admins && admins.length > 0) {
      admins.forEach((a: { email: string }) => console.log(`      - ${a.email}`));
    }
  }

  // Test community_items
  console.log('\n📋 Checking community_items...');
  const { data: items, error: itemsError } = await supabase
    .from('community_items')
    .select('*')
    .limit(5);

  if (itemsError) {
    console.log(`   ❌ Error: ${itemsError.message}`);
  } else {
    console.log(`   ✅ Found ${items?.length || 0} item(s)`);
  }

  // Test coupons
  console.log('\n📋 Checking coupons...');
  const { data: coupons, error: couponsError } = await supabase
    .from('coupons')
    .select('*')
    .limit(5);

  if (couponsError) {
    console.log(`   ❌ Error: ${couponsError.message}`);
  } else {
    console.log(`   ✅ Found ${coupons?.length || 0} coupon(s)`);
  }

  console.log('\n✨ Check complete!\n');
}

main().catch(console.error);
