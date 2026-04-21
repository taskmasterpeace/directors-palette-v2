#!/usr/bin/env node
/**
 * Upload AIOBR title card layout reference images to Supabase Storage.
 * Destination: templates/system/aiobr-title-cards/
 *
 * Source: 6 curated examples from user's Pinterest/AI collection at
 * C:/Users/taskm/Downloads/titles/, covering 6 distinct style families:
 *   1. Text-first pulp comic
 *   2. 32BIT pixel-style sheet (meta-pattern demo)
 *   3. Action figure style sheet (meta-pattern demo)
 *   4. Atmospheric painterly (Batman TAS)
 *   5. Diegetic signs (text as in-scene object)
 *   6. Typographic poster grid
 *
 * These are LAYOUT / TYPOGRAPHY / COMPOSITION refs only — the recipe
 * prompt makes that clear. Not subject refs.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach(line => {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
})

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const SOURCE_DIR = 'C:/Users/taskm/Downloads/titles'
const BUCKET = 'templates'
const DEST_PREFIX = 'system/aiobr-title-cards'

// Curated 6 refs with semantic slugs (so URLs stay readable + stable)
const REFS = [
  { source: '541d27ac98ece761af76668c1edf9f69.jpg', slug: 'text-first-pulp-comic-grid' },
  { source: 'image_1776787996043.png',              slug: 'style-sheet-32bit-pixel' },
  { source: 'image_1776788034960.png',              slug: 'style-sheet-action-figure' },
  { source: 'e278c4d92c682849fa4ac333ec437304.jpg', slug: 'atmospheric-painterly-noir' },
  { source: 'image_1776787939117.png',              slug: 'diegetic-signs-in-scene' },
  { source: 'image_1776788811243.png',              slug: 'typographic-poster-grid' },
]

async function main() {
  console.log(`Uploading ${REFS.length} title card refs to ${BUCKET}/${DEST_PREFIX}/`)
  const results = []

  for (const { source, slug } of REFS) {
    const full = path.join(SOURCE_DIR, source)
    if (!fs.existsSync(full)) {
      console.error(`  MISSING: ${source}`)
      process.exit(1)
    }
    const ext = path.extname(source).toLowerCase()
    const destPath = `${DEST_PREFIX}/${slug}${ext}`
    const buf = fs.readFileSync(full)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(destPath, buf, {
        contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
        upsert: true,
      })

    if (error) {
      console.error(`  FAILED ${source}: ${error.message}`)
      process.exit(1)
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${destPath}`
    console.log(`  OK ${slug}${ext}`)
    results.push({ slug, url: publicUrl })
  }

  console.log('\nAll uploads complete. URLs for recipe-samples.ts:\n')
  for (const r of results) {
    console.log(`  '${r.url}',`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
