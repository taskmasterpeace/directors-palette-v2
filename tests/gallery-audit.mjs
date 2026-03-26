/**
 * Gallery UI audit - screenshots of all gallery states
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

console.log('Auth complete. Loading main app...')

// Navigate to main app (gallery is on the main page)
await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 15000 })
await page.waitForTimeout(4000)

// Screenshot 1: Main app with gallery area visible
await page.screenshot({ path: 'tests/screenshots/gallery-01-main.png', fullPage: false })
console.log('Screenshot 1: Main app')

// Click Gallery in sidebar
const galleryLink = await page.locator('text=Gallery').first()
if (await galleryLink.count()) {
  await galleryLink.click()
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'tests/screenshots/gallery-02-gallery-tab.png', fullPage: false })
  console.log('Screenshot 2: Gallery tab clicked')
}

// Go back to shot creator to see inline gallery
await page.locator('text=Shot Creator').first().click().catch(() => {})
await page.waitForTimeout(3000)
await page.screenshot({ path: 'tests/screenshots/gallery-03-shot-creator.png', fullPage: false })
console.log('Screenshot 3: Shot Creator with gallery')

// Check what's in the gallery area
const galleryInfo = await page.evaluate(() => {
  const images = document.querySelectorAll('img[src*="supabase"], img[src*="replicate"], img[src*="r2.dev"]')
  const gridButtons = document.querySelectorAll('[class*="grid"]')
  const folders = document.querySelectorAll('[class*="folder"], [class*="Folder"]')
  return {
    imageCount: images.length,
    gridButtons: gridButtons.length,
    folderElements: folders.length,
    bodyWidth: document.body.offsetWidth,
    bodyHeight: document.body.offsetHeight,
  }
})
console.log('Gallery info:', JSON.stringify(galleryInfo))

// Try to find and click on grid size toggles
const gridToggles = await page.locator('button[title*="grid"], button[aria-label*="grid"]').all()
console.log(`Grid toggles found: ${gridToggles.length}`)

// Look for filter/search elements
const searchInput = await page.locator('input[placeholder*="Search"], input[placeholder*="search"]').count()
console.log(`Search inputs: ${searchInput}`)

const filterButtons = await page.locator('button:has-text("All"), button:has-text("Filter"), button:has-text("Source")').all()
console.log(`Filter-like buttons: ${filterButtons.length}`)

// Try clicking on an image to open fullscreen
const galleryImages = await page.locator('img[src*="supabase"]').all()
console.log(`Gallery images found: ${galleryImages.length}`)

if (galleryImages.length > 0) {
  await galleryImages[0].click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'tests/screenshots/gallery-04-fullscreen.png', fullPage: false })
  console.log('Screenshot 4: Fullscreen modal')

  // Check fullscreen modal elements
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"]')
    const buttons = modal ? modal.querySelectorAll('button') : []
    const buttonTexts = Array.from(buttons).map(b => b.textContent?.trim()).filter(Boolean)
    return { hasModal: !!modal, buttonCount: buttons.length, buttons: buttonTexts.slice(0, 20) }
  })
  console.log('Fullscreen modal info:', JSON.stringify(modalInfo))

  // Close modal
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

// Look for folder sidebar
const folderSidebar = await page.locator('text=Folders').count()
console.log(`Folder sidebar elements: ${folderSidebar}`)

// Check for bulk select
const selectAll = await page.locator('button:has-text("Select"), input[type="checkbox"]').all()
console.log(`Select elements: ${selectAll.length}`)

// Try mobile viewport
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(2000)
await page.screenshot({ path: 'tests/screenshots/gallery-05-mobile.png', fullPage: false })
console.log('Screenshot 5: Mobile view')

// Check mobile-specific elements
const mobileInfo = await page.evaluate(() => {
  const bottomSheet = document.querySelector('[class*="sheet"], [class*="Sheet"]')
  const hamburger = document.querySelector('[class*="hamburger"], [class*="menu"]')
  return { hasBottomSheet: !!bottomSheet, hasMenu: !!hamburger }
})
console.log('Mobile info:', JSON.stringify(mobileInfo))

// Reset viewport and check action menu
await page.setViewportSize({ width: 1400, height: 900 })
await page.waitForTimeout(1000)

// Right-click or find action menu on image
if (galleryImages.length > 0) {
  // Hover over first image to reveal actions
  const firstImg = await page.locator('img[src*="supabase"]').first()
  await firstImg.hover()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'tests/screenshots/gallery-06-hover.png', fullPage: false })
  console.log('Screenshot 6: Image hover state')

  // Look for action dropdown trigger
  const actionTrigger = await page.locator('[class*="action"], button[class*="more"], button:has(svg)').all()
  console.log(`Action triggers on hover: ${actionTrigger.length}`)
}

// Take full page screenshot
await page.screenshot({ path: 'tests/screenshots/gallery-07-full.png', fullPage: true })
console.log('Screenshot 7: Full page')

// Analyze the overall layout
const layoutInfo = await page.evaluate(() => {
  const sidebar = document.querySelector('aside, [class*="sidebar"], [class*="Sidebar"]')
  const main = document.querySelector('main')
  const gallery = document.querySelector('[class*="gallery"], [class*="Gallery"]')
  return {
    hasSidebar: !!sidebar,
    sidebarWidth: sidebar?.offsetWidth || 0,
    mainWidth: main?.offsetWidth || 0,
    galleryExists: !!gallery,
    galleryWidth: gallery?.offsetWidth || 0,
    galleryHeight: gallery?.offsetHeight || 0,
  }
})
console.log('Layout info:', JSON.stringify(layoutInfo))

await browser.close()
console.log('\nGallery audit screenshots complete!')
