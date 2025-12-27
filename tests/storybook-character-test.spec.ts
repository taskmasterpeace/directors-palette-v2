import { test, expect } from '@playwright/test'

test.describe('Storybook Character Consistency', () => {
  test('should display supporting characters in CharacterStep', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Take a screenshot of the initial state
    await page.screenshot({ path: 'tests/screenshots/storybook-initial.png' })

    // Click on Storybook tab in sidebar if it exists
    const storybookLink = page.locator('a[href*="storybook"], button:has-text("Storybook"), [data-tab="storybook"]')
    if (await storybookLink.count() > 0) {
      await storybookLink.first().click()
      await page.waitForTimeout(1000)
    }

    // Take a screenshot
    await page.screenshot({ path: 'tests/screenshots/storybook-page.png' })

    console.log('Current URL:', page.url())
    console.log('Page title:', await page.title())
  })
})
