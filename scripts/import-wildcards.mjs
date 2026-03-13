#!/usr/bin/env node
/**
 * Import wildcard .txt files from E:\prompt related into Supabase wildcards table.
 *
 * Usage: node scripts/import-wildcards.mjs [--dry-run] [--user-id <id>]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'

const SOURCE_DIR = 'E:/prompt related'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Run with: node --env-file=.env.local scripts/import-wildcards.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Map filename patterns to categories
function getCategory(name) {
  if (name.includes('hair') || name.includes('haircut')) return 'hair'
  if (name.includes('fullbody') || name.includes('waistup') || name.includes('dresscode')) return 'outfits'
  if (name.includes('accessories') || name.includes('handbags')) return 'accessories'
  if (name.includes('sneakers') || name.includes('footwear')) return 'footwear'
  if (name.includes('settings') || name.includes('settingsbattlerap')) return 'settings'
  if (name.includes('trainingdata') || name.includes('locations')) return 'training_data'
  return 'general'
}

// Map filename to description
function getDescription(name) {
  const descriptions = {
    blkmen_hair: 'Black men hairstyles',
    blkmanhaircut: 'Black man haircut styles',
    blkmen_accessories: 'Black men accessories and jewelry',
    blkmen_footwear_color: 'Black men footwear with color descriptions',
    blkmen_footwear: 'Black men footwear styles',
    blkmen_fullbody: 'Black men full body outfit descriptions',
    blkmen_sneakers_color: 'Black men sneakers with color descriptions',
    blkmen_sneakers: 'Black men sneaker styles',
    blkmen_waistup: 'Black men waist-up outfit descriptions',
    blkmendresscode: 'Black men dress code styles',
    blkwomen_hair: 'Black women hairstyles',
    blkwomanhair: 'Black woman hair styles',
    blkwomen_accessories: 'Black women accessories and jewelry',
    blkwomen_footwear_color: 'Black women footwear with color descriptions',
    blkwomen_footwear: 'Black women footwear styles',
    blkwomen_fullbody: 'Black women full body outfit descriptions',
    blkwomen_handbags: 'Black women designer handbags',
    blkwomen_sneakers_color: 'Black women sneakers with color descriptions',
    blkwomen_sneakers: 'Black women sneaker styles',
    blkwomen_waistup: 'Black women waist-up outfit descriptions',
    blkwomendresscode: 'Black women dress code styles',
    settings_indoor: 'Indoor battle rap venue settings',
    settings_outdoor: 'Outdoor battle rap venue settings',
    settingsbattlerap: 'Battle rap settings and venues',
    trainingdata_commas: 'Training data with comma format',
    trainingdata_locations_nopeople: 'Location descriptions without people',
    trainingdata_locations_people: 'Location descriptions with people',
    trainingdata: 'General training data prompts',
  }
  return descriptions[name] || name.replace(/_/g, ' ')
}

// Convert filename to wildcard name: strip leading/trailing underscores, dots → underscores
function fileToName(filename) {
  return basename(filename, '.txt')
    .replace(/^_+|_+$/g, '')  // strip leading/trailing underscores
    .replace(/\./g, '_')       // dots to underscores
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const userIdIdx = process.argv.indexOf('--user-id')
  let userId = userIdIdx !== -1 ? process.argv[userIdIdx + 1] : null

  // Default to the main user
  if (!userId) {
    const { data } = await supabase.from('user_credits').select('user_id').order('lifetime_purchased', { ascending: false }).limit(1)
    userId = data?.[0]?.user_id
    if (!userId) {
      console.error('Could not determine user ID. Pass --user-id <id>')
      process.exit(1)
    }
    console.log(`Using user: ${userId}`)
  }

  // Check existing wildcards for this user
  const { data: existing } = await supabase.from('wildcards').select('name').eq('user_id', userId)
  const existingNames = new Set((existing || []).map(w => w.name))
  console.log(`Existing wildcards: ${existingNames.size}`)

  const files = readdirSync(SOURCE_DIR).filter(f => f.endsWith('.txt'))
  console.log(`Found ${files.length} wildcard files\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const file of files) {
    const name = fileToName(file)
    const category = getCategory(name)
    const description = getDescription(name)

    const content = readFileSync(join(SOURCE_DIR, file), 'utf-8').trim()
    const lines = content.split('\n').filter(l => l.trim().length > 0)

    if (lines.length === 0) {
      console.log(`  SKIP ${name} (empty file)`)
      skipped++
      continue
    }

    if (existingNames.has(name)) {
      console.log(`  EXISTS ${name} (${lines.length} entries) — updating`)
      if (!dryRun) {
        const { error } = await supabase.from('wildcards')
          .update({ content: lines.join('\n'), category, description, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('name', name)
        if (error) {
          console.error(`    ERROR updating ${name}:`, error.message)
          errors++
          continue
        }
      }
      imported++
      continue
    }

    console.log(`  IMPORT ${name} → category: ${category} (${lines.length} entries)`)

    if (!dryRun) {
      const { error } = await supabase.from('wildcards').insert({
        user_id: userId,
        name,
        category,
        description,
        content: lines.join('\n'),
        is_shared: false,
      })
      if (error) {
        console.error(`    ERROR inserting ${name}:`, error.message)
        errors++
        continue
      }
    }
    imported++
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done: ${imported} imported, ${skipped} skipped, ${errors} errors`)
}

main().catch(console.error)
