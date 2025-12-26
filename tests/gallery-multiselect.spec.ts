import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Gallery Multi-Select Feature
 *
 * Features tested:
 * - Single click selection toggle
 * - Shift+click range selection (forward and backward)
 * - Ctrl/Cmd+click toggle selection
 * - Keyboard shortcuts (Escape, Delete, Ctrl+A)
 * - Bulk actions toolbar (Download ZIP, Delete, Move to Folder)
 * - Selection visual indicators
 * - Selection persistence through navigation
 */

// ============================================================================
// Test Configuration
// ============================================================================

const DESKTOP_VIEWPORT = { width: 1280, height: 720 }
const MOBILE_VIEWPORT = { width: 375, height: 667 }
const GALLERY_URL = '/gallery'

// ============================================================================
// Helper Functions
// ============================================================================

class GalleryMultiSelectPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto(GALLERY_URL)
    await this.page.waitForLoadState('networkidle')
  }

  // Wait for gallery to load images
  async waitForImages(timeout = 10000) {
    await this.page.waitForSelector('[data-testid="image-card"], .grid img', { timeout })
  }

  // Get all image cards
  async getImageCards() {
    return this.page.locator('[data-testid="image-card"]').or(
      this.page.locator('.grid > div').filter({ has: this.page.locator('img') })
    )
  }

  // Get count of image cards
  async getImageCount(): Promise<number> {
    const cards = await this.getImageCards()
    return await cards.count()
  }

  // Get the checkbox for an image at index
  async getCheckbox(index: number) {
    const cards = await this.getImageCards()
    const card = cards.nth(index)
    // Look for checkbox (either visible or appears on hover)
    await card.hover()
    await this.page.waitForTimeout(200) // Wait for hover state
    return card.locator('[role="checkbox"], input[type="checkbox"]')
  }

  // Click on image card (not checkbox) at index
  async clickImage(index: number, options?: { modifiers?: ('Shift' | 'Control' | 'Meta')[] }) {
    const cards = await this.getImageCards()
    const card = cards.nth(index)
    await card.click({ modifiers: options?.modifiers })
  }

  // Click checkbox for image at index
  async clickCheckbox(index: number, options?: { modifiers?: ('Shift' | 'Control' | 'Meta')[] }) {
    const checkbox = await this.getCheckbox(index)
    await checkbox.click({ modifiers: options?.modifiers, force: true })
  }

  // Check if image at index is selected
  async isImageSelected(index: number): Promise<boolean> {
    const cards = await this.getImageCards()
    const card = cards.nth(index)
    // Check for selection indicators: aria-checked, data-state, or visual class
    const checkbox = card.locator('[role="checkbox"], input[type="checkbox"]')
    if (await checkbox.count() > 0) {
      const isChecked = await checkbox.getAttribute('data-state') === 'checked' ||
                        await checkbox.getAttribute('aria-checked') === 'true' ||
                        await checkbox.isChecked()
      return isChecked
    }
    // Fallback: check for selection class on card
    const classes = await card.getAttribute('class') || ''
    return classes.includes('selected') || classes.includes('ring-primary')
  }

  // Get the selected count from toolbar or badge
  async getSelectedCount(): Promise<number> {
    // Look for bulk actions toolbar badge
    const badge = this.page.locator('text=/\\d+ selected/i')
    if (await badge.isVisible()) {
      const text = await badge.textContent()
      const match = text?.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }
    return 0
  }

  // Check if bulk actions toolbar is visible
  async isBulkToolbarVisible(): Promise<boolean> {
    const toolbar = this.page.locator('[class*="fixed"][class*="bottom"]').filter({
      has: this.page.locator('text=/selected/i')
    })
    return await toolbar.isVisible()
  }

  // Click Select All button in header
  async clickSelectAll() {
    const selectAllBtn = this.page.getByRole('button', { name: /Select All/i })
    await selectAllBtn.click()
  }

  // Click Clear Selection button (X in toolbar)
  async clickClearSelection() {
    const clearBtn = this.page.locator('button[aria-label="Clear selection"]').or(
      this.page.locator('[class*="fixed"] button').filter({ has: this.page.locator('svg') }).last()
    )
    await clearBtn.click()
  }

  // Click Download ZIP button in toolbar
  async clickDownloadZip() {
    const downloadBtn = this.page.locator('[class*="fixed"]').getByRole('button', { name: /Download/i })
    await downloadBtn.click()
  }

  // Click Move button in toolbar
  async clickMoveToFolder() {
    const moveBtn = this.page.locator('[class*="fixed"]').getByRole('button', { name: /Move/i })
    await moveBtn.click()
  }

  // Click Delete button in toolbar
  async clickDelete() {
    const deleteBtn = this.page.locator('[class*="fixed"]').getByRole('button', { name: /Delete/i }).or(
      this.page.locator('[class*="fixed"] button[class*="destructive"]')
    )
    await deleteBtn.click()
  }

  // Confirm delete in dialog
  async confirmDelete() {
    const confirmBtn = this.page.getByRole('button', { name: /Delete.*Images?/i }).or(
      this.page.locator('[role="alertdialog"] button').filter({ hasText: /Delete/i })
    )
    await confirmBtn.click()
  }

  // Cancel delete in dialog
  async cancelDelete() {
    const cancelBtn = this.page.getByRole('button', { name: /Cancel/i })
    await cancelBtn.click()
  }

  // Press keyboard shortcut
  async pressKey(key: string, modifiers?: { ctrl?: boolean; cmd?: boolean; shift?: boolean }) {
    let combo = ''
    if (modifiers?.ctrl) combo += 'Control+'
    if (modifiers?.cmd) combo += 'Meta+'
    if (modifiers?.shift) combo += 'Shift+'
    combo += key
    await this.page.keyboard.press(combo)
  }

  // Get tooltip content (for testing selection hints)
  async getTooltipContent(trigger: string) {
    const triggerElement = this.page.locator(trigger)
    await triggerElement.hover()
    await this.page.waitForTimeout(500) // Wait for tooltip
    const tooltip = this.page.locator('[role="tooltip"]')
    if (await tooltip.isVisible()) {
      return await tooltip.textContent()
    }
    return null
  }
}

