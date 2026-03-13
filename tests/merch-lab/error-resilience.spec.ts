import { test, expect } from '@playwright/test'
import { goToMerchLab } from './helpers'

test.describe('Merch Lab: Error Resilience', () => {
  test('rapid product switching shows no crash or stale UI', async ({ page }) => {
    await goToMerchLab(page)

    // Rapidly switch between products across tabs
    await page.locator('button', { hasText: /^T-Shirt$/ }).first().click()
    await page.waitForTimeout(300)

    await page.locator('button', { hasText: 'Wall Art' }).first().click()
    await page.waitForTimeout(200)
    await page.locator('button', { hasText: 'Poster' }).click()
    await page.waitForTimeout(300)

    await page.locator('button', { hasText: 'Accessories' }).first().click()
    await page.waitForTimeout(200)
    await page.locator('button', { hasText: 'Mug 11oz' }).click()
    await page.waitForTimeout(500)

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

    // Select T-Shirt
    await page.locator('button', { hasText: /^T-Shirt$/ }).first().click()
    await page.waitForTimeout(1000)

    // Canvas should be rendered
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()

    // "Your design appears here" placeholder should show
    await expect(page.locator('text=Your design appears here')).toBeVisible()
  })

  test('pipeline stepper is visible', async ({ page }) => {
    await goToMerchLab(page)

    // Stepper should show step labels
    await expect(page.locator('text=Pick Product')).toBeVisible()
    await expect(page.locator('text=Create Design')).toBeVisible()
    await expect(page.getByText('Order', { exact: true }).first()).toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/stepper.png' })
  })
})
