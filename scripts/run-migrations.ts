/**
 * Database Migration Runner
 * Runs SQL migrations directly against Supabase PostgreSQL
 *
 * Usage: npx tsx scripts/run-migrations.ts
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import pg from 'pg';

const { Client } = pg;

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL in .env.local');
  console.error('   Add: DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres');
  process.exit(1);
}

async function runSQL(client: pg.Client, sql: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}`);

  try {
    await client.query(sql);
    console.log(`   ✅ Success`);
    return true;
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    // Ignore "already exists" errors
    if (error.code === '42P07' || error.message?.includes('already exists')) {
      console.log(`   ⏭️  Already exists, skipping`);
      return true;
    }
    if (error.code === '42710' || error.message?.includes('already exists')) {
      console.log(`   ⏭️  Already exists, skipping`);
      return true;
    }
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function getCurrentUserEmail(client: pg.Client): Promise<string | null> {
  try {
    // Try to get the first admin email if any exist
    const result = await client.query('SELECT email FROM admin_users LIMIT 1');
    if (result.rows.length > 0) {
      return result.rows[0].email;
    }
  } catch {
    // Table doesn't exist yet
  }
  return null;
}

async function main() {
  console.log('🚀 Director\'s Palette Migration Runner');
  console.log('=====================================\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('   ✅ Connected!\n');

    // ========================================
    // 1. ADMIN USERS TABLE
    // ========================================
    await runSQL(client, `
      CREATE TABLE IF NOT EXISTS admin_users (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `, 'Creating admin_users table');

    await runSQL(client, `
      ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
    `, 'Enabling RLS on admin_users');

    await runSQL(client, `
      DROP POLICY IF EXISTS "Allow read access to authenticated users" ON admin_users;
      CREATE POLICY "Allow read access to authenticated users"
        ON admin_users FOR SELECT
        TO authenticated
        USING (true);
    `, 'Creating admin_users read policy');

    // ========================================
    // 2. COMMUNITY ITEMS TABLE
    // ========================================
    await runSQL(client, `
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
    `, 'Creating community_items table');

    await runSQL(client, `
      CREATE INDEX IF NOT EXISTS idx_community_items_type ON community_items(type);
      CREATE INDEX IF NOT EXISTS idx_community_items_status ON community_items(status);
      CREATE INDEX IF NOT EXISTS idx_community_items_category ON community_items(category);
    `, 'Creating community_items indexes');

    // ========================================
    // 3. COMMUNITY RATINGS TABLE
    // ========================================
    await runSQL(client, `
      CREATE TABLE IF NOT EXISTS community_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        community_item_id UUID NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, community_item_id)
      );
    `, 'Creating community_ratings table');

    // ========================================
    // 4. USER LIBRARY ITEMS TABLE
    // ========================================
    await runSQL(client, `
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
    `, 'Creating user_library_items table');

    // ========================================
    // 5. COUPONS TABLES
    // ========================================
    await runSQL(client, `
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
    `, 'Creating coupons table');

    await runSQL(client, `
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(coupon_id, user_id)
      );
    `, 'Creating coupon_redemptions table');

    // ========================================
    // 6. RLS POLICIES
    // ========================================
    await runSQL(client, `
      ALTER TABLE community_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE community_ratings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_library_items ENABLE ROW LEVEL SECURITY;
      ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
      ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
    `, 'Enabling RLS on all tables');

    // Community Items Policies
    await runSQL(client, `
      DROP POLICY IF EXISTS "Anyone can view approved community items" ON community_items;
      CREATE POLICY "Anyone can view approved community items"
        ON community_items FOR SELECT
        USING (status = 'approved');
    `, 'Creating community_items view policy');

    await runSQL(client, `
      DROP POLICY IF EXISTS "Users can view their own submissions" ON community_items;
      CREATE POLICY "Users can view their own submissions"
        ON community_items FOR SELECT
        USING (auth.uid() = submitted_by);
    `, 'Creating community_items user view policy');

    await runSQL(client, `
      DROP POLICY IF EXISTS "Users can insert community items" ON community_items;
      CREATE POLICY "Users can insert community items"
        ON community_items FOR INSERT
        WITH CHECK (auth.uid() = submitted_by);
    `, 'Creating community_items insert policy');

    await runSQL(client, `
      DROP POLICY IF EXISTS "Admins can do anything with community items" ON community_items;
      CREATE POLICY "Admins can do anything with community items"
        ON community_items FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM admin_users
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        );
    `, 'Creating community_items admin policy');

    // User Library Policies
    await runSQL(client, `
      DROP POLICY IF EXISTS "Users can view their own library items" ON user_library_items;
      CREATE POLICY "Users can view their own library items"
        ON user_library_items FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can insert their own library items" ON user_library_items;
      CREATE POLICY "Users can insert their own library items"
        ON user_library_items FOR INSERT WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can update their own library items" ON user_library_items;
      CREATE POLICY "Users can update their own library items"
        ON user_library_items FOR UPDATE USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can delete their own library items" ON user_library_items;
      CREATE POLICY "Users can delete their own library items"
        ON user_library_items FOR DELETE USING (auth.uid() = user_id);
    `, 'Creating user_library_items policies');

    // Coupons Policies
    await runSQL(client, `
      DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;
      CREATE POLICY "Anyone can view active coupons"
        ON coupons FOR SELECT USING (is_active = TRUE);

      DROP POLICY IF EXISTS "Admins can manage coupons" ON coupons;
      CREATE POLICY "Admins can manage coupons"
        ON coupons FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM admin_users
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        );
    `, 'Creating coupons policies');

    // ========================================
    // 7. VERIFY SETUP
    // ========================================
    console.log('\n📊 Verification:');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('admin_users', 'community_items', 'coupons', 'user_library_items')
      ORDER BY table_name;
    `);
    console.log(`   Tables created: ${tables.rows.map(r => r.table_name).join(', ')}`);

    const adminCount = await client.query('SELECT COUNT(*) FROM admin_users');
    console.log(`   Admin users: ${adminCount.rows[0].count}`);

    console.log('\n✨ All migrations completed successfully!');
    console.log('\n💡 To add yourself as admin, run:');
    console.log('   npx tsx scripts/add-admin.ts your-email@example.com\n');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await client.end();
  }
}

main();