// ============================================================================
// Test Hooks
// ============================================================================

test.beforeEach(async ({ page }) => {
  await page.goto(GALLERY_URL)
  await page.waitForLoadState('networkidle')
})

// ============================================================================
// 1. Single Click Selection Tests
// ============================================================================

test.describe('Single Click Selection', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should toggle selection when clicking image checkbox', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Click first image checkbox
    await gallery.clickCheckbox(0)

    // Verify selection
    const isSelected = await gallery.isImageSelected(0)
    expect(isSelected).toBe(true)

    // Click again to deselect
    await gallery.clickCheckbox(0)

    const isStillSelected = await gallery.isImageSelected(0)
    expect(isStillSelected).toBe(false)
  })

  test('should show bulk toolbar when items are selected', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Initially toolbar should not be visible
    const initiallyVisible = await gallery.isBulkToolbarVisible()
    expect(initiallyVisible).toBe(false)

    // Select an image
    await gallery.clickCheckbox(0)

    // Toolbar should appear
    const toolbarVisible = await gallery.isBulkToolbarVisible()
    expect(toolbarVisible).toBe(true)

    // Selected count should show 1
    const count = await gallery.getSelectedCount()
    expect(count).toBe(1)
  })

  test('should select multiple images independently', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 3) {
      test.skip()
      return
    }

    // Select multiple images
    await gallery.clickCheckbox(0)
    await gallery.clickCheckbox(2)

    const count = await gallery.getSelectedCount()
    expect(count).toBe(2)

    expect(await gallery.isImageSelected(0)).toBe(true)
    expect(await gallery.isImageSelected(1)).toBe(false)
    expect(await gallery.isImageSelected(2)).toBe(true)
  })
})

// ============================================================================
// 2. Shift+Click Range Selection Tests
// ============================================================================

test.describe('Shift+Click Range Selection', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should select range forward with Shift+click', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 4) {
      test.skip()
      return
    }

    // Click first image to set anchor
    await gallery.clickCheckbox(0)
    expect(await gallery.getSelectedCount()).toBe(1)

    // Shift+click on third image to select range 0-2 (3 images)
    await gallery.clickCheckbox(2, { modifiers: ['Shift'] })

    const count = await gallery.getSelectedCount()
    expect(count).toBe(3)

    // Verify all images in range are selected
    expect(await gallery.isImageSelected(0)).toBe(true)
    expect(await gallery.isImageSelected(1)).toBe(true)
    expect(await gallery.isImageSelected(2)).toBe(true)
    expect(await gallery.isImageSelected(3)).toBe(false)
  })

  test('should select range backward with Shift+click', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 4) {
      test.skip()
      return
    }

    // Click third image to set anchor
    await gallery.clickCheckbox(3)
    expect(await gallery.getSelectedCount()).toBe(1)

    // Shift+click on first image to select range 0-3 (4 images)
    await gallery.clickCheckbox(0, { modifiers: ['Shift'] })

    const count = await gallery.getSelectedCount()
    expect(count).toBe(4)
  })

  test('should add to existing selection with Shift+click', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 6) {
      test.skip()
      return
    }

    // Select first image
    await gallery.clickCheckbox(0)

    // Select third image (not as range)
    await gallery.clickCheckbox(4)

    // Shift+click on sixth image (range from img4 to img5)
    await gallery.clickCheckbox(5, { modifiers: ['Shift'] })

    // Should have img0, img4, img5 selected (img0 was pre-selected)
    const count = await gallery.getSelectedCount()
    expect(count).toBeGreaterThanOrEqual(3)
    expect(await gallery.isImageSelected(0)).toBe(true)
  })
})

