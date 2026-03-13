import { test, expect } from '@playwright/test'

async function goToMerchLab(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Click Merch Lab in sidebar — try data attribute first, then evaluate store
  const navButton = page.locator('[data-tab-id="merch-lab"]').first()
  if (await navButton.count() > 0) {
    await navButton.click()
  } else {
    await page.evaluate(() => {
      const store = (window as any).__layoutStore
      if (store) store.getState().setActiveTab('merch-lab')
    })
  }
  await page.waitForTimeout(1500)
}

test.describe('Merch Lab: Product Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await goToMerchLab(page)
  })

  test('shows 3 category tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Apparel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wall Art' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accessories' })).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/category-tabs.png' })
  })

  test('Apparel tab shows correct products', async ({ page }) => {
    // Apparel is default tab
    await expect(page.getByRole('button', { name: 'T-Shirt' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Hoodie' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AOP T-Shirt' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AOP Hoodie' })).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/tab-apparel.png' })
  })

  test('Wall Art tab shows Poster, Canvas Print, Puzzle', async ({ page }) => {
    await page.getByRole('button', { name: 'Wall Art' }).click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: 'Poster' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Canvas Print' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Puzzle' })).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/tab-wall-art.png' })
  })

  test('Accessories tab shows Mug, Stickers, AOP Backpack', async ({ page }) => {
    await page.getByRole('button', { name: 'Accessories' }).click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: 'Mug 11oz' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stickers' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AOP Backpack' })).toBeVisible()
    await page.screenshot({ path: 'test-results/merch-lab/tab-accessories.png' })
  })

  test('selecting Poster hides color picker and design style picker', async ({ page }) => {
    await page.getByRole('button', { name: 'Wall Art' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Poster' }).click()
    await page.waitForTimeout(1500)

    // Color picker heading should NOT be visible
    const colorHeader = page.locator('text=2. Product Color')
    await expect(colorHeader).not.toBeVisible()

    // Design style heading should NOT be visible
    const styleHeader = page.locator('text=3. Design Style')
    await expect(styleHeader).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/poster-selected.png' })
  })

  test('selecting T-Shirt shows color picker and design style picker', async ({ page }) => {
    await page.getByRole('button', { name: 'T-Shirt' }).first().click()
    await page.waitForTimeout(2000) // Wait for variants to load

    const colorHeader = page.locator('text=2. Product Color')
    await expect(colorHeader).toBeVisible()

    const styleHeader = page.locator('text=3. Design Style')
    await expect(styleHeader).toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/tshirt-selected.png' })
  })

  test('AOP products have AOP badge', async ({ page }) => {
    // Apparel tab is default, AOP products should have badge
    const aopBadge = page.locator('span:has-text("AOP")').first()
    await expect(aopBadge).toBeVisible()
  })
})
