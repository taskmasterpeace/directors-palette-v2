#!/usr/bin/env node
/**
 * Upload AIOBR thumbnail reference images to Supabase Storage.
 * Destination: templates/system/aiobr-thumbnails/
 *
 * Run once, then URLs are baked into recipe-samples.ts.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local manually
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

const SOURCE_DIR = 'D:/git/aiobr/thumbnails/Best Ones to Me'
const BUCKET = 'templates'
const DEST_PREFIX = 'system/aiobr-thumbnails'

function slugify(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function main() {
  const files = fs.readdirSync(SOURCE_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
  console.log(`Found ${files.length} image(s) in ${SOURCE_DIR}`)

  const results = []
  for (const file of files) {
    const full = path.join(SOURCE_DIR, file)
    const ext = path.extname(file).toLowerCase()
    const slug = slugify(file)
    const destPath = `${DEST_PREFIX}/${slug}${ext}`
    const buf = fs.readFileSync(full)

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(destPath, buf, {
        contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
        upsert: true,
      })

    if (error) {
      console.error(`FAIL ${file}: ${error.message}`)
      continue
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${destPath}`
    console.log(`OK   ${file} -> ${publicUrl}`)
    results.push({ file, url: publicUrl, slug })
  }

  // Emit ready-to-paste JS snippet
  console.log('\n// --- AIOBR reference images (paste into recipe-samples.ts) ---')
  console.log('const AIOBR_REFS = [')
  results.forEach((r, i) => {
    const displayName = r.file.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/-\w{11}$/, '').trim()
    console.log(`  { id: 'aiobr_ref_${i + 1}', url: '${r.url}', name: '${displayName}', isStatic: true },`)
  })
  console.log(']')
}

main().catch(err => { console.error(err); process.exit(1) })
