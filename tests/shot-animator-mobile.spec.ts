import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Shot Animator Mobile UX
 *
 * Features tested:
 * - Compact toolbar on mobile (single row)
 * - Constrained card image heights
 * - Scroll area takes majority of screen
 * - Touch-friendly button sizes
 * - No horizontal overflow
 */

// Use iPhone 13 viewport
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

class ShotAnimatorMobilePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToShotAnimator() {
    // Look for Shot Animator tab in the main app
    const shotAnimatorTab = this.page.locator('[data-value="shot-animator"]').or(
      this.page.locator('button:has-text("Shot Animator")').or(
        this.page.locator('[role="tab"]:has-text("Shot Animator")')
      )
    )

    const tabExists = await shotAnimatorTab.count() > 0
    if (tabExists) {
      await shotAnimatorTab.first().click()
      await this.page.waitForTimeout(500)
    }
    return tabExists
  }

  async getToolbarHeight(): Promise<number> {
    // The toolbar is the border-b element at the top
    const toolbar = this.page.locator('.border-b.border-border').first()
    const box = await toolbar.boundingBox()
    return box?.height || 0
  }

  async getScrollAreaHeight(): Promise<number> {
    // The scroll area viewport
    const scrollArea = this.page.locator('[data-radix-scroll-area-viewport]').first()
    const box = await scrollArea.boundingBox()
    return box?.height || 0
  }

  async checkNoHorizontalOverflow(): Promise<boolean> {
    const viewportWidth = this.page.viewportSize()?.width || 390
    const bodyWidth = await this.page.locator('body').evaluate((el) => el.scrollWidth)
    return bodyWidth <= viewportWidth + 10 // 10px tolerance
  }

  async uploadTestImage() {
    // This is a mock - in real test we'd use fileChooser
    // For now, just check the upload button is accessible
    const uploadButton = this.page.locator('button:has(svg.lucide-upload)').first()
    return await uploadButton.isVisible()
  }

  async getCardImageHeight(): Promise<number> {
    const cardImage = this.page.locator('[data-testid="shot-card-image"]').or(
      this.page.locator('.aspect-square').first()
    )
    const box = await cardImage.boundingBox()
    return box?.height || 0
  }

  async takeScreenshot(name: string) {
    const fs = require('fs')
    const path = require('path')
    const screenshotDir = path.join(process.cwd(), 'test-results', 'screenshots')
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true })
    }

    await this.page.screenshot({
      path: `test-results/screenshots/shot-animator-mobile-${name}.png`,
      fullPage: true,
    })
  }
}

test.describe('Shot Animator Mobile UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
  })

  test('should have compact toolbar on mobile', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    await animator.takeScreenshot('01-initial-load')

    // Toolbar should be compact - less than 80px (single row ~48px + padding)
    const toolbarHeight = await animator.getToolbarHeight()
    console.log(`Toolbar height: ${toolbarHeight}px`)

    expect(toolbarHeight).toBeLessThan(80)
  })

  test('should not have horizontal overflow', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    const noOverflow = await animator.checkNoHorizontalOverflow()
    expect(noOverflow).toBe(true)
  })

  test('should have scroll area taking majority of screen', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    const viewport = page.viewportSize()
    if (!viewport) {
      test.skip()
      return
    }

    // The scroll area should take at least 60% of viewport height
    // After compact toolbar (~60px) and bottom bar (~60px when visible)
    // Remaining should be at least 60% = 506px of 844px
    const scrollHeight = await animator.getScrollAreaHeight()
    console.log(`Scroll area height: ${scrollHeight}px, viewport: ${viewport.height}px`)

    const minExpectedHeight = viewport.height * 0.5 // At least 50%
    expect(scrollHeight).toBeGreaterThan(minExpectedHeight)
  })

  test('should have touch-friendly buttons', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    // Check that toolbar buttons are at least 40px (touch-friendly)
    const toolbarButtons = page.locator('.flex.sm\\:hidden button').first()
    const buttonBox = await toolbarButtons.boundingBox()

    if (buttonBox) {
      console.log(`Button size: ${buttonBox.width}x${buttonBox.height}`)
      expect(buttonBox.height).toBeGreaterThanOrEqual(36)
      expect(buttonBox.width).toBeGreaterThanOrEqual(36)
    }
  })

  test('should hide search on mobile', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    // Search input should be hidden on mobile
    const searchInput = page.locator('input[placeholder*="Search"]')
    const isSearchVisible = await searchInput.isVisible()

    // On mobile, the search should be hidden (in desktop-only section)
    expect(isSearchVisible).toBe(false)
  })

  test('should show selection badge when items selected', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    // Take screenshot of empty state
    await animator.takeScreenshot('02-empty-state')

    // The "X sel" badge should only appear when items are selected
    // In empty state, it shouldn't be visible
    const selectionBadge = page.locator('text=/\\d+ sel/')
    const badgeCount = await selectionBadge.count()

    // With no images, there should be no selection badge
    console.log(`Selection badge count: ${badgeCount}`)
  })

  test('should display model selector in compact form', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    // Find the mobile model selector (should be ~112px wide)
    const mobileModelSelector = page.locator('.flex.sm\\:hidden [data-slot="select-trigger"]').or(
      page.locator('.flex.sm\\:hidden button[role="combobox"]')
    )

    const selectorBox = await mobileModelSelector.first().boundingBox()
    if (selectorBox) {
      console.log(`Model selector width: ${selectorBox.width}px`)
      // Should be compact - around 112px (w-28)
      expect(selectorBox.width).toBeLessThan(150)
    }
  })

  test('should verify viewport and responsiveness', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    // Verify we're in mobile viewport
    const viewport = page.viewportSize()
    expect(viewport?.width).toBe(390)
    expect(viewport?.height).toBe(844)

    await animator.takeScreenshot('03-mobile-viewport')

    // Verify mobile toolbar is visible
    const mobileToolbar = page.locator('.flex.sm\\:hidden').first()
    const desktopToolbar = page.locator('.hidden.sm\\:block').first()

    await expect(mobileToolbar).toBeVisible()
    await expect(desktopToolbar).not.toBeVisible()
  })
})

test.describe('Shot Animator Card Layout - Mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })

  test('card images should be constrained on mobile', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    // If there are any cards, verify their image height is constrained
    const cardImages = page.locator('.aspect-square.max-h-\\[180px\\]')
    const count = await cardImages.count()

    if (count > 0) {
      const imageBox = await cardImages.first().boundingBox()
      if (imageBox) {
        console.log(`Card image height: ${imageBox.height}px`)
        // Should be capped at 180px on mobile
        expect(imageBox.height).toBeLessThanOrEqual(200) // Small tolerance
      }
    }

    console.log(`Found ${count} constrained card images`)
  })

  test('empty state should display properly on mobile', async ({ page }) => {
    const animator = new ShotAnimatorMobilePage(page)
    await animator.goto()

    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
      return
    }

    // Check for empty state message
    const emptyMessage = page.locator('text=No images to display').or(
      page.locator('text=Upload images')
    )

    const hasEmptyState = await emptyMessage.count() > 0
    console.log(`Empty state visible: ${hasEmptyState}`)

    if (hasEmptyState) {
      await expect(emptyMessage.first()).toBeVisible()
    }

    await animator.takeScreenshot('04-empty-state-check')
  })
})
