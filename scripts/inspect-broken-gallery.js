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

const IDS = [
  'd410b4bf-1b17-4214-895b-60ba0a12cb2c',
  'a481c40f-d281-498a-8b8c-f6658987b35a',
  'af75739a-133b-447e-9edf-08d0fcff90b8',
  '00a995f1-0d64-4c98-877d-1476c8ca894d',
  '9fb59f2e-5d50-48bf-bb98-73b940e5352d',
]

async function main() {
  const { data } = await supabase.from('gallery').select('*').in('id', IDS)
  for (const r of data) {
    console.log('\n---')
    console.log('id:', r.id)
    console.log('user_id:', r.user_id)
    console.log('created_at:', r.created_at)
    const keys = Object.keys(r)
    for (const k of keys) {
      const v = r[k]
      if (typeof v === 'string' && v.length < 200) console.log(`${k}:`, v)
      else if (v && typeof v === 'object') console.log(`${k}:`, JSON.stringify(v).slice(0, 300))
    }
  }
}
main()
