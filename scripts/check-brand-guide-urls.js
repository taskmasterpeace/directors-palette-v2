#!/usr/bin/env node
/**
 * Scan DB for persisted brand-guide template URLs that could drift
 * during a Storage reorg (same risk vector as the character-sheet
 * incident on 2026-04-20).
 *
 * Tables checked:
 *   - brands (brand_guide_image_url column — this is the GENERATED output
 *     per-brand, not the template; listed for completeness)
 *   - user_recipes (stages could embed the template)
 *   - community_items (type=recipe)
 *   - brand_studio_projects (if it exists and has a config column)
 *
 * Also verifies both candidate Storage locations so we know which bucket
 * is authoritative.
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

const TEMPLATE_PATTERNS = [
  'brand-visual-guide-template',
  'brand-guides/brand-visual',
  'templates/system/brand-guides',
  'directors-palette/templates/system/brand-guides',
]

async function scanTable(table, jsonCol, idCols = ['id', 'name']) {
  console.log(`\nScanning ${table}.${jsonCol}...`)
  const { data, error } = await supabase.from(table).select([...idCols, jsonCol].join(','))
  if (error) {
    console.log(`  (table unavailable: ${error.message})`)
    return []
  }
  const hits = []
  for (const row of data || []) {
    const str = JSON.stringify(row[jsonCol] || {})
    for (const pat of TEMPLATE_PATTERNS) {
      if (str.includes(pat)) {
        hits.push({ ...Object.fromEntries(idCols.map(c => [c, row[c]])), pattern: pat })
        break
      }
    }
  }
  console.log(`  Found ${hits.length} rows with template URL references`)
  for (const h of hits) console.log(`    - ${JSON.stringify(h)}`)
  return hits
}

async function main() {
  console.log('=== Brand Guide Template URL Diagnostic ===')

  await scanTable('user_recipes', 'stages', ['id', 'name', 'is_system'])
  await scanTable('community_items', 'content', ['id', 'name'])

  // brand_studio_projects may or may not exist; try a few likely column names
  console.log('\nScanning brand_studio_projects (if exists)...')
  const { data: bsp, error: bspErr } = await supabase
    .from('brand_studio_projects')
    .select('*')
    .limit(1)
  if (bspErr) {
    console.log(`  (table unavailable: ${bspErr.message})`)
  } else if (bsp && bsp[0]) {
    console.log(`  columns: ${Object.keys(bsp[0]).join(', ')}`)
  } else {
    console.log(`  (empty table, no sample row)`)
  }

  // brands.brand_guide_image_url stores GENERATED per-brand URLs, not the
  // template — but if any happen to match the template pattern that'd be
  // a bug worth flagging.
  console.log('\nScanning brands.brand_guide_image_url for template-shaped URLs...')
  const { data: brands, error: brandsErr } = await supabase
    .from('brands')
    .select('id, name, brand_guide_image_url')
  if (brandsErr) {
    console.log(`  (unavailable: ${brandsErr.message})`)
  } else {
    const odd = (brands || []).filter(b => {
      if (!b.brand_guide_image_url) return false
      return TEMPLATE_PATTERNS.some(p => b.brand_guide_image_url.includes(p))
    })
    console.log(`  Found ${odd.length} brands with template-shaped URLs (should be 0)`)
    for (const b of odd) console.log(`    - ${b.name} (id=${b.id}): ${b.brand_guide_image_url}`)
  }

  // Verify Storage — which bucket holds the file?
  console.log('\n=== Storage Verification ===')
  const candidates = [
    { bucket: 'templates', prefix: 'system/brand-guides' },
    { bucket: 'directors-palette', prefix: 'templates/system/brand-guides' },
  ]
  for (const { bucket, prefix } of candidates) {
    console.log(`\nBucket: ${bucket} / Path: ${prefix}`)
    const { data: list, error } = await supabase.storage.from(bucket).list(prefix)
    if (error) {
      console.log(`  (error: ${error.message})`)
      continue
    }
    if (!list || list.length === 0) {
      console.log(`  (empty)`)
      continue
    }
    for (const f of list) console.log(`  - ${f.name}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
