/**
 * Add Admin User
 * Usage: npx tsx scripts/add-admin.ts email@example.com
 */

import { config } from 'dotenv';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

config({ path: path.join(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL in .env.local');
  process.exit(1);
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Usage: npx tsx scripts/add-admin.ts email@example.com');
    process.exit(1);
  }

  if (!email.includes('@')) {
    console.error('❌ Invalid email format');
    process.exit(1);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`\n🔐 Adding admin: ${email}`);

    await client.query(
      'INSERT INTO admin_users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );

    const result = await client.query('SELECT * FROM admin_users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      console.log(`✅ Admin added successfully!`);
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Created: ${result.rows[0].created_at}\n`);
    }

    // List all admins
    const allAdmins = await client.query('SELECT email FROM admin_users ORDER BY created_at');
    console.log(`📋 All admin users (${allAdmins.rows.length}):`);
    allAdmins.rows.forEach((row, i) => console.log(`   ${i + 1}. ${row.email}`));
    console.log('');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

main();
