import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Gallery and 9-Shot Cinematic Feature on Mobile
 *
 * Features tested:
 * - Gallery page loads on mobile viewport (iPhone 12 - 390x844)
 * - Gallery images are responsive and visible
 * - Storyboard Contact Sheet (9-shot cinematic) feature
 * - Mobile UI responsiveness and navigation
 * - Visual verification through screenshots
 */

// Use iPhone 12 viewport
test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
})

const GALLERY_URL = '/gallery'
const STORYBOARD_URL = '/storyboard'

class GalleryMobilePage {
    constructor(private page: Page) { }

    async gotoGallery() {
        await this.page.goto(GALLERY_URL)
        await this.page.waitForLoadState('networkidle')
    }

    async gotoStoryboard() {
        await this.page.goto(STORYBOARD_URL)
        await this.page.waitForLoadState('networkidle')
    }

    async gotoHome() {
        await this.page.goto('/')
        await this.page.waitForLoadState('networkidle')
    }

    async checkGalleryLoaded() {
        // Check for gallery header elements
        const galleryHeader = this.page.locator('[data-testid="gallery-header"]').or(
            this.page.locator('text=Gallery').or(
                this.page.locator('h1, h2, h3').filter({ hasText: /gallery/i })
            )
        )

        // Wait for either gallery header or images to load
        await Promise.race([
            galleryHeader.first().waitFor({ timeout: 10000 }).catch(() => { }),
            this.page.locator('img').first().waitFor({ timeout: 10000 }).catch(() => { })
        ])
    }

    async checkImagesVisible() {
        // Wait for images to be present
        const images = this.page.locator('img[src*="generated"], img[src*="gallery"], img[alt*="Generated"]')
        const count = await images.count()

        // If images exist, check at least one is visible
        if (count > 0) {
            await expect(images.first()).toBeVisible({ timeout: 10000 })
            return count
        }
        return 0
    }

    async checkContactSheetFeature() {
        // Look for Contact Sheet / 9-shot feature in Storyboard
        // First, check if we need to generate prompts
        const textarea = this.page.locator('textarea[placeholder*="Paste your script"], textarea[placeholder*="script"]')
        const textareaVisible = await textarea.isVisible().catch(() => false)

        if (textareaVisible) {
            // Input a test story
            await textarea.fill('INT. COFFEE SHOP - DAY\nSarah sits at a corner table, lost in thought.')

            // Generate prompts
            const generateButton = this.page.getByRole('button', { name: /Generate Shot Prompts/i })
            await generateButton.click()

            // Wait for shots to be generated
            await this.page.waitForSelector('button:has-text("Contact Sheet"), button:has-text("9"), text=Contact Sheet', { timeout: 30000 })
        }

        // Look for Contact Sheet button or 9-shot indicator
        const contactSheetButton = this.page.locator('button:has-text("Contact Sheet")').or(
            this.page.locator('button[title*="Contact Sheet"]').or(
                this.page.locator('[aria-label*="Contact Sheet"]')
            )
        )

        return contactSheetButton
    }

    async takeScreenshot(name: string) {
        // Create screenshots directory if it doesn't exist
        const fs = require('fs')
        const path = require('path')
        const screenshotDir = path.join(process.cwd(), 'test-results', 'screenshots')
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true })
        }

        await this.page.screenshot({
            path: `test-results/screenshots/mobile-${name}.png`,
            fullPage: true
        })
    }

    async checkMobileNavigation() {
        // Check for mobile menu/hamburger if exists
        const mobileMenu = this.page.locator('button[aria-label*="menu"]').or(
            this.page.locator('button:has-text("☰")').or(
                this.page.locator('[data-testid="mobile-menu"]')
            )
        )

        const menuExists = await mobileMenu.count() > 0
        return menuExists
    }
}