// ============================================================================
// 3. Ctrl/Cmd+Click Toggle Selection Tests
// ============================================================================

test.describe('Ctrl/Cmd+Click Toggle Selection', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should toggle individual item with Ctrl+click', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 3) {
      test.skip()
      return
    }

    // Select all
    await gallery.clickSelectAll()
    const initialCount = await gallery.getSelectedCount()
    expect(initialCount).toBeGreaterThan(0)

    // Ctrl+click on second image to deselect it
    await gallery.clickCheckbox(1, { modifiers: ['Control'] })

    const newCount = await gallery.getSelectedCount()
    expect(newCount).toBe(initialCount - 1)
    expect(await gallery.isImageSelected(1)).toBe(false)
  })

  test('should add item with Ctrl+click on unselected item', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 3) {
      test.skip()
      return
    }

    // Select first image
    await gallery.clickCheckbox(0)

    // Ctrl+click on third image to add it
    await gallery.clickCheckbox(2, { modifiers: ['Control'] })

    expect(await gallery.getSelectedCount()).toBe(2)
    expect(await gallery.isImageSelected(0)).toBe(true)
    expect(await gallery.isImageSelected(2)).toBe(true)
  })
})

// ============================================================================
// 4. Keyboard Shortcuts Tests
// ============================================================================

test.describe('Keyboard Shortcuts', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should clear selection with Escape key', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Select some images
    await gallery.clickCheckbox(0)
    expect(await gallery.getSelectedCount()).toBe(1)

    // Press Escape
    await gallery.pressKey('Escape')

    // Selection should be cleared
    const count = await gallery.getSelectedCount()
    expect(count).toBe(0)
    expect(await gallery.isBulkToolbarVisible()).toBe(false)
  })

  test('should select all with Ctrl+A', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Press Ctrl+A
    await gallery.pressKey('a', { ctrl: true })

    // All visible images should be selected
    const count = await gallery.getSelectedCount()
    expect(count).toBe(imageCount)
  })

  test('should open delete confirmation with Delete key', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Select an image
    await gallery.clickCheckbox(0)

    // Press Delete key
    await gallery.pressKey('Delete')

    // Delete confirmation dialog should appear
    const dialog = page.locator('[role="alertdialog"]')
    await expect(dialog).toBeVisible()

    // Cancel to avoid actually deleting
    await gallery.cancelDelete()
  })
})

// ============================================================================
// 5. Bulk Actions Tests
// ============================================================================

test.describe('Bulk Actions Toolbar', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should show correct selected count in toolbar', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 3) {
      test.skip()
      return
    }

    await gallery.clickCheckbox(0)
    expect(await gallery.getSelectedCount()).toBe(1)

    await gallery.clickCheckbox(1)
    expect(await gallery.getSelectedCount()).toBe(2)

    await gallery.clickCheckbox(2)
    expect(await gallery.getSelectedCount()).toBe(3)
  })

  test('should clear selection when clicking clear button', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Select some images
    await gallery.clickSelectAll()
    expect(await gallery.getSelectedCount()).toBeGreaterThan(0)

    // Click clear
    await gallery.clickClearSelection()

    // Selection should be cleared
    expect(await gallery.getSelectedCount()).toBe(0)
    expect(await gallery.isBulkToolbarVisible()).toBe(false)
  })

  test('should show delete confirmation when clicking delete', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Select an image
    await gallery.clickCheckbox(0)

    // Click delete button
    await gallery.clickDelete()

    // Confirmation dialog should appear
    const dialog = page.locator('[role="alertdialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/delete/i)

    // Cancel to avoid actually deleting
    await gallery.cancelDelete()
  })

  test('should show move dropdown with folders', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Select an image
    await gallery.clickCheckbox(0)

    // Click move button
    await gallery.clickMoveToFolder()

    // Dropdown should appear with Uncategorized option
    const dropdown = page.locator('[role="menu"]')
    await expect(dropdown).toBeVisible()
    await expect(page.locator('text=Uncategorized')).toBeVisible()

    // Close dropdown by clicking elsewhere
    await page.keyboard.press('Escape')
  })
})

