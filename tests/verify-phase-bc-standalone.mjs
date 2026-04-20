// Standalone Playwright verification — no global-setup, manages its own auth.
// Run: node tests/verify-phase-bc-standalone.mjs
import { chromium } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BASE = 'http://localhost:3007'
const email = process.env.TEST_USER_EMAIL
const password = process.env.TEST_USER_PASSWORD

console.log('Using creds:', email)

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[browser-error]', msg.text().slice(0, 200))
})

// 1. Sign in
console.log('Navigating to signin...')
await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded' })
console.log('Current URL after signin nav:', page.url())

await page.waitForSelector('#email', { timeout: 10_000 })
// Wait for React hydration before interacting — otherwise form submits natively (GET with creds in URL)
await page.waitForLoadState('networkidle').catch(() => {})
await page.waitForTimeout(1500)
await page.fill('#email', email)
await page.fill('#password', password)
console.log('Submitting login...')
const submitBtn = page.locator('button[type="submit"]')
await submitBtn.click({ force: true })
await page.waitForURL((url) => !url.toString().includes('/auth/signin'), { timeout: 30_000 }).catch((e) => {
  console.log('waitForURL failed:', e.message)
  console.log('Current URL:', page.url())
})
console.log('Post-login URL:', page.url())

// 2. Navigate to main app and click Shot Animator sidebar tab
console.log('Navigating to main app...')
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.waitForLoadState('networkidle').catch(() => {})
await page.waitForTimeout(1500)

// Expand sidebar if collapsed, then click Shot Animator
const sidebarBtn = page.locator('button:has-text("Shot Animator")')
if (!(await sidebarBtn.first().isVisible().catch(() => false))) {
  const expand = page.locator('button:has(svg.lucide-menu)').first()
  if (await expand.isVisible().catch(() => false)) {
    await expand.click()
    await page.waitForTimeout(500)
  }
}
await sidebarBtn.first().click({ force: true })
await page.waitForTimeout(1500)
console.log('Shot animator tab URL:', page.url())

// 3. Verify empty state elements
const checks = [
  { name: 'Title', sel: 'text=Start a new animation batch' },
  { name: 'Upload images button', sel: 'button:has-text("Upload images")' },
  { name: 'Browse gallery button', sel: 'button:has-text("Browse gallery")' },
  { name: 'Ctrl+V hint', sel: 'text=to paste' },
  { name: 'Drag & drop hint', sel: 'text=Drag & drop files anywhere' },
  { name: 'Multi-shot hint', sel: 'text=Multi-shot prompts supported' },
]

console.log('\n--- Empty State Checks ---')
let pass = 0
for (const { name, sel } of checks) {
  try {
    const visible = await page.locator(sel).first().isVisible({ timeout: 5_000 })
    console.log(`  ${visible ? '✅' : '❌'} ${name}`)
    if (visible) pass++
  } catch (e) {
    console.log(`  ❌ ${name} — ${e.message.slice(0, 100)}`)
  }
}

await page.screenshot({ path: 'test-results/phase-bc-empty-state.png', fullPage: true })
console.log('Screenshot: test-results/phase-bc-empty-state.png')

// 4. Seed a shot via localStorage and verify shot-card state
console.log('\n--- Seed Shot + Controls Check ---')
await page.evaluate(() => {
  const payload = {
    state: {
      shotConfigs: [{
        id: 'phase-bc-verify-1',
        imageUrl: 'https://picsum.photos/seed/phase-bc/512/288',
        imageName: 'Test Shot',
        prompt: 'Camera dollies forward',
        duration: 4,
        aspectRatio: '16:9',
        generatedVideos: [],
      }],
    },
    version: 1,
  }
  localStorage.setItem('shot-animator-store', JSON.stringify(payload))
})
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForLoadState('networkidle').catch(() => {})
await page.waitForTimeout(1500)
// Tab reset to default after reload — click Shot Animator again
const sidebarBtn2 = page.locator('button:has-text("Shot Animator")')
if (!(await sidebarBtn2.first().isVisible().catch(() => false))) {
  const expand2 = page.locator('button:has(svg.lucide-menu)').first()
  if (await expand2.isVisible().catch(() => false)) {
    await expand2.click()
    await page.waitForTimeout(500)
  }
}
await sidebarBtn2.first().click({ force: true })
await page.waitForTimeout(1500)

// Debug: log the store state
const storeState = await page.evaluate(() => localStorage.getItem('shot-animator-store'))
console.log('Store state:', storeState?.slice(0, 300))
const cardCount = await page.locator('[data-shot-id]').count()
console.log('Cards with data-shot-id:', cardCount)

const controlChecks = [
  { name: 'Shot card has data-shot-id', sel: '[data-shot-id="phase-bc-verify-1"]' },
  { name: 'Prompt Tips button visible', sel: 'button:has-text("Prompt Tips")' },
  { name: 'Clear All button visible', sel: 'button:has-text("Clear All")' },
]
for (const { name, sel } of controlChecks) {
  try {
    const visible = await page.locator(sel).first().isVisible({ timeout: 5_000 })
    console.log(`  ${visible ? '✅' : '❌'} ${name}`)
    if (visible) pass++
  } catch (e) {
    console.log(`  ❌ ${name} — ${e.message.slice(0, 100)}`)
  }
}

await page.screenshot({ path: 'test-results/phase-bc-with-shot.png', fullPage: true })
console.log('Screenshot: test-results/phase-bc-with-shot.png')

const total = checks.length + controlChecks.length
console.log(`\nResult: ${pass}/${total} checks passed`)

await browser.close()
process.exit(pass === total ? 0 : 1)
