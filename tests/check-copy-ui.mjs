import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const envFile = readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => { const [k, ...v] = line.split('='); if (k && v.length) env[k.trim()] = v.join('=').trim() })

// Auth needed for API calls inside the component
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: env.TEST_USER_EMAIL, password: env.TEST_USER_PASSWORD,
})
if (authError) { console.error('Auth failed:', authError.message); process.exit(1) }
console.log('1. Auth OK:', authData.user.email)

const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const cookieName = `sb-${projectRef}-auth-token`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await context.newPage()

// Collect console errors
const consoleErrors = []
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})

// Use the test-brand-studio page (middleware skips /test- routes, no auth redirect)
console.log('\n2. Opening /test-brand-studio...')
await page.goto('http://localhost:3002/test-brand-studio', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {})
await page.waitForTimeout(1000)

// Set auth in browser for Supabase client-side calls
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

// Reload so the component picks up the auth
await page.reload({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
await page.waitForTimeout(3000)

console.log('   URL:', page.url())
await page.screenshot({ path: 'tests/screenshots/copy-ui-01-brandstudio.png', fullPage: true })
console.log('   Screenshot: copy-ui-01-brandstudio.png')

// Check for Brand Studio inner sidebar
const hasBrandTab = await page.locator('text=Brand').count()
const hasCreateTab = await page.locator('nav button >> text=Create').count() || await page.locator('aside button >> text=Create').count()
console.log('   Brand tab visible:', hasBrandTab > 0)
console.log('   Create tab visible:', hasCreateTab > 0)

if (consoleErrors.length > 0) {
  console.log('\n   Console errors:')
  consoleErrors.slice(0, 5).forEach(e => console.log('   ', e.slice(0, 120)))
}

// Step 3: Select a brand if needed
console.log('\n3. Brand selection...')
const brandDropdown = await page.locator('aside button[role="combobox"]').first()
if (await brandDropdown.count()) {
  const brandText = await brandDropdown.textContent()
  console.log('   Current brand:', brandText?.trim() || '(empty)')

  if (!brandText?.trim() || brandText.includes('Select')) {
    await brandDropdown.click()
    await page.waitForTimeout(500)
    const firstBrand = await page.locator('[role="option"]').first()
    if (await firstBrand.count()) {
      const name = await firstBrand.textContent()
      await firstBrand.click()
      await page.waitForTimeout(2000)
      console.log('   Selected:', name?.trim())
    }
  }
} else {
  console.log('   No brand dropdown found')
}

// Step 4: Click Create tab
console.log('\n4. Clicking Create tab...')
// In Brand Studio aside, the Create button is in a <nav> element
let createClicked = false
const asideButtons = await page.locator('aside nav button, aside button').all()
for (const btn of asideButtons) {
  const text = await btn.textContent()
  if (text?.trim() === 'Create' || text?.includes('Create')) {
    await btn.click()
    await page.waitForTimeout(1500)
    console.log('   Clicked Create')
    createClicked = true
    break
  }
}

if (!createClicked) {
  // Try any button with Create text
  const createAny = await page.locator('button:has-text("Create")').first()
  if (await createAny.count()) {
    await createAny.click()
    await page.waitForTimeout(1500)
    console.log('   Clicked Create (fallback)')
    createClicked = true
  } else {
    console.log('   Could not find Create tab')
    const allBtns = await page.locator('button').allTextContents()
    console.log('   All buttons:', allBtns.map(t => t.trim().slice(0, 40)).filter(Boolean).slice(0, 20))
  }
}
await page.screenshot({ path: 'tests/screenshots/copy-ui-02-create-tab.png', fullPage: true })

// Step 5: Click Copy card
console.log('\n5. Clicking Copy card...')
// Copy card is in the generator grid inside main content
const mainCopyCard = await page.locator('main button:has-text("Copy")').first()
if (await mainCopyCard.count()) {
  await mainCopyCard.click()
  await page.waitForTimeout(1000)
  console.log('   Clicked Copy')
} else {
  // Try any Copy button
  const anyCopy = await page.locator('button:has-text("Copy")').first()
  if (await anyCopy.count()) {
    await anyCopy.click()
    await page.waitForTimeout(1000)
    console.log('   Clicked Copy (fallback)')
  } else {
    console.log('   No Copy card found')
    const mainBtns = await page.locator('main button').allTextContents()
    console.log('   Main buttons:', mainBtns.map(t => t.trim().slice(0, 40)).filter(Boolean))
  }
}
await page.screenshot({ path: 'tests/screenshots/copy-ui-03-copy-generator.png', fullPage: true })

// Step 6: Approach picker
console.log('\n6. Approach picker...')
const approachBtn = await page.locator('button:has-text("Choose an approach")').first()
if (await approachBtn.count()) {
  await approachBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'tests/screenshots/copy-ui-04-approach-picker.png', fullPage: true })
  console.log('   Opened')

  const blunt = await page.locator('button:has-text("Blunt No-Filter")').first()
  if (await blunt.count()) {
    await blunt.click()
    await page.waitForTimeout(500)
    console.log('   Selected Blunt No-Filter')
  }
} else {
  console.log('   Not found')
}

// Step 7: Fill brief
console.log('\n7. Brief...')
const textarea = await page.locator('textarea').first()
if (await textarea.count() && await textarea.isVisible()) {
  await textarea.fill('Premium cold brew coffee for remote workers who want energy without the crash. Brand: FrostBrew.')
  await page.waitForTimeout(300)
  console.log('   Filled')
} else {
  console.log('   Textarea not visible')
}
await page.screenshot({ path: 'tests/screenshots/copy-ui-05-ready.png', fullPage: true })

// Step 8: UI Element Audit
console.log('\n8. UI ELEMENT AUDIT:')
const checks = [
  ['Approach selector', 'button:has-text("Blunt No-Filter")'],
  ['Brief textarea', 'textarea'],
  ['Full Campaign', 'button:has-text("Full Campaign")'],
  ['Headlines Only', 'button:has-text("Headlines Only")'],
  ['Social Post', 'button:has-text("Social Post")'],
  ['Video Script', 'button:has-text("Video Script")'],
  ['Brand Boost toggle', '[role="switch"]'],
  ['Generate Copy button', 'button:has-text("Generate Copy")'],
  ['Empty state message', 'text=Your ad copy will appear here'],
  ['Cost indicator (5 pts)', 'text=5 pts'],
]

let passed = 0, failed = 0
for (const [name, selector] of checks) {
  const count = await page.locator(selector).count()
  const ok = count > 0
  console.log(`   ${ok ? '✅' : '❌'} ${name}`)
  ok ? passed++ : failed++
}
console.log(`\n   RESULT: ${passed}/${passed + failed} elements found`)

if (consoleErrors.length > 0) {
  console.log('\n   Console errors during test:')
  consoleErrors.forEach(e => console.log('   ', e.slice(0, 150)))
}

await browser.close()
console.log('\nUI check complete!')
