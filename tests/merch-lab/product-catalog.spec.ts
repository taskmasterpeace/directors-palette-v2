import { test, expect } from '@playwright/test'
import { goToMerchLab } from './helpers'

test.describe('Merch Lab: Product Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await goToMerchLab(page)
  })

  test('shows 3 category tabs', async ({ page }) => {
    // Category tab buttons inside the Merch Lab panel
    await expect(page.locator('button', { hasText: 'Apparel' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Wall Art' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Accessories' }).first()).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/category-tabs.png' })
  })

  test('Apparel tab shows correct products', async ({ page }) => {
    // Apparel is default tab — look for product buttons inside the grid
    await expect(page.locator('button', { hasText: 'T-Shirt' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'Hoodie' }).first()).toBeVisible()
    await expect(page.locator('button', { hasText: 'AOP T-Shirt' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'AOP Hoodie' })).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/tab-apparel.png' })
  })

  test('Wall Art tab shows Poster, Canvas Print, Puzzle', async ({ page }) => {
    await page.locator('button', { hasText: 'Wall Art' }).first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('button', { hasText: 'Poster' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Canvas Print' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Puzzle' })).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/tab-wall-art.png' })
  })

  test('Accessories tab shows Mug, Stickers, AOP Backpack', async ({ page }) => {
    await page.locator('button', { hasText: 'Accessories' }).first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('button', { hasText: 'Mug 11oz' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Stickers' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'AOP Backpack' })).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/tab-accessories.png' })
  })

  test('selecting Poster hides color picker and design style picker', async ({ page }) => {
    await page.locator('button', { hasText: 'Wall Art' }).first().click()
    await page.waitForTimeout(500)
    await page.locator('button', { hasText: 'Poster' }).click()
    await page.waitForTimeout(2000)

    // Color picker heading should NOT be visible
    await expect(page.locator('text=2. Product Color')).not.toBeVisible()

    // Design style heading should NOT be visible
    await expect(page.locator('text=3. Design Style')).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/poster-selected.png' })
  })

  test('selecting T-Shirt shows color picker and design style picker', async ({ page }) => {
    // T-Shirt is default product on Apparel tab
    await page.locator('button', { hasText: /^T-Shirt$/ }).first().click()
    await page.waitForTimeout(3000) // Wait for variants to load from Printify

    await expect(page.locator('text=2. Product Color')).toBeVisible()
    await expect(page.locator('text=3. Design Style')).toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/tshirt-selected.png' })
  })

  test('AOP products have AOP badge', async ({ page }) => {
    // Apparel tab is default, AOP products should have badge text
    const aopBadges = page.locator('.text-cyan-400:has-text("AOP")')
    await expect(aopBadges.first()).toBeVisible()
  })
})
