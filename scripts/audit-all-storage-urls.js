#!/usr/bin/env node
/**
 * Audit Supabase Storage URLs across all tables likely to contain them.
 * Uses `select *` then scans all string values for supabase storage URLs.
 * HEAD-probes each unique URL; reports non-200s with sources.
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

const URL_RE = /https?:\/\/[^\s"')<>\]]+/g

// Tables to scan + an ID label column if present (for reporting)
const TABLES = [
  'user_recipes',
  'community_items',
  'style_guides',
  'announcements',
  'storybook_projects',
  'storyboards',
  'storyboard_shots',
  'gallery',
  'reference',
  'user_library_items',
  'user_loras',
  'artist_profiles',
  'brands',
  'wildcards',
  'user_wildcards',
  'figurines',
  'sound_studio_presets',
]

async function headProbe(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.status
  } catch (e) {
    return `ERR ${e.message}`
  }
}

async function main() {
  const urlMap = new Map()

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*').limit(5000)
    if (error) {
      console.log(`[skip] ${table}: ${error.message}`)
      continue
    }
    const blob = JSON.stringify(data)
    const matches = blob.match(URL_RE) || []
    let count = 0
    for (const u of matches) {
      if (!u.includes('supabase.co/storage')) continue
      const clean = u.replace(/[,.;:)\]"']+$/, '')
      if (!urlMap.has(clean)) urlMap.set(clean, new Set())
      // Find the row containing this URL
      const hit = data.find(r => JSON.stringify(r).includes(clean))
      const label = hit ? `${table}:${hit.id}:${hit.name || hit.title || ''}` : `${table}:?`
      urlMap.get(clean).add(label)
      count++
    }
    console.log(`[${table}] ${data.length} rows, ${count} storage URLs`)
  }

  console.log(`\nProbing ${urlMap.size} unique Supabase Storage URLs...\n`)

  const broken = []
  const urls = [...urlMap.keys()]
  const batchSize = 15
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async u => ({ url: u, status: await headProbe(u) })))
    for (const { url, status } of results) {
      if (status !== 200) broken.push({ url, status, sources: [...urlMap.get(url)] })
    }
    process.stdout.write(`  probed ${Math.min(i + batchSize, urls.length)}/${urls.length}\r`)
  }
  console.log()

  console.log(`\n${broken.length} broken URL(s) found.\n`)

  // Group by unique source row (deduplicated)
  const bySource = new Map()
  for (const b of broken) {
    for (const s of b.sources) {
      if (!bySource.has(s)) bySource.set(s, [])
      bySource.get(s).push({ status: b.status, url: b.url })
    }
  }
  for (const [src, entries] of bySource) {
    console.log(`\n  ${src}`)
    for (const e of entries) console.log(`    [${e.status}] ${e.url}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
