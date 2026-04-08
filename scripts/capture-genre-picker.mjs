#!/usr/bin/env node
/**
 * Visual capture for the new GenrePickerStandalone.
 * Drives Door 3 through several interaction scenarios and saves
 * screenshots so we can inspect bounce reveal, standalone lock,
 * and custom-genre fallback.
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
  console.error('TEST_USER_EMAIL / TEST_USER_PASSWORD not set')
  process.exit(1)
}

async function seedSupabaseSession(ctx) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(url, anon, { auth: { persistSession: false } })
  let { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error && serviceKey) {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: linkData } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    const hashedToken = linkData?.properties?.hashed_token
    const { data: verifyData } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: hashedToken })
    data = verifyData
    error = null
  }
  if (error) throw new Error(`signIn failed: ${error.message}`)
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
  const rawValue = `base64-${Buffer.from(value).toString('base64')}`
  const CHUNK = 3180
  const cookies = []
  if (rawValue.length <= CHUNK) {
    cookies.push({ name: cookieName, value: rawValue })
  } else {
    for (let i = 0, idx = 0; i < rawValue.length; i += CHUNK, idx++) {
      cookies.push({ name: `${cookieName}.${idx}`, value: rawValue.slice(i, i + CHUNK) })
    }
  }
  await ctx.addCookies(cookies.map((c) => ({ ...c, url: BASE, httpOnly: false, sameSite: 'Lax', secure: false })))
}

async function shot(page, name) {
  const file = path.join(OUT, `gp-${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`[shot] ${file}`)
}

async function openDoor3(page) {
  await page.goto(`${BASE}/music-lab/artist-dna`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.removeItem('artist-dna-editor'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=Create New Artist', { timeout: 20000 })
  await page.waitForTimeout(400)
  await shot(page, 'debug-before-click')
  await page.locator('text=Create New Artist').first().click()
  await page.waitForTimeout(1500)
  await shot(page, 'debug-after-click')
  await page.waitForSelector('text=Surprise me', { timeout: 15000 })
  await page.locator('h3:has-text("Surprise me")').first().click()
  await page.waitForTimeout(600)
  await page.waitForSelector('text=Pick a genre', { timeout: 10000 })
  await page.waitForTimeout(500)
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await seedSupabaseSession(ctx)
  const page = await ctx.newPage()

  // Scenario 1: fresh base chips
  await openDoor3(page)
  await shot(page, '01-base-chips')

  // Scenario 2: click Hip-Hop/Rap → subs bounce in
  await page.locator('button', { hasText: 'Hip-Hop/Rap' }).first().click()
  await page.waitForTimeout(500)
  await shot(page, '02-subs-revealed')

  // Scenario 3: click Trap → micros bounce in
  await page.locator('button', { hasText: 'Trap' }).first().click()
  await page.waitForTimeout(500)
  await shot(page, '03-micros-revealed')

  // Scenario 4: click Phonk → full lock breadcrumb
  await page.locator('button', { hasText: 'Phonk' }).first().click()
  await page.waitForTimeout(500)
  await shot(page, '04-full-lock')

  // Scenario 5: clear and do standalone-micro via search
  await openDoor3(page)
  await page.locator('input[placeholder*="Search any genre"]').fill('drill uk')
  await page.waitForTimeout(350)
  await shot(page, '05-search-results')
  await page.locator('text=Drill (UK)').first().click()
  await page.waitForTimeout(500)
  await shot(page, '06-standalone-micro-lock')

  // Scenario 6: custom genre
  await openDoor3(page)
  await page.locator('input[placeholder*="Search any genre"]').fill('Glitchcore Sea Shanty')
  await page.waitForTimeout(350)
  await shot(page, '07-custom-dropdown')
  await page.locator('text=as a custom genre').first().click()
  await page.waitForTimeout(400)
  await shot(page, '08-custom-locked')

  // Mobile
  await ctx.close()
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await seedSupabaseSession(mobileCtx)
  const mp = await mobileCtx.newPage()
  await openDoor3(mp)
  await shot(mp, '09-mobile-base')
  await mp.locator('button', { hasText: 'Hip-Hop/Rap' }).first().click()
  await mp.waitForTimeout(500)
  await shot(mp, '10-mobile-subs')
  await mp.locator('button', { hasText: 'Trap' }).first().click()
  await mp.waitForTimeout(500)
  await shot(mp, '11-mobile-micros')
  await mp.locator('button', { hasText: 'Phonk' }).first().click()
  await mp.waitForTimeout(500)
  await shot(mp, '12-mobile-locked')

  await browser.close()
  console.log('done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
