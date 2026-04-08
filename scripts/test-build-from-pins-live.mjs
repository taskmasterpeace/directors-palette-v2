#!/usr/bin/env node
/**
 * Live smoke test: hit the dev server's /api/artist-dna/build-from-pins
 * with a standalone-micro payload and verify the model respects the lock.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BASE = process.env.CAPTURE_BASE || 'http://localhost:3002'
const email = process.env.TEST_USER_EMAIL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function getCookieHeader() {
  const supabase = createClient(supabaseUrl, anon, { auth: { persistSession: false } })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const hashedToken = linkData?.properties?.hashed_token
  const { data } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: hashedToken })
  const ref = new URL(supabaseUrl).host.split('.')[0]
  const cookieName = `sb-${ref}-auth-token`
  const value = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  })
  const rawValue = `base64-${Buffer.from(value).toString('base64')}`
  const CHUNK = 3180
  if (rawValue.length <= CHUNK) return `${cookieName}=${rawValue}`
  const parts = []
  for (let i = 0, idx = 0; i < rawValue.length; i += CHUNK, idx++) {
    parts.push(`${cookieName}.${idx}=${rawValue.slice(i, i + CHUNK)}`)
  }
  return parts.join('; ')
}

async function buildArtist(pins, label) {
  const cookieHeader = await getCookieHeader()
  console.log(`\n▸ ${label}`)
  const res = await fetch(`${BASE}/api/artist-dna/build-from-pins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
    body: JSON.stringify({ pins }),
  })
  if (!res.ok) {
    console.log(`  FAIL http ${res.status}: ${await res.text()}`)
    return null
  }
  const { dna } = await res.json()
  const genres = dna?.sound?.genres ?? []
  const subs = dna?.sound?.subgenres ?? []
  const micros = dna?.sound?.microgenres ?? []
  console.log(`  genres:     ${JSON.stringify(genres)}`)
  console.log(`  subgenres:  ${JSON.stringify(subs)}`)
  console.log(`  microgenres:${JSON.stringify(micros)}`)
  console.log(`  stageName:  ${dna?.identity?.stageName}`)
  console.log(`  city:       ${dna?.identity?.city}`)
  return dna
}

async function main() {
  // 1. Standalone micro: Drill (UK) — model should NOT generalize to hip-hop
  const a = await buildArtist(
    { genre: { micro: 'Drill (UK)', lockedLevel: 'micro' } },
    'standalone micro: Drill (UK)',
  )
  const aGenres = (a?.sound?.genres ?? []).map((g) => String(g).toLowerCase())
  const aMicros = (a?.sound?.microgenres ?? []).map((g) => String(g).toLowerCase())
  const drillPresent =
    aGenres.some((g) => g.includes('drill')) || aMicros.some((g) => g.includes('drill'))
  console.log(`  ${drillPresent ? 'ok' : 'FAIL'} drill present in genres/micros`)

  // 2. Custom genre: Glitchcore Sea Shanty
  const b = await buildArtist(
    { genre: { base: 'Glitchcore Sea Shanty', custom: true, lockedLevel: 'base' } },
    'custom: Glitchcore Sea Shanty',
  )
  const bAll = [
    ...(b?.sound?.genres ?? []),
    ...(b?.sound?.subgenres ?? []),
    ...(b?.sound?.microgenres ?? []),
  ]
    .map((g) => String(g).toLowerCase())
    .join(' ')
  const custHit = bAll.includes('glitchcore') || bAll.includes('sea shanty')
  console.log(`  ${custHit ? 'ok' : 'FAIL'} custom terms surfaced`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
