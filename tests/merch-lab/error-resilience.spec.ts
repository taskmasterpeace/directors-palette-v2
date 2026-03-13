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

test.describe('Merch Lab: Error Resilience', () => {
  test('rapid product switching shows no crash or stale UI', async ({ page }) => {
    await goToMerchLab(page)

    // Rapidly switch between products across tabs
    await page.getByRole('button', { name: 'T-Shirt' }).first().click()
    await page.waitForTimeout(200)

    await page.getByRole('button', { name: 'Wall Art' }).click()
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Poster' }).click()
    await page.waitForTimeout(200)

    await page.getByRole('button', { name: 'Accessories' }).click()
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: 'Mug 11oz' }).click()
    await page.waitForTimeout(200)

    // No error banner visible
    const errorBanner = page.locator('.bg-red-500\\/10')
    await expect(errorBanner).not.toBeVisible()

    // Canvas should still be visible
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/rapid-switch-final.png' })
  })

  test('canvas preview is always visible before design generation', async ({ page }) => {
    await goToMerchLab(page)

    // Select a product
    await page.getByRole('button', { name: 'T-Shirt' }).first().click()
    await page.waitForTimeout(1000)

    // Canvas should be rendered
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // "Your design appears here" placeholder should show
    const placeholder = page.locator('text=Your design appears here')
    await expect(placeholder).toBeVisible()
  })

  test('pipeline stepper shows step 1 before color selection', async ({ page }) => {
    await goToMerchLab(page)

    // Stepper should show step 1 active
    const step1 = page.locator('text=Pick Product')
    await expect(step1).toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/stepper-step1.png' })
  })
})
