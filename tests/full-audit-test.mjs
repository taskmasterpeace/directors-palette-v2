/**
 * Comprehensive browser test for Directors Palette v2
 * Tests all major modules after audit fixes
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => { const [k, ...v] = line.split('='); if (k && v.length) env[k.trim()] = v.join('=').trim() })

const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const cookieName = `sb-${projectRef}-auth-token`

// ============================================
// SECTION 1: API AUTH VERIFICATION
// ============================================
console.log('═══════════════════════════════════════════')
console.log('SECTION 1: API AUTH VERIFICATION')
console.log('═══════════════════════════════════════════\n')

// Test that previously-unauthenticated routes now return 401
const authTestRoutes = [
  { name: 'Storyboard extract', url: '/api/storyboard/extract', body: { text: 'test' } },
  { name: 'Storyboard generate-prompts', url: '/api/storyboard/generate-prompts', body: { segments: [] } },
  { name: 'Storyboard broll', url: '/api/storyboard/broll', body: { imageUrl: 'test' } },
  { name: 'Storyboard chapter-names', url: '/api/storyboard/chapter-names', body: { segments: [] } },
  { name: 'Storyboard classify-segments', url: '/api/storyboard/classify-segments', body: { text: 'test' } },
  { name: 'Storyboard coherence-pass', url: '/api/storyboard/coherence-pass', body: { segments: [] } },
  { name: 'Storyboard expand-shot', url: '/api/storyboard/expand-shot', body: {} },
  { name: 'Storyboard refine-prompts', url: '/api/storyboard/refine-prompts', body: { prompts: [] } },
  { name: 'Storyboard broll-pool', url: '/api/storyboard/broll-pool', body: { segments: [] } },
  { name: 'Merch Lab price', url: '/api/merch-lab/price', body: { blueprintId: 1 } },
  { name: 'Merch Lab products', url: '/api/merch-lab/products', body: {} },
  { name: 'Before-after grid', url: '/api/tools/before-after-grid', body: { imageUrl: 'test' } },
]

let authPassed = 0
let authFailed = 0

for (const route of authTestRoutes) {
  try {
    const res = await fetch(`http://localhost:3002${route.url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(route.body),
    })
    // Should get 401 (unauthorized) since we're not sending auth
    if (res.status === 401) {
      console.log(`  ✅ ${route.name} → 401 (properly secured)`)
      authPassed++
    } else {
      console.log(`  ❌ ${route.name} → ${res.status} (SHOULD BE 401!)`)
      authFailed++
    }
  } catch (e) {
    console.log(`  ⚠️  ${route.name} → Error: ${e.message}`)
    authFailed++
  }
}

console.log(`\n  AUTH RESULT: ${authPassed}/${authPassed + authFailed} routes secured\n`)

// Test deleted routes return 404
console.log('  Deleted routes (should 404):')
try {
  const res = await fetch('http://localhost:3002/api/story-creator/llm-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test' }),
  })
  console.log(`  ${res.status === 404 ? '✅' : '❌'} story-creator/llm-chat → ${res.status}`)
} catch (e) {
  console.log(`  ⚠️  story-creator/llm-chat → ${e.message}`)
}

// ============================================
// SECTION 2: V2 API ENDPOINTS
// ============================================
console.log('\n═══════════════════════════════════════════')
console.log('SECTION 2: V2 API ENDPOINTS')
console.log('═══════════════════════════════════════════\n')

const v2Routes = [
  { name: 'Balance', method: 'GET', url: '/api/v2/balance' },
  { name: 'Models', method: 'GET', url: '/api/v2/models' },
  { name: 'LoRAs', method: 'GET', url: '/api/v2/loras' },
  { name: 'Recipes', method: 'GET', url: '/api/v2/recipes' },
  { name: 'Wildcards', method: 'GET', url: '/api/v2/wildcards' },
  { name: 'Jobs', method: 'GET', url: '/api/v2/jobs' },
  { name: 'Gallery', method: 'GET', url: '/api/v2/gallery' },
  { name: 'Images generate', method: 'POST', url: '/api/v2/images/generate' },
  { name: 'Images angles', method: 'POST', url: '/api/v2/images/angles' },
  { name: 'Images broll', method: 'POST', url: '/api/v2/images/broll' },
  { name: 'Videos generate', method: 'POST', url: '/api/v2/videos/generate' },
  { name: 'Characters generate', method: 'POST', url: '/api/v2/characters/generate' },
  { name: 'Batch', method: 'POST', url: '/api/v2/batch' },
]

for (const route of v2Routes) {
  try {
    const res = await fetch(`http://localhost:3002${route.url}`, {
      method: route.method,
      headers: { 'Content-Type': 'application/json' },
      ...(route.method === 'POST' ? { body: JSON.stringify({}) } : {}),
    })
    // Without API key, should get 401
    const ok = res.status === 401
    console.log(`  ${ok ? '✅' : '❌'} ${route.name} → ${res.status} ${ok ? '(auth required)' : '(UNEXPECTED!)'}`)
  } catch (e) {
    console.log(`  ⚠️  ${route.name} → ${e.message}`)
  }
}

// ============================================
// SECTION 3: UI MODULE WALKTHROUGH
// ============================================
console.log('\n═══════════════════════════════════════════')
console.log('SECTION 3: UI MODULE WALKTHROUGH')
console.log('═══════════════════════════════════════════\n')

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await context.newPage()

// Console error tracking
const consoleErrors = []
page.on('console', msg => {
  if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('favicon')) {
    consoleErrors.push(msg.text().slice(0, 120))
  }
})

// Auth via browser
await page.goto('http://localhost:3002/landing', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
await page.waitForTimeout(1000)

await page.evaluate(async ({ supabaseUrl, anonKey, email, password, theCookieName }) => {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description || data.error)
  const sessionData = JSON.stringify({
    access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: data.expires_at, expires_in: data.expires_in, token_type: 'bearer', user: data.user,
  })
  const encoded = btoa(sessionData)
  const value = `base64-${encoded}`
  const CHUNK_SIZE = 3500
  if (value.length <= CHUNK_SIZE) {
    document.cookie = `${theCookieName}=${encodeURIComponent(value)}; path=/; max-age=3600`
  } else {
    document.cookie = `${theCookieName}=; path=/; max-age=0`
    for (let i = 0; i * CHUNK_SIZE < value.length; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      document.cookie = `${theCookieName}.${i}=${encodeURIComponent(chunk)}; path=/; max-age=3600`
    }
  }
  localStorage.setItem(`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`, sessionData)
}, {
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL, anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  email: env.TEST_USER_EMAIL, password: env.TEST_USER_PASSWORD, theCookieName: cookieName,
})

// Test each major page
const pages = [
  { name: 'Main App (Shot Creator)', url: '/', check: 'CREATION TOOLS' },
  { name: 'Test Brand Studio', url: '/test-brand-studio', check: 'Brand' },
  { name: 'Test Storyboard', url: '/test-storyboard', check: null },
  { name: 'Test Music Lab', url: '/test-music-lab', check: null },
  { name: 'Test Figurine Studio', url: '/test-figurine-studio', check: null },
  { name: 'Test Merch Lab', url: '/test-merch-lab', check: null },
  { name: 'Node Workflow', url: '/node-workflow', check: null },
]

for (const pg of pages) {
  try {
    await page.goto(`http://localhost:3002${pg.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    const isLoaded = !currentUrl.includes('landing')

    // Take screenshot
    const filename = pg.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    await page.screenshot({ path: `tests/screenshots/audit-${filename}.png` })

    if (pg.check) {
      const hasContent = await page.locator(`text=${pg.check}`).count() > 0
      console.log(`  ${isLoaded && hasContent ? '✅' : '❌'} ${pg.name} — ${isLoaded ? 'loaded' : 'redirected'}, content: ${hasContent ? 'yes' : 'no'}`)
    } else {
      console.log(`  ${isLoaded ? '✅' : '❌'} ${pg.name} — ${isLoaded ? 'loaded' : 'redirected'}`)
    }
  } catch (e) {
    console.log(`  ❌ ${pg.name} — Error: ${e.message.slice(0, 80)}`)
  }
}

// ============================================
// SECTION 4: BRAND STUDIO DEEP TEST
// ============================================
console.log('\n═══════════════════════════════════════════')
console.log('SECTION 4: BRAND STUDIO DEEP TEST')
console.log('═══════════════════════════════════════════\n')

await page.goto('http://localhost:3002/test-brand-studio', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
await page.waitForTimeout(3000)

// Check Brand Studio loaded
const hasBrandTab = await page.locator('text=Brand').count() > 0
console.log(`  ${hasBrandTab ? '✅' : '❌'} Brand Studio loaded`)

// Select brand if needed
const brandDropdown = await page.locator('aside button[role="combobox"]').first()
if (await brandDropdown.count()) {
  const brandText = await brandDropdown.textContent()
  console.log(`  ✅ Brand selected: ${brandText?.trim() || '(default)'}`)
}

// Navigate to Create tab
const asideButtons = await page.locator('aside nav button, aside button').all()
for (const btn of asideButtons) {
  const text = await btn.textContent()
  if (text?.includes('Create')) {
    await btn.click()
    await page.waitForTimeout(1500)
    break
  }
}

// Check all generator cards present
const generatorCards = ['Image', 'Video', 'Voice', 'Music', 'Copy', 'Assemble']
for (const card of generatorCards) {
  const found = await page.locator(`main button:has-text("${card}")`).count() > 0
  console.log(`  ${found ? '✅' : '❌'} Generator card: ${card}`)
}

// Test Copy Generator specifically
const copyCard = await page.locator('main button:has-text("Copy")').first()
if (await copyCard.count()) {
  await copyCard.click()
  await page.waitForTimeout(1000)

  // Check NO purple/violet in the rendered UI
  const pageHtml = await page.content()
  const hasPurple = pageHtml.includes('violet-') || pageHtml.includes('purple-')
  console.log(`  ${!hasPurple ? '✅' : '❌'} No purple/violet in Copy Generator HTML`)

  // Check all Copy Generator elements
  const copyChecks = [
    ['Approach selector', 'button:has-text("Choose an approach")'],
    ['Brief textarea', 'textarea'],
    ['Full Campaign', 'button:has-text("Full Campaign")'],
    ['Headlines Only', 'button:has-text("Headlines Only")'],
    ['Social Post', 'button:has-text("Social Post")'],
    ['Video Script', 'button:has-text("Video Script")'],
    ['Brand Boost toggle', '[role="switch"]'],
    ['Generate Copy button', 'button:has-text("Generate Copy")'],
    ['Cost (5 pts)', 'text=5 pts'],
  ]

  for (const [name, selector] of copyChecks) {
    const found = await page.locator(selector).count() > 0
    console.log(`  ${found ? '✅' : '❌'} ${name}`)
  }

  await page.screenshot({ path: 'tests/screenshots/audit-copy-generator.png', fullPage: true })
}

// ============================================
// SECTION 5: MAIN APP SIDEBAR MODULES
// ============================================
console.log('\n═══════════════════════════════════════════')
console.log('SECTION 5: MAIN APP SIDEBAR')
console.log('═══════════════════════════════════════════\n')

await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
await page.waitForTimeout(3000)

// Check sidebar sections exist
const sidebarSections = ['CREATION TOOLS', 'PROJECTS', 'LIBRARY', 'UTILITIES']
for (const section of sidebarSections) {
  const found = await page.locator(`text=${section}`).count() > 0
  console.log(`  ${found ? '✅' : '❌'} Section: ${section}`)
}

// Check sidebar items
const expectedItems = [
  'Shot Creator', 'Canvas Editor', 'Shot Animator', 'Node Workflow',
  'Figurine Studio', 'Merch Lab', 'Storyboard', 'Storybook',
  'Music Lab', 'Brand Studio', 'Gallery', 'Community',
  'Prompt Tools', 'Help & Manual'
]

for (const item of expectedItems) {
  const found = await page.locator(`text=${item}`).count() > 0
  console.log(`  ${found ? '✅' : '❌'} ${item}`)
}

// Check pts display
const ptsDisplay = await page.locator('text=pts').count() > 0
console.log(`  ${ptsDisplay ? '✅' : '❌'} Points display`)

await page.screenshot({ path: 'tests/screenshots/audit-main-app.png', fullPage: true })

// ============================================
// SUMMARY
// ============================================
console.log('\n═══════════════════════════════════════════')
console.log('CONSOLE ERRORS DURING TEST')
console.log('═══════════════════════════════════════════\n')

if (consoleErrors.length === 0) {
  console.log('  ✅ No console errors')
} else {
  // Deduplicate
  const unique = [...new Set(consoleErrors)]
  unique.slice(0, 10).forEach(e => console.log(`  ⚠️  ${e}`))
  if (unique.length > 10) console.log(`  ... and ${unique.length - 10} more`)
}

await browser.close()
console.log('\n═══════════════════════════════════════════')
console.log('AUDIT TEST COMPLETE')
console.log('═══════════════════════════════════════════\n')
