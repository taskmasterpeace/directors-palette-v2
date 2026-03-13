import { test, expect } from '@playwright/test'
import { goToMerchLab } from './helpers'

test.describe('Merch Lab: Mug and Sticker Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await goToMerchLab(page)
  })

  test('Mug shows color picker, hides design style', async ({ page }) => {
    await page.locator('button', { hasText: 'Accessories' }).first().click()
    await page.waitForTimeout(500)
    await page.locator('button', { hasText: 'Mug 11oz' }).click()
    await page.waitForTimeout(2000)

    // Color picker visible for mugs
    await expect(page.locator('text=2. Product Color')).toBeVisible()

    // Design style hidden (wrap is the only option)
    await expect(page.locator('text=3. Design Style')).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/mug-selected.png' })
  })

  test('Stickers hides color picker', async ({ page }) => {
    await page.locator('button', { hasText: 'Accessories' }).first().click()
    await page.waitForTimeout(500)
    await page.locator('button', { hasText: 'Stickers' }).click()
    await page.waitForTimeout(2000)

    // Color picker hidden for stickers
    await expect(page.locator('text=2. Product Color')).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/stickers-selected.png' })
  })

  test('AOP Backpack has no color or design style picker', async ({ page }) => {
    await page.locator('button', { hasText: 'Accessories' }).first().click()
    await page.waitForTimeout(500)
    await page.locator('button', { hasText: 'AOP Backpack' }).click()
    await page.waitForTimeout(2000)

    await expect(page.locator('text=2. Product Color')).not.toBeVisible()
    await expect(page.locator('text=3. Design Style')).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/backpack-selected.png' })
  })
})
