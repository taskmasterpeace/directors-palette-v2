import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BASE_URL = 'http://localhost:3002'
const OUT_DIR = path.join(__dirname, '..', 'test-results', 'ui-audit')

const TABS = [
  { id: 'shot-creator', label: 'Shot Creator' },
  { id: 'layout-annotation', label: 'Canvas Editor' },
  { id: 'shot-animator', label: 'Shot Animator' },
  { id: 'node-workflow', label: 'Node Workflow' },
  { id: 'figurine-studio', label: 'Figurine Studio' },
  { id: 'merch-lab', label: 'Merch Lab' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'storybook', label: 'Storybook' },
  { id: 'music-lab', label: 'Music Lab' },
  { id: 'brand-studio', label: 'Brand Studio' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'community', label: 'Community' },
  { id: 'prompt-tools', label: 'Prompt Tools' },
]

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // 1. Login
  console.log('Logging in...')
  await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded' })

  // Debug: screenshot login page
  await page.waitForTimeout(5000)
  await page.screenshot({ path: path.join(OUT_DIR, '_login-page.png') })
  console.log('  Saved login page screenshot')

  // Try to find the email input
  const emailInput = page.locator('#email')
  try {
    await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  } catch {
    console.log('Email input not found, saving debug screenshot')
    await page.screenshot({ path: path.join(OUT_DIR, '_login-debug.png') })
    const html = await page.content()
    fs.writeFileSync(path.join(OUT_DIR, '_login-debug.html'), html)
    await browser.close()
    return
  }

  await page.fill('#email', process.env.TEST_USER_EMAIL)
  await page.fill('#password', process.env.TEST_USER_PASSWORD)
  await page.click('button[type="submit"]', { force: true })

  // Wait for redirect to main app
  try {
    await page.waitForURL((url) => !url.pathname.includes('/auth/'), { timeout: 30000 })
  } catch {
    console.log('Login redirect failed')
    await page.screenshot({ path: path.join(OUT_DIR, '_login-failed.png') })
    await browser.close()
    return
  }

  console.log('Logged in!')
  await page.waitForTimeout(4000)
  await page.screenshot({ path: path.join(OUT_DIR, '_home.png') })
  console.log('  Saved home screenshot')

  // 2. Screenshot each tab by clicking sidebar buttons
  for (const tab of TABS) {
    console.log(`Switching to: ${tab.label}`)

    // Click the sidebar nav button with matching text
    try {
      // Find the button/link containing this label text in the sidebar
      const btn = page.locator(`text="${tab.label}"`).first()
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click()
        await page.waitForTimeout(2000)
      } else {
        console.log(`  ⚠ "${tab.label}" not visible in sidebar, skipping`)
        continue
      }
    } catch (e) {
      console.log(`  ⚠ Could not click "${tab.label}": ${e.message}`)
      continue
    }

    await page.screenshot({
      path: path.join(OUT_DIR, `${tab.id}.png`),
      fullPage: false,
    })
    console.log(`  ✓ Saved: ${tab.id}.png`)
  }

  await browser.close()
  console.log(`\nDone! Screenshots saved to: ${OUT_DIR}`)
}

main().catch(console.error)
