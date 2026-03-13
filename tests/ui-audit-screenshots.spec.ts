import { test, expect } from '@playwright/test'

const TABS = [
  'shot-creator',
  'layout-annotation',
  'shot-animator',
  'node-workflow',
  'figurine-studio',
  'merch-lab',
  'storyboard',
  'storybook',
  'music-lab',
  'brand-studio',
  'gallery',
  'community',
  'prompt-tools',
]

test.describe('UI Audit Screenshots', () => {
  test('capture all tabs', async ({ page }) => {
    // Go to main app (auth state loaded from .auth/user.json)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for the sidebar to render
    await page.waitForTimeout(2000)

    for (const tabId of TABS) {
      // Click the sidebar nav item
      const navButton = page.locator(`[data-tab-id="${tabId}"]`).first()

      // If no data-tab-id, try clicking by text
      if (await navButton.count() === 0) {
        // Try clicking via the layout store directly
        await page.evaluate((id) => {
          // Access zustand store
          const event = new CustomEvent('setActiveTab', { detail: id })
          window.dispatchEvent(event)
        }, tabId)

        // Also try URL approach
        await page.evaluate((id) => {
          const store = (window as any).__layoutStore
          if (store) store.getState().setActiveTab(id)
        }, tabId)
      } else {
        await navButton.click()
      }

      await page.waitForTimeout(1500)
      await page.screenshot({
        path: `test-results/ui-audit/${tabId}.png`,
        fullPage: false
      })
      console.log(`✓ Captured: ${tabId}`)
    }
  })
})