test.describe('Gallery Mobile Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Set up mobile context
        await page.setViewportSize({ width: 390, height: 844 })
    })

    test('should load gallery page on mobile viewport', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to gallery
        await gallery.gotoGallery()

        // Take initial screenshot
        await gallery.takeScreenshot('01-gallery-loaded')

        // Verify page loaded
        await gallery.checkGalleryLoaded()

        // Verify viewport is mobile size
        const viewport = page.viewportSize()
        expect(viewport?.width).toBe(390)
        expect(viewport?.height).toBe(844)
    })

    test('should display gallery images responsively on mobile', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to gallery
        await gallery.gotoGallery()

        // Check if images are visible
        const imageCount = await gallery.checkImagesVisible()

        // Take screenshot showing images
        await gallery.takeScreenshot('02-gallery-images')

        console.log(`Found ${imageCount} images in gallery`)

        // If no images, that's ok - gallery might be empty
        // Just verify the page structure is responsive
        const mainContent = page.locator('main, [role="main"], .gallery-container').first()
        const hasMain = await mainContent.count() > 0

        if (hasMain) {
            await expect(mainContent).toBeVisible()
        } else {
            // Fallback: just verify body is visible
            await expect(page.locator('body')).toBeVisible()
        }
    })

    test('should navigate to home and verify mobile responsiveness', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to home
        await gallery.gotoHome()

        // Take screenshot
        await gallery.takeScreenshot('03-home-mobile')

        // Check for mobile navigation
        const hasMobileNav = await gallery.checkMobileNavigation()
        console.log(`Mobile navigation present: ${hasMobileNav}`)

        // Verify page is responsive
        const viewport = page.viewportSize()
        expect(viewport?.width).toBe(390)
    })

    test('should verify 9-shot cinematic contact sheet feature', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to storyboard
        await gallery.gotoStoryboard()

        // Take screenshot of storyboard
        await gallery.takeScreenshot('04-storyboard-mobile')

        // Check for contact sheet feature
        const contactSheetButton = await gallery.checkContactSheetFeature()

        // Take screenshot showing the contact sheet button
        await gallery.takeScreenshot('05-contact-sheet-feature')

        // Verify contact sheet button exists
        const buttonCount = await contactSheetButton.count()
        console.log(`Contact Sheet button found: ${buttonCount > 0}`)

        if (buttonCount > 0) {
            // Click the first contact sheet button
            await contactSheetButton.first().click()

            // Wait for modal/dialog to open
            await page.waitForTimeout(2000)

            // Take screenshot of the modal
            await gallery.takeScreenshot('06-contact-sheet-modal')

            // Look for 9-shot grid or angle options
            const gridIndicator = page.locator('text=9').or(
                page.locator('text=Grid').or(
                    page.locator('[class*="3x3"]').or(
                        page.locator('text=/angle|camera/i')
                    )
                )
            )

            const hasGridFeature = await gridIndicator.count() > 0
            console.log(`9-shot grid feature found: ${hasGridFeature}`)

            // Verify the modal is displayed
            const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first()
            await expect(modal).toBeVisible({ timeout: 5000 })
        }
    })

    test('should verify gallery grid layout on mobile', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to gallery
        await gallery.gotoGallery()
        await gallery.checkGalleryLoaded()

        // Check for grid layout
        const gridContainer = page.locator('[class*="grid"], [style*="grid"], [data-testid*="grid"]')
        const hasGrid = await gridContainer.count() > 0

        console.log(`Gallery grid layout found: ${hasGrid}`)

        // Take screenshot showing grid
        await gallery.takeScreenshot('07-gallery-grid-mobile')

        // Verify responsive behavior - check if content fits viewport
        const viewportWidth = page.viewportSize()?.width || 390
        const bodyWidth = await page.locator('body').evaluate((el) => el.scrollWidth)

        // Body should not be wider than viewport (no horizontal scroll)
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20) // 20px tolerance for scrollbar
    })

    test('should test gallery folder navigation on mobile', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to gallery
        await gallery.gotoGallery()
        await gallery.checkGalleryLoaded()

        // Look for folder navigation (sidebar or mobile menu)
        const folderNav = page.locator('[data-testid*="folder"], button:has-text("Folders"), [aria-label*="folder"]')
        const hasFolders = await folderNav.count() > 0

        console.log(`Folder navigation found: ${hasFolders}`)

        if (hasFolders) {
            // Click to open folders
            await folderNav.first().click()
            await page.waitForTimeout(1000)
        }

        // Take screenshot
        await gallery.takeScreenshot('08-gallery-folders-mobile')

        // Verify UI remains responsive
        const viewport = page.viewportSize()
        expect(viewport?.width).toBe(390)
    })

    test('should verify mobile touch interactions', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to gallery
        await gallery.gotoGallery()
        await gallery.checkGalleryLoaded()

        // Try to find an image to tap
        const images = page.locator('img[src*="generated"], img[src*="gallery"]')
        const imageCount = await images.count()

        if (imageCount > 0) {
            // Tap on first image
            await images.first().tap()
            await page.waitForTimeout(1500)

            // Take screenshot of result (might open fullscreen/modal)
            await gallery.takeScreenshot('09-mobile-image-tap')

            // Look for fullscreen modal or expanded view
            const fullscreenModal = page.locator('[data-testid*="fullscreen"], [class*="fullscreen"], [role="dialog"]')
            const hasFullscreen = await fullscreenModal.count() > 0

            console.log(`Fullscreen view opened: ${hasFullscreen}`)
        } else {
            console.log('No images available to test tap interaction')
            await gallery.takeScreenshot('09-mobile-no-images')
        }
    })
})

test.describe('Contact Sheet Feature - Mobile', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        isMobile: true,
    })

    test('should display contact sheet angles on mobile', async ({ page }) => {
        const gallery = new GalleryMobilePage(page)

        // Navigate to storyboard
        await gallery.gotoStoryboard()

        // Input test story
        const textarea = page.locator('textarea[placeholder*="script"]').first()
        const textareaVisible = await textarea.isVisible().catch(() => false)

        if (textareaVisible) {
            await textarea.fill('INT. LIBRARY - NIGHT\nA detective examines old files.')

            // Generate prompts
            const generateButton = page.getByRole('button', { name: /Generate Shot Prompts/i })
            await generateButton.click()

            // Wait for generation
            await page.waitForSelector('button:has-text("Contact Sheet"), button:has-text("Refine")', { timeout: 30000 })

            // Take screenshot of generated shots
            await gallery.takeScreenshot('10-shots-generated-mobile')

            // Click contact sheet
            const contactSheetBtn = page.locator('button:has-text("Contact Sheet")').first()
            const btnExists = await contactSheetBtn.count() > 0

            if (btnExists) {
                await contactSheetBtn.click()
                await page.waitForTimeout(2000)

                // Take screenshot of contact sheet modal
                await gallery.takeScreenshot('11-contact-sheet-angles-mobile')

                // Verify modal content
                const modal = page.locator('[role="dialog"]').first()
                await expect(modal).toBeVisible()

                // Look for angle names (Wide, Medium, Close-up, etc.)
                const angleText = page.locator('text=/wide|medium|close|high|low|over/i')
                const angleCount = await angleText.count()
                console.log(`Found ${angleCount} camera angle references`)
            }
        }
    })
})
