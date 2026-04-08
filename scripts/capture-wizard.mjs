#!/usr/bin/env node
/**
 * Standalone visual capture for the Artist Creation Wizard.
 * Hits the running dev server on :3002, logs in, navigates the doors,
 * saves screenshots to screenshots/wizard-*.png.
 */
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BASE = process.env.CAPTURE_BASE || 'http://localhost:3002'
const OUT = path.join(__dirname, '..', 'screenshots')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const email = process.env.TEST_USER_EMAIL
const password = process.env.TEST_USER_PASSWORD
if (!email || !password) {
  console.error('TEST_USER_EMAIL / TEST_USER_PASSWORD not set in .env.local')
  process.exit(1)
}

// Obtain a valid Supabase session via the JS SDK, then inject the @supabase/ssr
// cookies (sb-<ref>-auth-token{,-code-verifier}) into the browser context.
// This bypasses form hydration issues in dev.
async function seedSupabaseSession(ctx) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon) throw new Error('Supabase env vars missing')

  // Try password login first, fall back to admin-generated magic link if it fails
  const supabase = createClient(url, anon, { auth: { persistSession: false } })
  let { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error && serviceKey) {
    console.log('[auth] password login failed, using admin generateLink fallback')
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkErr) throw new Error(`admin generateLink failed: ${linkErr.message}`)
    const hashedToken = linkData?.properties?.hashed_token
    if (!hashedToken) throw new Error('admin generateLink returned no hashed_token')
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashedToken,
    })
    if (verifyErr) throw new Error(`verifyOtp failed: ${verifyErr.message}`)
    data = verifyData
    error = null
  }
  if (error) throw new Error(`Supabase signIn failed: ${error.message}`)

  // @supabase/ssr stores the session as a single JSON cookie named sb-<project-ref>-auth-token.
  const ref = new URL(url).host.split('.')[0]
  const cookieName = `sb-${ref}-auth-token`
  const value = JSON.stringify({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  })

  // @supabase/ssr wraps the JSON in `base64-` prefix and chunks cookies
  // at ~3180 bytes as cookieName.0, cookieName.1, ... when too long.
  const rawValue = `base64-${Buffer.from(value).toString('base64')}`
  const CHUNK = 3180
  const cookies = []
  if (rawValue.length <= CHUNK) {
    cookies.push({ name: cookieName, value: rawValue })
  } else {
    for (let i = 0, idx = 0; i < rawValue.length; i += CHUNK, idx++) {
      cookies.push({
        name: `${cookieName}.${idx}`,
        value: rawValue.slice(i, i + CHUNK),
      })
    }
  }
  await ctx.addCookies(
    cookies.map((c) => ({
      ...c,
      url: BASE,
      httpOnly: false,
      sameSite: 'Lax',
      secure: false,
    })),
  )
  console.log(`[auth] seeded ${cookies.length} cookie chunk(s)`)
}

async function login(page) {
  // seedSupabaseSession is called on the context before any page navigation
  // so this function is a no-op passthrough kept for readability.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 })
}

async function shot(page, name) {
  const file = path.join(OUT, `wizard-${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`[shot] ${file}`)
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await seedSupabaseSession(ctx)
  const page = await ctx.newPage()

  await login(page)

  // Reset persisted wizard state from any prior run so we always start on the list
  await page.goto(`${BASE}/music-lab/artist-dna`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.removeItem('artist-dna-editor'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Create New Artist', { timeout: 20000 })
  await page.waitForTimeout(500)
  await shot(page, 'list')

  // Open door selector
  await page.locator('text=Create New Artist').first().click()
  await page.waitForSelector('text=Inspired by an artist', { timeout: 10000 })
  await page.waitForTimeout(300)
  await shot(page, 'doors-desktop')

  // Helper: return to door selector by clicking the door's Back button
  const backToDoors = async () => {
    await page.locator('button', { hasText: /^Back$/ }).first().click()
    await page.waitForSelector('text=Inspired by an artist', { timeout: 10000 })
    await page.waitForTimeout(300)
  }

  // Door 1
  await page.locator('text=Inspired by an artist').first().click()
  await page.waitForTimeout(500)
  await shot(page, 'door1')

  // Door 2
  await backToDoors()
  await page.locator('text=Build it').first().click()
  await page.waitForTimeout(500)
  await shot(page, 'door2')

  // Door 3
  await backToDoors()
  await page.locator('text=Surprise me').first().click()
  await page.waitForTimeout(500)
  await shot(page, 'door3')

  // Mobile: capture doors + each door interior
  await ctx.close()
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })
  await seedSupabaseSession(mobileCtx)
  const mp = await mobileCtx.newPage()

  await mp.goto(`${BASE}/music-lab/artist-dna`, { waitUntil: 'domcontentloaded' })
  await mp.evaluate(() => localStorage.removeItem('artist-dna-editor'))
  await mp.reload({ waitUntil: 'domcontentloaded' })
  await mp.waitForSelector('text=Create New Artist', { timeout: 15000 })
  await shot(mp, 'mobile-list-debug')
  await mp.locator('text=Create New Artist').first().click()
  await mp.waitForTimeout(800)
  await shot(mp, 'mobile-afterclick-debug')
  await mp.waitForSelector('text=Inspired by an artist', { timeout: 10000 })
  await mp.waitForTimeout(400)
  await shot(mp, 'mobile-doors')

  const mobileBack = async () => {
    await mp.locator('button', { hasText: /^Back$/ }).first().click()
    await mp.waitForSelector('text=Inspired by an artist', { timeout: 10000 })
    await mp.waitForTimeout(300)
  }

  await mp.locator('text=Inspired by an artist').first().click()
  await mp.waitForTimeout(500)
  await shot(mp, 'mobile-door1')

  await mobileBack()
  await mp.locator('text=Build it').first().click()
  await mp.waitForTimeout(500)
  await shot(mp, 'mobile-door2')

  await mobileBack()
  await mp.locator('text=Surprise me').first().click()
  await mp.waitForTimeout(500)
  await shot(mp, 'mobile-door3')

  await browser.close()
  console.log('done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
