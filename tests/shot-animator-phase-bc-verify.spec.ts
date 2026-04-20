import { test, expect } from '@playwright/test'

/**
 * Phase B + Phase C visual verification for Shot Animator.
 *
 * Focused smoke test that confirms the audit-polish changes landed:
 *  - Empty state renders the reworked layout (Upload images / Browse gallery / Ctrl+V hint / Multi-shot hint)
 *  - Shot cards carry data-shot-id (required by Alt+ArrowUp/Down keyboard reorder)
 *  - Prompt Tips is a labeled toggle button (not the old Info tooltip)
 *  - Clear All button appears in controls when a shot exists
 *
 * Captures screenshots to test-results/ for visual review.
 */

test.describe('Shot Animator — Phase B/C verification', () => {
  test('empty state renders reworked layout with primary buttons + shortcut hints', async ({ page }) => {
    await page.goto('/shot-animator')
    await page.waitForLoadState('networkidle')

    // Title check — confirms we're on the right page
    await expect(page.getByText('Start a new animation batch').first()).toBeVisible({ timeout: 10_000 })

    // Primary entry points (Phase C item #4)
    await expect(page.getByRole('button', { name: /Upload images/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Browse gallery/i }).first()).toBeVisible()

    // Shortcut hints (Phase C item #4 — Ctrl+V was previously invisible)
    await expect(page.getByText(/to paste/i).first()).toBeVisible()
    await expect(page.getByText(/Drag & drop files anywhere/i).first()).toBeVisible()
    await expect(page.getByText(/Multi-shot prompts supported/i).first()).toBeVisible()

    await page.screenshot({ path: 'test-results/phase-bc-empty-state.png', fullPage: true })
  })

  test('Clear All button appears in toolbar after adding shots via localStorage seed', async ({ page }) => {
    // Seed a shot config via localStorage so we don't need to actually upload.
    // This exercises the clear-all path (Phase C item #6) and data-shot-id attribute (item #11).
    await page.goto('/shot-animator')
    await page.waitForLoadState('networkidle')

    const seeded = await page.evaluate(() => {
      const config = {
        id: 'phase-bc-verify-1',
        imageUrl: 'https://placehold.co/512x288/1a1a1a/ffffff/png?text=Test+Shot',
        imageName: 'Test Shot',
        prompt: 'Camera dollies forward',
        duration: 4,
        aspectRatio: '16:9',
        generatedVideos: [],
      }
      const payload = {
        state: { shotConfigs: [config] },
        version: 1,
      }
      localStorage.setItem('shot-animator-store', JSON.stringify(payload))
      return true
    })
    expect(seeded).toBe(true)

    await page.reload()
    await page.waitForLoadState('networkidle')

    // data-shot-id is required for Alt+ArrowUp/Down keyboard reorder (Phase C item #11)
    await expect(page.locator('[data-shot-id="phase-bc-verify-1"]')).toBeVisible({ timeout: 10_000 })

    // Prompt Tips labeled button replaces old Info tooltip (Phase C item #7)
    await expect(page.getByRole('button', { name: /Prompt Tips/i }).first()).toBeVisible()

    // Clear All button (Phase C item #6) — shown when there's at least one shot
    const clearAll = page.getByRole('button', { name: /Clear All/i }).first()
    await expect(clearAll).toBeVisible()

    await page.screenshot({ path: 'test-results/phase-bc-with-shot.png', fullPage: true })
  })
})
