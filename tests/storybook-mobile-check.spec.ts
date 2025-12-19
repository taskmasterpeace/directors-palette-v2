import { test } from '@playwright/test'

/**
 * Quick mobile view check for storybook wizard
 * Captures screenshots of each step to verify mobile layout with diverse background images
 */
test.describe('Storybook Mobile View', () => {
  test.use({
    storageState: 'tests/.auth/user.json',
    viewport: { width: 390, height: 844 } // iPhone 14 Pro
  })

  test('check mobile layout', async ({ page }) => {
    // Navigate directly to storybook (sidebar is hidden on mobile)
    await page.goto('/?tab=storybook')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Dismiss any popups
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Screenshot Step 1: Character Setup
    await page.screenshot({ path: 'tests/screenshots/mobile-step1-character.png', fullPage: true })
    console.log('Step 1: Character Setup - captured')

    // Fill name and continue
    const nameInput = page.locator('input[placeholder*="name" i]')
    if (await nameInput.isVisible()) {
      await nameInput.fill('Maya')
    }
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1000)

    // Screenshot Step 2: Category
    await page.screenshot({ path: 'tests/screenshots/mobile-step2-category.png', fullPage: true })
    console.log('Step 2: Category - captured')

    // Select Science
    await page.locator('text=Science').first().click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1000)

    // Screenshot Step 3: Topic
    await page.screenshot({ path: 'tests/screenshots/mobile-step3-topic.png', fullPage: true })
    console.log('Step 3: Topic - captured')

    // Select Animals
    await page.locator('text=Animals').first().click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1000)

    // Screenshot Step 4: Book Settings
    await page.screenshot({ path: 'tests/screenshots/mobile-step4-settings.png', fullPage: true })
    console.log('Step 4: Book Settings - captured')

    // Scroll down to see more
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/mobile-step4-settings-scrolled.png', fullPage: true })
    console.log('Step 4: Book Settings (scrolled) - captured')

    console.log('\nMobile screenshots saved to tests/screenshots/mobile-*.png')
  })
})