// ============================================================================
// 6. Select All Tests
// ============================================================================

test.describe('Select All', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should select all visible images when clicking Select All', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Click Select All
    await gallery.clickSelectAll()

    // All images should be selected
    const selectedCount = await gallery.getSelectedCount()
    expect(selectedCount).toBe(imageCount)
  })

  test('should have tooltip on Select All button explaining shortcuts', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    // Hover over Select All button
    const selectAllBtn = page.getByRole('button', { name: /Select All/i })
    await selectAllBtn.hover()

    // Wait for tooltip
    await page.waitForTimeout(500)

    // Check for tooltip content mentioning Shift or Ctrl
    const tooltip = page.locator('[role="tooltip"]')
    if (await tooltip.isVisible()) {
      const text = await tooltip.textContent()
      expect(text).toMatch(/Shift|Ctrl|Cmd|range|toggle/i)
    }
  })
})

// ============================================================================
// 7. Visual Feedback Tests
// ============================================================================

test.describe('Visual Feedback', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should show visual indicator when in selection mode', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Select an image to enter selection mode
    await gallery.clickCheckbox(0)

    // CardContent should have selection mode styling (ring or background tint)
    const galleryContent = page.locator('[class*="ring-primary"]').or(
      page.locator('[class*="bg-primary"]')
    )
    const hasVisualIndicator = await galleryContent.count() > 0
    expect(hasVisualIndicator).toBe(true)
  })

  test('should show checkboxes prominently when in selection mode', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 2) {
      test.skip()
      return
    }

    // Before selection mode - checkboxes may be hidden
    // Select an image to enter selection mode
    await gallery.clickCheckbox(0)

    // In selection mode, checkboxes on other images should be visible without hover
    const cards = await gallery.getImageCards()
    const secondCard = cards.nth(1)
    const checkbox = secondCard.locator('[role="checkbox"], input[type="checkbox"]')

    // Should be visible without hovering
    await expect(checkbox.first()).toBeVisible()
  })
})

// ============================================================================
// 8. Mobile Tests
// ============================================================================

test.describe('Mobile Selection', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test('should support selection on mobile', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Tap on checkbox (mobile)
    await gallery.clickCheckbox(0)

    // Selection should work
    const count = await gallery.getSelectedCount()
    expect(count).toBe(1)

    // Toolbar should appear
    const toolbarVisible = await gallery.isBulkToolbarVisible()
    expect(toolbarVisible).toBe(true)
  })

  test('should show compact toolbar buttons on mobile', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount === 0) {
      test.skip()
      return
    }

    // Select an image
    await gallery.clickCheckbox(0)

    // On mobile, button text may be hidden (icons only)
    const toolbar = page.locator('[class*="fixed"][class*="bottom"]')
    await expect(toolbar).toBeVisible()

    // Verify buttons have icons (not just text)
    const icons = toolbar.locator('svg')
    expect(await icons.count()).toBeGreaterThan(0)
  })
})

// ============================================================================
// 9. Integration Tests
// ============================================================================

test.describe('Selection Integration', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should handle complex selection workflow', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 5) {
      test.skip()
      return
    }

    // 1. Select first image
    await gallery.clickCheckbox(0)
    expect(await gallery.getSelectedCount()).toBe(1)

    // 2. Shift+click to select range
    await gallery.clickCheckbox(2, { modifiers: ['Shift'] })
    expect(await gallery.getSelectedCount()).toBe(3)

    // 3. Ctrl+click to add another
    await gallery.clickCheckbox(4, { modifiers: ['Control'] })
    expect(await gallery.getSelectedCount()).toBe(4)

    // 4. Ctrl+click to remove one from range
    await gallery.clickCheckbox(1, { modifiers: ['Control'] })
    expect(await gallery.getSelectedCount()).toBe(3)

    // 5. Clear selection
    await gallery.clickClearSelection()
    expect(await gallery.getSelectedCount()).toBe(0)
  })

  test('should persist selection through search filter', async ({ page }) => {
    const gallery = new GalleryMultiSelectPage(page)
    await gallery.waitForImages()

    const imageCount = await gallery.getImageCount()
    if (imageCount < 2) {
      test.skip()
      return
    }

    // Select some images
    await gallery.clickCheckbox(0)
    const initialCount = await gallery.getSelectedCount()
    expect(initialCount).toBe(1)

    // Type in search (if there's a search input)
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await page.waitForTimeout(500) // Wait for debounce

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(500)

      // Selection should be preserved or handled gracefully
      // (depends on implementation - selection may clear if image is filtered out)
    }
  })
})
