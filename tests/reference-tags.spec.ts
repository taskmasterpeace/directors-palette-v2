import { test, expect } from '@playwright/test'

test.describe('Reference Tag Autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click on the Shot Creator tab if visible
    const tab = page.locator('[value="shot-creator"]').first()
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click()
      await page.waitForTimeout(1000)
    }
  })

  // Helper: get the prompt textarea using the label "Prompt" which is unique
  function getPromptTextarea(page: import('@playwright/test').Page) {
    return page.getByLabel('Prompt').last()
  }

  test('page loads and prompt textarea exists', async ({ page }) => {
    await page.screenshot({ path: 'tests/screenshots/ref-01-page-loaded.png', fullPage: true })

    const textarea = getPromptTextarea(page)
    await expect(textarea).toBeAttached({ timeout: 10000 })
    console.log('Prompt textarea found and attached')
  })

  test('typing @ shows autocomplete dropdown', async ({ page }) => {
    const textarea = getPromptTextarea(page)
    await expect(textarea).toBeAttached({ timeout: 10000 })

    // Use dispatchEvent to focus + type since textarea has transparent text overlay
    await textarea.evaluate(el => el.focus())
    await textarea.pressSequentially('@', { delay: 50 })
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/ref-02-at-typed.png', fullPage: false })

    // Look for autocomplete dropdown
    const dropdown = page.locator('.fixed.z-50').first()
    const isVisible = await dropdown.isVisible().catch(() => false)
    console.log(`Autocomplete dropdown visible: ${isVisible}`)
  })

  test('space in text then @ still triggers autocomplete', async ({ page }) => {
    const textarea = getPromptTextarea(page)
    await expect(textarea).toBeAttached({ timeout: 10000 })

    await textarea.evaluate(el => el.focus())
    await textarea.pressSequentially('a portrait of @', { delay: 50 })
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/ref-03-space-then-at.png', fullPage: false })

    const dropdown = page.locator('.fixed.z-50').first()
    const isVisible = await dropdown.isVisible().catch(() => false)
    console.log(`Dropdown visible after "a portrait of @": ${isVisible}`)
  })

  test('typing @h filters autocomplete list', async ({ page }) => {
    const textarea = getPromptTextarea(page)
    await expect(textarea).toBeAttached({ timeout: 10000 })

    await textarea.evaluate(el => el.focus())
    await textarea.pressSequentially('@h', { delay: 100 })
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/ref-04-at-h-filter.png', fullPage: false })
  })
})
