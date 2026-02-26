/**
 * Real interactive Playwright test for Artist DNA
 * - Loads existing saved artists (the path that crashed)
 * - Clicks through every tab on a saved artist
 * - Opens the seed dialog, verifies cost
 * - Creates a new artist and fills fields
 * - Monitors console for errors throughout
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BASE_URL = 'http://localhost:3002'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const consoleErrors = []

async function getAuthCookies() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({
      email: process.env.TEST_USER_EMAIL,
      password: process.env.TEST_USER_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
  const session = await res.json()
  console.log(`Authenticated as: ${session.user?.email}\n`)

  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const cookieBase = `sb-${projectRef}-auth-token`
  const sessionData = JSON.stringify(session)
  const CHUNK_SIZE = 3500
  const chunks = []
  for (let i = 0; i < sessionData.length; i += CHUNK_SIZE) {
    chunks.push(sessionData.substring(i, i + CHUNK_SIZE))
  }
  const urlObj = new URL(BASE_URL)
  const cookies = []
  if (chunks.length === 1) {
    cookies.push({ name: cookieBase, value: chunks[0], domain: urlObj.hostname, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' })
  } else {
    for (let i = 0; i < chunks.length; i++) {
      cookies.push({ name: `${cookieBase}.${i}`, value: chunks[i], domain: urlObj.hostname, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' })
    }
  }
  return cookies
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const cookies = await getAuthCookies()
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  await context.addCookies(cookies)
  const page = await context.newPage()

  // Collect ALL console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  page.on('pageerror', (err) => {
    consoleErrors.push(`PAGE ERROR: ${err.message}`)
  })

  let passed = 0
  let failed = 0
  function check(name, condition) {
    if (condition) {
      console.log(`  ✓ ${name}`)
      passed++
    } else {
      console.log(`  ✗ FAIL: ${name}`)
      failed++
    }
  }

  try {
    // ═══════════════════════════════════════════════════════════════════
    console.log('═══ TEST 1: Load Artist DNA page ═══')
    // ═══════════════════════════════════════════════════════════════════
    await page.goto(`${BASE_URL}/music-lab/artist-dna`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    check('Page loaded (not redirected)', !page.url().includes('/landing'))
    check('"Create New Artist" visible', await page.getByText('Create New Artist').isVisible().catch(() => false))
    check('"Start from Real Artist" visible', await page.getByText('Start from Real Artist').isVisible().catch(() => false))

    // Count existing saved artists
    const artistCards = page.locator('[class*="card"]').filter({ has: page.locator('button') })
    await page.screenshot({ path: 'test-dna-01-page.png', fullPage: true })

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ TEST 2: Load existing saved artist (if any) ═══')
    // ═══════════════════════════════════════════════════════════════════

    // Look for any clickable artist card (not the Create/Seed buttons)
    // Artist cards have the artist name as text content
    const allButtons = await page.locator('button').all()
    let artistCardFound = false
    for (const btn of allButtons) {
      const text = await btn.textContent().catch(() => '')
      // Skip the action buttons
      if (text.includes('Create New') || text.includes('Start from') || text.includes('Delete')) continue
      // Check if this looks like an artist card (has text, not an icon button)
      const isVisible = await btn.isVisible().catch(() => false)
      if (isVisible && text.trim().length > 2 && !text.includes('v0.')) {
        console.log(`  Found existing artist card: "${text.trim().substring(0, 50)}"`)
        artistCardFound = true

        // Click it to load into editor
        const errorsBefore = consoleErrors.length
        await btn.click({ force: true })
        await page.waitForTimeout(2000)
        await page.screenshot({ path: 'test-dna-02-loaded-artist.png', fullPage: true })

        const errorsAfter = consoleErrors.length
        check('Loaded artist without console errors', errorsBefore === errorsAfter)
        if (errorsBefore !== errorsAfter) {
          console.log(`    New errors: ${consoleErrors.slice(errorsBefore).join('\n    ')}`)
        }

        // Check editor opened
        const identityTab = page.getByRole('tab', { name: 'Identity' })
        check('Editor opened with Identity tab', await identityTab.isVisible().catch(() => false))

        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══ TEST 3: Click through every tab on saved artist ═══')
        // ═══════════════════════════════════════════════════════════════

        const tabs = ['Identity', 'Sound', 'Persona', 'Lexicon', 'Look', 'Catalog']
        for (const tabName of tabs) {
          const tab = page.getByRole('tab', { name: tabName })
          if (await tab.isVisible().catch(() => false)) {
            const errBefore = consoleErrors.length
            await tab.click({ force: true })
            await page.waitForTimeout(800)
            await page.screenshot({ path: `test-dna-03-tab-${tabName.toLowerCase()}.png`, fullPage: true })
            const errAfter = consoleErrors.length
            check(`${tabName} tab renders without error`, errBefore === errAfter)
            if (errBefore !== errAfter) {
              console.log(`    Errors on ${tabName}: ${consoleErrors.slice(errBefore).join('\n    ')}`)
            }
          }
        }

        // Go back to artist list
        const backBtn = page.getByText('Back')
        if (await backBtn.isVisible().catch(() => false)) {
          await backBtn.click({ force: true })
          await page.waitForTimeout(1000)
        }
        break
      }
    }

    if (!artistCardFound) {
      console.log('  (No existing saved artists found — skipping load test)')
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ TEST 4: Seed dialog with cost indicator ═══')
    // ═══════════════════════════════════════════════════════════════════

    // Make sure we're on the list page
    await page.goto(`${BASE_URL}/music-lab/artist-dna`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const seedBtn = page.getByText('Start from Real Artist')
    if (await seedBtn.isVisible()) {
      await seedBtn.click({ force: true })
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-dna-04-seed-dialog.png' })

      check('Seed dialog title visible', await page.getByText('Start from a Real Artist').isVisible().catch(() => false))
      check('"25 pts" cost visible', await page.getByText('25 pts').isVisible().catch(() => false))
      check('Input field visible', await page.locator('input[placeholder*="Kendrick"]').isVisible().catch(() => false))
      check('"Build Profile" button visible', await page.getByRole('button', { name: /Build Profile/i }).isVisible().catch(() => false))

      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ TEST 5: Create new artist + fill fields ═══')
    // ═══════════════════════════════════════════════════════════════════

    const createBtn = page.getByText('Create New Artist')
    if (await createBtn.isVisible()) {
      const errBefore = consoleErrors.length
      await createBtn.click({ force: true })
      await page.waitForTimeout(1500)

      // Fill Identity tab
      const stageNameInput = page.locator('input[placeholder*="Stage name"]')
      if (await stageNameInput.isVisible()) {
        await stageNameInput.fill('Test Artist')
        check('Filled Stage Name', true)
      }

      const cityInput = page.locator('input[placeholder*="City"]')
      if (await cityInput.isVisible()) {
        await cityInput.fill('Atlanta')
        check('Filled City', true)
      }

      const stateInput = page.locator('input[placeholder*="State"]')
      if (await stateInput.isVisible()) {
        await stateInput.fill('Georgia')
        check('Filled State', true)
      }

      await page.screenshot({ path: 'test-dna-05-identity-filled.png', fullPage: true })

      // Switch to Sound tab
      const soundTab = page.getByRole('tab', { name: 'Sound' })
      await soundTab.click({ force: true })
      await page.waitForTimeout(800)

      // Check Sound tab fields render
      check('Sound tab loaded', await page.getByText('Vocal Textures').isVisible().catch(() => false))
      check('Melody Bias visible', await page.locator('text=Melody Bias').first().isVisible().catch(() => false))
      check('Key Collaborators visible', await page.getByText('Key Collaborators').isVisible().catch(() => false))
      check('Flow / Delivery Style visible', await page.getByText('Flow / Delivery Style').isVisible().catch(() => false))

      await page.screenshot({ path: 'test-dna-05-sound-tab.png', fullPage: true })

      // Switch to Persona tab
      const personaTab = page.getByRole('tab', { name: 'Persona' })
      await personaTab.click({ force: true })
      await page.waitForTimeout(800)
      await page.screenshot({ path: 'test-dna-05-persona-tab.png', fullPage: true })

      // Switch to Lexicon tab
      const lexiconTab = page.getByRole('tab', { name: 'Lexicon' })
      await lexiconTab.click({ force: true })
      await page.waitForTimeout(800)
      check('Lexicon tab - Ad-Libs visible', await page.getByText('Ad-Libs').isVisible().catch(() => false))
      await page.screenshot({ path: 'test-dna-05-lexicon-tab.png', fullPage: true })

      // Switch to Look tab
      const lookTab = page.getByRole('tab', { name: 'Look' })
      await lookTab.click({ force: true })
      await page.waitForTimeout(800)
      await page.screenshot({ path: 'test-dna-05-look-tab.png', fullPage: true })

      // Switch to Catalog tab
      const catalogTab = page.getByRole('tab', { name: 'Catalog' })
      await catalogTab.click({ force: true })
      await page.waitForTimeout(800)
      await page.screenshot({ path: 'test-dna-05-catalog-tab.png', fullPage: true })

      const errAfter = consoleErrors.length
      check('All tabs cycled without errors', errBefore === errAfter)
      if (errBefore !== errAfter) {
        console.log(`    New errors during tab cycle: ${consoleErrors.slice(errBefore).join('\n    ')}`)
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log('\n═══ RESULTS ═══')
    // ═══════════════════════════════════════════════════════════════════
    console.log(`  Passed: ${passed}`)
    console.log(`  Failed: ${failed}`)

    if (consoleErrors.length > 0) {
      console.log(`\n  ⚠ Console errors during session (${consoleErrors.length}):`)
      // Dedupe
      const unique = [...new Set(consoleErrors)]
      unique.forEach(e => console.log(`    - ${e.substring(0, 200)}`))
    } else {
      console.log('  No console errors detected')
    }

    console.log(failed === 0 ? '\n✅ ALL TESTS PASSED' : `\n❌ ${failed} TEST(S) FAILED`)

  } catch (error) {
    console.error('\nFATAL:', error.message)
    await page.screenshot({ path: 'test-dna-fatal.png' })
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
