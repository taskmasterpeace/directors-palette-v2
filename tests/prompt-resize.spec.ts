import { test, expect } from '@playwright/test'

/**
 * Tests for the prompt textarea resize feature in Shot Creator.
 *
 * Expected behavior (new):
 * - A single toggle button cycles between 'small' and 'large' sizes
 * - A drag resize handle allows free-form vertical resizing
 *
 * These tests should FAIL against the current implementation which has
 * 4 separate size buttons and no drag handle.
 */

const SHOT_CREATOR_URL = '/'

test.describe('Prompt Textarea Resize', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(SHOT_CREATOR_URL)
    await page.waitForLoadState('networkidle')
    // Wait for the prompt section to render
    await page.waitForTimeout(2000)
  })

  test.describe('Size Toggle Button', () => {

    test('should have exactly one size toggle button, not four', async ({ page }) => {
      // The new design replaces 4 size buttons with a single toggle.
      // Look for the toggle by its title attribute.
      const toggleButton = page.locator('button[title="Toggle prompt size"]')
      await expect(toggleButton).toBeVisible({ timeout: 5000 })
      await expect(toggleButton).toHaveCount(1)
    })

    test('toggle button should show Maximize2 icon in default small state', async ({ page }) => {
      // In 'small' mode (default), the button shows Maximize2 icon
      // indicating "click to expand"
      const toggleButton = page.locator('button[title="Toggle prompt size"]')
      await expect(toggleButton).toBeVisible({ timeout: 5000 })

      // The Maximize2 icon from lucide-react renders as an SVG with class lucide-maximize-2
      const maximizeIcon = toggleButton.locator('svg.lucide-maximize-2')
      await expect(maximizeIcon).toBeVisible()
    })

    test('clicking toggle should switch from small to large and show Minimize2 icon', async ({ page }) => {
      const toggleButton = page.locator('button[title="Toggle prompt size"]')
      await expect(toggleButton).toBeVisible({ timeout: 5000 })

      // Click to expand from small to large
      await toggleButton.click()

      // After clicking, should show Minimize2 icon (indicating "click to collapse")
      const minimizeIcon = toggleButton.locator('svg.lucide-minimize-2')
      await expect(minimizeIcon).toBeVisible()

      // The Maximize2 icon should no longer be visible
      const maximizeIcon = toggleButton.locator('svg.lucide-maximize-2')
      await expect(maximizeIcon).not.toBeVisible()
    })

    test('clicking toggle twice should cycle back to small with Maximize2 icon', async ({ page }) => {
      const toggleButton = page.locator('button[title="Toggle prompt size"]')
      await expect(toggleButton).toBeVisible({ timeout: 5000 })

      // Click once: small -> large
      await toggleButton.click()
      // Click again: large -> small
      await toggleButton.click()

      // Should be back to Maximize2 icon
      const maximizeIcon = toggleButton.locator('svg.lucide-maximize-2')
      await expect(maximizeIcon).toBeVisible()
    })
  })

  test.describe('Drag Resize Handle', () => {

    test('should have a drag resize handle with correct data-testid', async ({ page }) => {
      const handle = page.locator('[data-testid="prompt-resize-handle"]')
      await expect(handle).toBeVisible({ timeout: 5000 })
    })

    test('should have a prompt textarea container with correct data-testid', async ({ page }) => {
      const container = page.locator('[data-testid="prompt-textarea-container"]')
      await expect(container).toBeVisible({ timeout: 5000 })
    })

    test('dragging the handle should change the textarea container height', async ({ page }) => {
      const container = page.locator('[data-testid="prompt-textarea-container"]')
      const handle = page.locator('[data-testid="prompt-resize-handle"]')

      await expect(container).toBeVisible({ timeout: 5000 })
      await expect(handle).toBeVisible({ timeout: 5000 })

      // Measure initial height
      const initialBox = await container.boundingBox()
      expect(initialBox).not.toBeNull()
      const initialHeight = initialBox!.height

      // Get handle position for drag
      const handleBox = await handle.boundingBox()
      expect(handleBox).not.toBeNull()

      const handleCenterX = handleBox!.x + handleBox!.width / 2
      const handleCenterY = handleBox!.y + handleBox!.height / 2

      // Drag the handle down by 150 pixels
      await page.mouse.move(handleCenterX, handleCenterY)
      await page.mouse.down()
      await page.mouse.move(handleCenterX, handleCenterY + 150, { steps: 10 })
      await page.mouse.up()

      // Measure new height - should be larger
      const newBox = await container.boundingBox()
      expect(newBox).not.toBeNull()
      expect(newBox!.height).toBeGreaterThan(initialHeight + 50)
    })
  })
})
