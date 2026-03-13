import { test, expect } from '@playwright/test'

async function goToMerchLab(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

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

test.describe('Merch Lab: Mug and Sticker Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await goToMerchLab(page)
  })

  test('Mug shows color picker, hides design style', async ({ page }) => {
    await page.getByRole('button', { name: 'Accessories' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Mug 11oz' }).click()
    await page.waitForTimeout(1500)

    // Color picker visible for mugs
    const colorHeader = page.locator('text=2. Product Color')
    await expect(colorHeader).toBeVisible()

    // Design style hidden (wrap is the only option)
    const styleHeader = page.locator('text=3. Design Style')
    await expect(styleHeader).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/mug-selected.png' })
  })

  test('Stickers hides color picker', async ({ page }) => {
    await page.getByRole('button', { name: 'Accessories' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Stickers' }).click()
    await page.waitForTimeout(1500)

    // Color picker hidden for stickers
    const colorHeader = page.locator('text=2. Product Color')
    await expect(colorHeader).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/stickers-selected.png' })
  })

  test('AOP Backpack has no color or design style picker', async ({ page }) => {
    await page.getByRole('button', { name: 'Accessories' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'AOP Backpack' }).click()
    await page.waitForTimeout(1500)

    const colorHeader = page.locator('text=2. Product Color')
    await expect(colorHeader).not.toBeVisible()

    const styleHeader = page.locator('text=3. Design Style')
    await expect(styleHeader).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/backpack-selected.png' })
  })
})
