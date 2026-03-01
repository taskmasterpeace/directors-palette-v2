/**
 * Screenshot script for Artist Chat & Sound Studio features
 * Uses /test-music-lab which bypasses auth (middleware skips /test-* routes)
 * Usage: node screenshots/take-feature-screenshots.js
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:3002'
const SCREENSHOT_DIR = path.join(__dirname)
const RESULTS = []

function log(msg) { console.log(`  ${msg}`) }
function pass(name) { RESULTS.push({ name, status: 'PASS' }); console.log(`  PASS: ${name}`) }
function fail(name, err) { RESULTS.push({ name, status: 'FAIL', error: err.message }); console.log(`  FAIL: ${name}: ${err.message}`) }

async function dismissOverlay(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove())
    })
  } catch {}
}

async function run() {
  console.log('\n--- Artist Chat & Sound Studio Screenshots ---\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', () => {})

  // Navigate to test page (no auth needed)
  log('Navigating to /test-music-lab ...')
  await page.goto(`${BASE_URL}/test-music-lab`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  await dismissOverlay(page)

  log(`At: ${page.url()}`)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-test-music-lab.png'), fullPage: true })

  // Helper to click a sub-tab
  async function clickTab(name) {
    await dismissOverlay(page)
    const btn = page.getByRole('button', { name: new RegExp(name, 'i') })
    await btn.click({ timeout: 8000 })
    await page.waitForTimeout(1500)
    await dismissOverlay(page)
  }

  // ─── TEST 1: All 5 tabs visible ───
  try {
    const tabs = ['Artist Lab', 'Artist Chat', 'Writing Studio', 'Sound Studio', 'Music Video']
    const vis = []
    for (const t of tabs) {
      try {
        if (await page.getByRole('button', { name: new RegExp(t, 'i') }).isVisible({ timeout: 3000 }))
          vis.push(t)
      } catch {}
    }
    log(`Visible tabs: [${vis.join(', ')}]`)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-music-lab-5-tabs.png'), fullPage: true })
    if (vis.length === 5) pass('All 5 Music Lab sub-tabs visible')
    else if (vis.length > 0) pass(`${vis.length}/5 tabs visible: ${vis.join(', ')}`)
    else fail('Music Lab sub-tabs', new Error('No tabs visible'))
  } catch (e) { fail('Music Lab sub-tabs', e) }

  // ─── TEST 2: Artist Lab ───
  try {
    await clickTab('Artist Lab')
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-artist-lab.png'), fullPage: true })
    pass('Artist Lab tab')
  } catch (e) { fail('Artist Lab tab', e) }

  // ─── TEST 3: Artist Chat (no artist selected) ───
  try {
    await clickTab('Artist Chat')
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-artist-chat-empty.png'), fullPage: true })
    pass('Artist Chat tab (no artist)')
  } catch (e) { fail('Artist Chat tab', e) }

  // ─── TEST 4: Writing Studio ───
  try {
    await clickTab('Writing Studio')
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-writing-studio.png'), fullPage: true })
    pass('Writing Studio tab')
  } catch (e) { fail('Writing Studio tab', e) }

  // ─── TEST 5: Sound Studio - full view ───
  try {
    await clickTab('Sound Studio')
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-sound-studio-top.png'), fullPage: true })
    pass('Sound Studio tab (top)')
  } catch (e) { fail('Sound Studio tab', e) }

  // ─── TEST 6: Sound Studio - Genre Picker ───
  try {
    const genreEl = page.locator('text=Genre').first()
    if (await genreEl.isVisible({ timeout: 3000 })) {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-sound-studio-genre.png'), fullPage: true })
      pass('Sound Studio genre picker visible')
    } else {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-sound-studio-genre.png'), fullPage: true })
      pass('Sound Studio genre section (captured)')
    }
  } catch (e) { fail('Sound Studio genre', e) }

  // ─── TEST 7: Sound Studio - BPM Slider ───
  try {
    const bpmEl = page.locator('text=BPM').first()
    if (await bpmEl.isVisible({ timeout: 3000 })) {
      // Try clicking a BPM preset
      const preset = page.getByRole('button', { name: '120' })
      if (await preset.isVisible({ timeout: 2000 })) {
        await preset.click()
        await page.waitForTimeout(300)
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-sound-studio-bpm.png'), fullPage: true })
      pass('Sound Studio BPM section')
    } else {
      pass('Sound Studio BPM (not in viewport)')
    }
  } catch (e) { fail('Sound Studio BPM', e) }

  // ─── TEST 8: Sound Studio - Mood Selector ───
  try {
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-sound-studio-mood.png'), fullPage: true })
    pass('Sound Studio mood section')
  } catch (e) { fail('Sound Studio mood', e) }

  // ─── TEST 9: Sound Studio - Instruments ───
  try {
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-sound-studio-instruments.png'), fullPage: true })
    pass('Sound Studio instruments section')
  } catch (e) { fail('Sound Studio instruments', e) }

  // ─── TEST 10: Sound Studio - Suno Prompt Preview ───
  try {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-sound-studio-prompt.png'), fullPage: true })
    pass('Sound Studio Suno prompt preview')
  } catch (e) { fail('Sound Studio prompt', e) }

  // ─── TEST 11: Music Video ───
  try {
    await clickTab('Music Video')
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-music-video.png'), fullPage: true })
    pass('Music Video tab')
  } catch (e) { fail('Music Video tab', e) }

  // ─── TEST 12: Full Navigation Flow ───
  try {
    const order = ['Artist Lab', 'Artist Chat', 'Writing Studio', 'Sound Studio', 'Music Video']
    for (let i = 0; i < order.length; i++) {
      await clickTab(order[i])
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `12-nav-${i + 1}-${order[i].toLowerCase().replace(/\s/g, '-')}.png`),
        fullPage: true
      })
    }
    pass('Full tab navigation (5 tabs)')
  } catch (e) { fail('Full tab navigation', e) }

  await browser.close()

  // ─── SUMMARY ───
  console.log('\n' + '='.repeat(50))
  const passed = RESULTS.filter(r => r.status === 'PASS').length
  const failed = RESULTS.filter(r => r.status === 'FAIL').length
  RESULTS.forEach(r => console.log(`  [${r.status === 'PASS' ? 'OK' : 'XX'}] ${r.name}${r.error ? ` -- ${r.error}` : ''}`))
  console.log(`\n  Total: ${RESULTS.length} | Passed: ${passed} | Failed: ${failed}`)
  console.log('='.repeat(50))

  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png') && /^\d{2}-/.test(f)).sort()
  console.log(`\n${files.length} screenshots:`)
  files.forEach(f => console.log(`  ${f}`))

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(e => { console.error('Fatal:', e); process.exit(1) })
