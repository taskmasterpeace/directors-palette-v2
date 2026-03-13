import type { Page } from '@playwright/test'

export async function goToMerchLab(page: Page) {
  await page.goto('/', { timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 30000 })
  await page.waitForTimeout(3000)

  // Click "Merch Lab" in the sidebar — it's a button with a span containing the text
  const merchButton = page.locator('button', { hasText: 'Merch Lab' }).first()
  await merchButton.click({ timeout: 15000 })
  await page.waitForTimeout(2000)
}
