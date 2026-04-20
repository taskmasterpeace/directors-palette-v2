#!/usr/bin/env node
/**
 * Fix stale character-sheet template URLs in user_recipes.
 *
 * Replaces legacy URLs like:
 *   .../directors-palette/templates/character-sheet-layout-advanced.png
 *   .../directors-palette/templates/character-sheet-layout.png
 * with current URL:
 *   .../templates/system/character-sheets/charactersheet-advanced.webp
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

const CORRECT_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-advanced.webp`

// Anything referencing the old bucket+filename gets replaced
const STALE_PATTERNS = [
  /https?:\/\/[^"'\s)]*\/directors-palette\/templates\/character-sheet-layout-advanced\.png/g,
  /https?:\/\/[^"'\s)]*\/directors-palette\/templates\/character-sheet-layout\.png/g,
]

async function main() {
  console.log('Fetching affected recipes...\n')

  const { data: recipes, error } = await supabase
    .from('user_recipes')
    .select('id, name, stages')

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  let fixedCount = 0

  for (const r of recipes) {
    const original = JSON.stringify(r.stages || [])
    let updated = original

    for (const pat of STALE_PATTERNS) {
      updated = updated.replace(pat, CORRECT_URL)
    }

    if (updated === original) continue

    const newStages = JSON.parse(updated)
    const { error: upErr } = await supabase
      .from('user_recipes')
      .update({ stages: newStages })
      .eq('id', r.id)

    if (upErr) {
      console.error(`  FAIL ${r.name} (${r.id}): ${upErr.message}`)
    } else {
      console.log(`  FIXED ${r.name} (${r.id})`)
      fixedCount++
    }
  }

  console.log(`\nFixed ${fixedCount} recipe(s).`)

  // Also scan community_items just in case
  console.log('\nScanning community_items...')
  const { data: comm } = await supabase
    .from('community_items')
    .select('id, name, content')
    .eq('type', 'recipe')

  let commFixed = 0
  for (const c of comm || []) {
    const original = JSON.stringify(c.content || {})
    let updated = original
    for (const pat of STALE_PATTERNS) {
      updated = updated.replace(pat, CORRECT_URL)
    }
    if (updated === original) continue

    const newContent = JSON.parse(updated)
    const { error: upErr } = await supabase
      .from('community_items')
      .update({ content: newContent })
      .eq('id', c.id)

    if (upErr) {
      console.error(`  FAIL ${c.name} (${c.id}): ${upErr.message}`)
    } else {
      console.log(`  FIXED community ${c.name} (${c.id})`)
      commFixed++
    }
  }
  console.log(`Fixed ${commFixed} community_items.`)
}

main().catch(err => { console.error(err); process.exit(1) })
