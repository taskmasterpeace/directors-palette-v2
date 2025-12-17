import { config } from 'dotenv'
import path from 'path'
import pg from 'pg'

const { Client } = pg

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') })

async function fixCommunityRLS() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
        console.error('DATABASE_URL not found')
        process.exit(1)
    }

    const client = new Client({ connectionString: databaseUrl })

    try {
        await client.connect()
        console.log('Connected to database')

        // Drop the problematic admin policy
        console.log('Dropping old admin policy...')
        await client.query(`DROP POLICY IF EXISTS "Admins can do anything with community items" ON community_items`)
        
        // Create fixed policy
        console.log('Creating fixed admin policy...')
        await client.query(`
            CREATE POLICY "Admins can do anything with community items"
            ON community_items FOR ALL
            USING (
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
            )
        `)

        // Also add service role access to admin_users
        console.log('Ensuring admin_users service role access...')
        await client.query(`DROP POLICY IF EXISTS "Service role full access to admin_users" ON admin_users`)
        await client.query(`
            CREATE POLICY "Service role full access to admin_users"
            ON admin_users FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true)
        `)

        // Reload schema
        console.log('Reloading PostgREST schema...')
        await client.query(`NOTIFY pgrst, 'reload schema'`)

        console.log('✅ RLS policies fixed!')
    } catch (err) {
        console.error('Error:', err)
    } finally {
        await client.end()
    }
}

fixCommunityRLS()
