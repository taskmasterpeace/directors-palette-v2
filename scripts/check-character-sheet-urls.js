#!/usr/bin/env node
/**
 * Check which recipes still reference the old character-sheet template URLs
 * that no longer exist in Supabase Storage.
 */

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

const OLD_PATTERNS = [
  'character-sheet-layout-advanced',
  'character-sheet-layout',
  'directors-palette/templates',
]

async function main() {
  console.log('Scanning user_recipes for stale template URLs...\n')

  const { data: recipes, error } = await supabase
    .from('user_recipes')
    .select('id, name, user_id, is_system, stages')

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  const hits = []
  for (const r of recipes) {
    const str = JSON.stringify(r.stages || [])
    for (const pat of OLD_PATTERNS) {
      if (str.includes(pat)) {
        hits.push({ id: r.id, name: r.name, is_system: r.is_system, user_id: r.user_id, pattern: pat })
        break
      }
    }
  }

  console.log(`Found ${hits.length} recipes referencing old URLs:\n`)
  for (const h of hits) {
    console.log(`  - ${h.name} (id=${h.id}, system=${h.is_system}, pattern=${h.pattern})`)
  }

  // Also check community_items
  console.log('\nScanning community_items...\n')
  const { data: comm } = await supabase
    .from('community_items')
    .select('id, name, content')
    .eq('type', 'recipe')

  const commHits = []
  for (const c of comm || []) {
    const str = JSON.stringify(c.content || {})
    for (const pat of OLD_PATTERNS) {
      if (str.includes(pat)) {
        commHits.push({ id: c.id, name: c.name, pattern: pat })
        break
      }
    }
  }
  console.log(`Found ${commHits.length} community_items referencing old URLs:\n`)
  for (const h of commHits) {
    console.log(`  - ${h.name} (id=${h.id}, pattern=${h.pattern})`)
  }

  // Verify the correct URL actually exists
  console.log('\nVerifying correct URL exists in Storage...')
  const correctPath = 'system/character-sheets/charactersheet-advanced.webp'
  const { data: list } = await supabase.storage.from('templates').list('system/character-sheets')
  console.log('Files in templates/system/character-sheets/:')
  for (const f of list || []) {
    console.log(`  - ${f.name}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
