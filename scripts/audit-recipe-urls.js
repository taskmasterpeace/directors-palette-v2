#!/usr/bin/env node
/**
 * Audit every Supabase Storage URL referenced in user_recipes + community_items.
 * HEAD-probes each unique URL and reports any that return non-200.
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

const URL_RE = /https?:\/\/[^\s"')<>]+/g

async function headProbe(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.status
  } catch (e) {
    return `ERR ${e.message}`
  }
}

async function main() {
  const urlMap = new Map() // url -> Set of "source:id:name"

  // user_recipes
  const { data: recipes } = await supabase
    .from('user_recipes')
    .select('id, name, is_system, user_id, stages')

  for (const r of recipes || []) {
    const str = JSON.stringify(r.stages || [])
    const matches = str.match(URL_RE) || []
    for (const u of matches) {
      if (!u.includes('supabase.co/storage')) continue
      if (!urlMap.has(u)) urlMap.set(u, new Set())
      urlMap.get(u).add(`recipe:${r.id}:${r.name}${r.is_system ? ' (system)' : ''}`)
    }
  }

  // community_items
  const { data: comm } = await supabase
    .from('community_items')
    .select('id, name, type, content')

  for (const c of comm || []) {
    const str = JSON.stringify(c.content || {})
    const matches = str.match(URL_RE) || []
    for (const u of matches) {
      if (!u.includes('supabase.co/storage')) continue
      if (!urlMap.has(u)) urlMap.set(u, new Set())
      urlMap.get(u).add(`community(${c.type}):${c.id}:${c.name}`)
    }
  }

  console.log(`Probing ${urlMap.size} unique Supabase Storage URLs...\n`)

  const broken = []
  const urls = [...urlMap.keys()]
  // Probe in parallel batches
  const batchSize = 10
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async u => ({ url: u, status: await headProbe(u) })))
    for (const { url, status } of results) {
      if (status !== 200) {
        broken.push({ url, status, sources: [...urlMap.get(url)] })
        console.log(`  [${status}] ${url}`)
      }
    }
  }

  console.log(`\n${broken.length} broken URL(s) found.\n`)

  if (broken.length === 0) return

  console.log('Affected records:')
  const byRecord = new Map()
  for (const b of broken) {
    for (const src of b.sources) {
      if (!byRecord.has(src)) byRecord.set(src, [])
      byRecord.get(src).push({ status: b.status, url: b.url })
    }
  }
  for (const [src, entries] of byRecord) {
    console.log(`\n  ${src}`)
    for (const e of entries) {
      console.log(`    [${e.status}] ${e.url}`)
    }
  }
}

main().catch(err => { console.error(err); process.exit(1) })
