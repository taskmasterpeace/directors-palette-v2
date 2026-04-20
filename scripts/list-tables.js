#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // Use RPC if available, else fall back to pg meta via raw SQL endpoint
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `SELECT table_name, column_name, data_type
          FROM information_schema.columns
          WHERE table_schema='public'
          ORDER BY table_name, ordinal_position`,
  })
  if (error) {
    // Try a different approach — query a known supabase meta path
    console.log('RPC failed:', error.message)
    console.log('\nFalling back — listing via probing candidate tables...')
  } else {
    for (const r of data) console.log(`${r.table_name}.${r.column_name} (${r.data_type})`)
  }
}
main()
