/**
 * Test gallery improvements: header, sort, favorites, prompts toggle, date grouping
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => { const [k, ...v] = line.split('='); if (k && v.length) env[k.trim()] = v.join('=').trim() })

const projectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const cookieName = `sb-${projectRef}-auth-token`

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
const page = await context.newPage()

// Collect console errors
const errors = []
page.on('console', msg => {
  if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('favicon')) {
    errors.push(msg.text().slice(0, 150))
  }
})

// Auth
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

console.log('Auth complete. Navigating to main app...')

// Navigate and wait for app to load
await page.goto('http://localhost:3002/', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(3000)

// Click Gallery in the sidebar to open the gallery view
const galleryLink = page.locator('text=Gallery').first()
if (await galleryLink.count()) {
  await galleryLink.click()
  await page.waitForTimeout(4000)
}

console.log('\n═══════════════════════════════════════════')
console.log('GALLERY IMPROVEMENTS TEST')
console.log('═══════════════════════════════════════════\n')

// 1. Check header says "Gallery" not "Unified Gallery"
const hasGalleryTitle = await page.locator('text=Gallery').count() > 0
const hasUnifiedGallery = await page.locator('text=Unified Gallery').count() > 0
console.log(`  ${hasGalleryTitle && !hasUnifiedGallery ? '✅' : '❌'} Gallery title (not "Unified Gallery")`)

// 2. Check sort dropdown exists
const sortButton = await page.locator('button:has-text("Newest first")').count()
const sortButton2 = await page.locator('button:has(svg.lucide-arrow-up-down)').count()
console.log(`  ${sortButton > 0 || sortButton2 > 0 ? '✅' : '❌'} Sort dropdown exists`)

// 3. Check prompt toggle (eye icon) exists
const eyeButton = await page.locator('svg.lucide-eye, svg.lucide-eye-off').count()
console.log(`  ${eyeButton > 0 ? '✅' : '❌'} Prompt toggle (eye icon) exists`)

// 4. Check grid size controls exist
const gridControls = await page.locator('button:has(svg.lucide-grid3x3), button:has(svg.lucide-grid2x2)').count()
console.log(`  ${gridControls > 0 ? '✅' : '❌'} Grid size controls exist`)

// 5. Check combined stats badge (images | pts format)
const combinedBadge = await page.locator('text=/\\d+\\/500 images/').count()
console.log(`  ${combinedBadge > 0 ? '✅' : '❌'} Combined images/pts badge`)

// 6. Check source filter pills exist
const sourceFilters = await page.locator('button:has-text("All"), button:has-text("Shot Creator")').count()
console.log(`  ${sourceFilters > 0 ? '✅' : '❌'} Source filter pills`)

// 7. Check search input exists
const searchInput = await page.locator('input[placeholder*="Search"]').count()
console.log(`  ${searchInput > 0 ? '✅' : '❌'} Search input`)

// 8. Check folder sidebar has Favorites (may be collapsed, check for star icon in sidebar)
const favoritesFolder = await page.locator('text=Favorites').count()
const favoritesIcon = await page.locator('button:has(svg.lucide-star)').first().count()
console.log(`  ${favoritesFolder > 0 || favoritesIcon > 0 ? '✅' : '❌'} Favorites in sidebar (text=${favoritesFolder > 0}, icon=${favoritesIcon > 0})`)

// 9. Check no purple/violet in gallery components
const pageHtml = await page.content()
const gallerySection = pageHtml.includes('violet-') && pageHtml.includes('gallery')
console.log(`  ${!gallerySection ? '✅' : '❌'} No violet in gallery HTML`)

// 10. Check no "Shot Editor" text
const hasDeadRef = await page.locator('text=Shot Editor').count()
console.log(`  ${hasDeadRef === 0 ? '✅' : '❌'} No "Shot Editor" reference`)

// Screenshot
await page.screenshot({ path: 'tests/screenshots/gallery-improved-01.png', fullPage: false })
console.log('\n  Screenshot: tests/screenshots/gallery-improved-01.png')

// Try clicking sort dropdown
if (sortButton > 0 || sortButton2 > 0) {
  const trigger = page.locator('button:has-text("Newest first")').first()
  if (await trigger.count()) {
    await trigger.click()
    await page.waitForTimeout(500)
    const hasNewest = await page.locator('[role="menuitem"]:has-text("Newest")').count()
    const hasOldest = await page.locator('[role="menuitem"]:has-text("Oldest")').count()
    const hasByModel = await page.locator('[role="menuitem"]:has-text("model")').count()
    console.log(`\n  Sort options: Newest=${hasNewest > 0}, Oldest=${hasOldest > 0}, ByModel=${hasByModel > 0}`)
    await page.keyboard.press('Escape')
  }
}

// Check for star/favorite icons on image cards
const starIcons = await page.locator('button:has(svg.lucide-star)').count()
console.log(`  Star icons (favorites): ${starIcons}`)

// Check gallery images loaded
const galleryImages = await page.locator('img[src*="supabase"]').count()
console.log(`  Gallery images loaded: ${galleryImages}`)

// Check date grouping headers
const dateHeaders = await page.locator('h3:has-text("Today"), h3:has-text("Yesterday"), h3:has-text("This Week")').count()
console.log(`  Date group headers: ${dateHeaders}`)

// Screenshot with expanded sidebar
await page.screenshot({ path: 'tests/screenshots/gallery-improved-02.png', fullPage: true })

// Console errors
console.log('\n═══════════════════════════════════════════')
console.log('CONSOLE ERRORS')
console.log('═══════════════════════════════════════════\n')
if (errors.length === 0) {
  console.log('  ✅ No console errors')
} else {
  const unique = [...new Set(errors)]
  unique.slice(0, 5).forEach(e => console.log(`  ⚠️  ${e}`))
}

await browser.close()
console.log('\n═══════════════════════════════════════════')
console.log('GALLERY TEST COMPLETE')
console.log('═══════════════════════════════════════════\n')
