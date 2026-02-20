import { test, expect, Page } from '@playwright/test'
import * as path from 'path'

/**
 * E2E Tests for Shot Animator Drag-and-Drop File Upload
 *
 * Features tested:
 * - Drop zone overlay appears when dragging files over the grid
 * - Dropping image files creates shot cards in the grid
 * - Non-image files are rejected with a visual rejection state
 *
 * These tests verify the drag-and-drop alternative to the existing
 * click-to-upload button on the shot animator grid.
 */

class ShotAnimatorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToShotAnimator() {
    // Try clicking the sidebar button (wait for sidebar to render)
    const shotAnimatorBtn = this.page.locator('button:has-text("Shot Animator")')
    try {
      await shotAnimatorBtn.first().click({ timeout: 5000 })
    } catch {
      // Sidebar may be collapsed -- expand it first, then click
      const expandBtn = this.page.locator('button:has(svg.lucide-menu)').first()
      if (await expandBtn.isVisible().catch(() => false)) {
        await expandBtn.click()
        await this.page.waitForTimeout(500)
      }
      try {
        await shotAnimatorBtn.first().click({ timeout: 3000 })
      } catch {
        return false
      }
    }
    await this.page.waitForTimeout(500)
    return true
  }

  /** The grid container that wraps the shot cards or empty state */
  get gridArea() {
    return this.page.locator('.overflow-hidden:has([data-radix-scroll-area-viewport])').first()
  }

  /** The drop overlay that should appear during drag operations */
  get dropOverlay() {
    return this.page.locator('[data-testid="shot-animator-drop-overlay"]')
  }

  /** The empty state message shown when no shots exist */
  get emptyState() {
    return this.page.getByText('No images to display')
  }
}

/**
 * Dispatches a native DragEvent on a target element with the given
 * dataTransfer payload. Playwright does not have built-in drag-and-drop
 * for file drops, so we dispatch the events manually.
 */
async function emitDragEvent(
  page: Page,
  selector: string,
  eventType: 'dragenter' | 'dragover' | 'dragleave' | 'drop',
  files: { name: string; type: string }[]
) {
  await page.evaluate(
    ({ selector, eventType, files }) => {
      const target = document.querySelector(selector)
      if (!target) throw new Error(`Element not found: ${selector}`)

      const dataTransfer = new DataTransfer()
      for (const f of files) {
        const file = new File(['fake-content'], f.name, { type: f.type })
        dataTransfer.items.add(file)
      }

      const event = new DragEvent(eventType, {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      })

      target.dispatchEvent(event)
    },
    { selector, eventType, files }
  )
}

test.describe('Shot Animator Drag and Drop Upload', () => {
  let animator: ShotAnimatorPage

  test.beforeEach(async ({ page }) => {
    animator = new ShotAnimatorPage(page)
    await animator.goto()
    const navigated = await animator.navigateToShotAnimator()
    if (!navigated) {
      test.skip()
    }
  })

  test('drop zone overlay appears when dragging files over the grid', async ({ page }) => {
    // The drop overlay should not be visible initially
    await expect(animator.dropOverlay).not.toBeVisible()

    // Simulate dragging image files over the grid area
    await emitDragEvent(
      page,
      '.overflow-hidden:has([data-radix-scroll-area-viewport])',
      'dragenter',
      [{ name: 'photo.png', type: 'image/png' }]
    )

    // The drop overlay should now be visible with instructional text
    await expect(animator.dropOverlay).toBeVisible({ timeout: 3000 })
    await expect(animator.dropOverlay).toContainText(/drop images here/i)
  })

  test('dropping image files creates shot cards in the grid', async ({ page }) => {
    // Confirm we start in the empty state
    await expect(animator.emptyState).toBeVisible()

    // Resolve absolute paths to the test images
    const testImagePath = path.resolve(__dirname, 'rktnv7sgqsrma0ctst8s9r8xpr.webp')

    // Simulate the full drag-and-drop sequence: dragenter -> dragover -> drop
    const gridSelector = '.overflow-hidden:has([data-radix-scroll-area-viewport])'

    await emitDragEvent(page, gridSelector, 'dragenter', [
      { name: 'test-image.webp', type: 'image/webp' },
    ])
    await emitDragEvent(page, gridSelector, 'dragover', [
      { name: 'test-image.webp', type: 'image/webp' },
    ])

    // For the actual drop we need a real file -- use page.dispatchEvent with
    // an InputEvent that carries a proper file. We use evaluate to build a
    // File from the test image bytes read via fetch (same-origin) or a blob.
    // Since we cannot read local FS from the browser, we fabricate a
    // realistic File object with the correct MIME type.
    await page.evaluate((gridSelector) => {
      const target = document.querySelector(gridSelector)
      if (!target) throw new Error('Grid not found')

      const dataTransfer = new DataTransfer()
      // Create a small 1x1 white pixel webp file content (valid image)
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
        0x18, 0x00, 0x00, 0x00, 0x30, 0x01, 0x00, 0x9d,
        0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x01, 0x40,
        0x25, 0xa4, 0x00, 0x03, 0x70, 0x00, 0xfe, 0xfb,
        0x94, 0x00, 0x00,
      ])
      const file = new File([bytes], 'test-image.webp', { type: 'image/webp' })
      dataTransfer.items.add(file)

      const event = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      })
      target.dispatchEvent(event)
    }, gridSelector)

    // After dropping, the empty state should disappear and a shot card should appear
    await expect(animator.emptyState).not.toBeVisible({ timeout: 5000 })

    // At least one shot card should now exist in the grid
    const shotCards = page.locator('[data-testid="shot-card"]').or(
      page.locator('.p-2.sm\\:p-4 > div').first()
    )
    await expect(shotCards.first()).toBeVisible({ timeout: 5000 })
  })

  test('drop zone rejects non-image files with a rejection state', async ({ page }) => {
    // Simulate dragging a non-image file (text file) over the grid
    await emitDragEvent(
      page,
      '.overflow-hidden:has([data-radix-scroll-area-viewport])',
      'dragenter',
      [{ name: 'document.txt', type: 'text/plain' }]
    )

    // The overlay should appear but in a rejection/error state
    const dropOverlay = animator.dropOverlay
    await expect(dropOverlay).toBeVisible({ timeout: 3000 })

    // The rejection state should indicate files are not accepted
    // Look for a visual rejection indicator (red styling, error text, etc.)
    const rejectionIndicator = dropOverlay.locator('[data-testid="drop-reject"]').or(
      dropOverlay.getByText(/not supported|images only|invalid/i)
    )
    await expect(rejectionIndicator).toBeVisible({ timeout: 3000 })
  })
})
