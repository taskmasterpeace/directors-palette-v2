import { config } from 'dotenv'
import path from 'path'
import pg from 'pg'
const { Client } = pg

config({ path: path.join(process.cwd(), '.env.local') })

async function checkAdminSetup() {
    const client = new Client({ connectionString: process.env.DATABASE_URL })

    try {
        await client.connect()
        console.log('📊 Admin System Status\n' + '='.repeat(40))

        // Check admin_users
        const admins = await client.query('SELECT * FROM admin_users')
        console.log('\n👤 Admin Users (' + admins.rows.length + '):')
        admins.rows.forEach((a: any) => console.log('   - ' + a.email))

        // Check community_items
        const items = await client.query(`
            SELECT status, COUNT(*) as count
            FROM community_items
            GROUP BY status
        `)
        console.log('\n📦 Community Items:')
        if (items.rows.length === 0) {
            console.log('   - No items yet')
        } else {
            items.rows.forEach((r: any) => console.log('   - ' + r.status + ': ' + r.count))
        }

        // Check api_keys table exists
        const apiKeys = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'api_keys'
        `)
        const hasApiKeys = apiKeys.rows.length > 0
        console.log('\n🔑 API Keys Table: ' + (hasApiKeys ? '✅ Exists' : '❌ Missing'))

        if (hasApiKeys) {
            const keyCount = await client.query('SELECT COUNT(*) as count FROM api_keys')
            console.log('   - Total keys: ' + keyCount.rows[0].count)
        }

        // Check coupons
        const coupons = await client.query('SELECT COUNT(*) as count FROM coupons')
        console.log('\n🎟️  Coupons: ' + coupons.rows[0].count)

        // Check user stats
        const users = await client.query(`
            SELECT COUNT(*) as count FROM auth.users
        `)
        console.log('\n👥 Total Users: ' + users.rows[0].count)

        console.log('\n' + '='.repeat(40))
        console.log('✅ Admin system check complete!')

    } catch (err: any) {
        console.error('Error:', err.message)
    } finally {
        await client.end()
    }
}

checkAdminSetup()
