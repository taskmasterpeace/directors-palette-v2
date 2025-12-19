import { test, expect } from '@playwright/test'

test.describe('Credits Purchase Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
  })

  test('view purchase dialog on desktop - full screen', async ({ page }) => {
    // Set viewport to full HD desktop
    await page.setViewportSize({ width: 1920, height: 1080 })

    // Look for the tokens button in the sidebar - it has "tokens" text and a "+" icon
    // Use the specific button structure from CreditsDisplay component
    const tokensButton = page.locator('button').filter({ hasText: /^\d+\s*tokens\s*$/ }).first()

    // Alternative: look for the button with the Sparkles icon and tokens text
    const altTokensButton = page.getByRole('button', { name: /tokens/ }).first()

    const button = await tokensButton.isVisible({ timeout: 3000 }) ? tokensButton : altTokensButton

    if (await button.isVisible({ timeout: 5000 })) {
      await button.click()

      // Wait for dialog to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

      // Wait a bit for animations and package loading
      await page.waitForTimeout(2000)

      // Take a screenshot
      await page.screenshot({
        path: 'public/test-outputs/credits-dialog-desktop.png',
        fullPage: false
      })

      console.log('Desktop screenshot saved to public/test-outputs/credits-dialog-desktop.png')

      // Keep dialog open for viewing
      await page.waitForTimeout(5000)
    } else {
      console.log('Tokens button not found - user may not be logged in')
      await page.screenshot({
        path: 'public/test-outputs/credits-dialog-desktop-not-logged-in.png',
        fullPage: true
      })
    }
  })

  test('view purchase dialog on mobile', async ({ page }) => {
    // Set viewport to iPhone 14 Pro size
    await page.setViewportSize({ width: 393, height: 852 })

    // Wait for page to stabilize
    await page.waitForTimeout(1000)

    // On mobile, there's a floating red logo button in the top-right corner
    // It has classes: fixed top-3 right-3 h-12 w-12 rounded-full bg-red-600/90
    const menuButton = page.locator('button.fixed.rounded-full').first()

    if (await menuButton.isVisible({ timeout: 3000 })) {
      await menuButton.click()
      // Wait for sheet to slide in
      await page.waitForTimeout(800)
    }

    // Look for the tokens button in the mobile sheet
    const tokensButton = page.getByRole('button', { name: /tokens/ }).first()

    if (await tokensButton.isVisible({ timeout: 5000 })) {
      await tokensButton.click()

      // Wait for dialog to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 })

      // Wait a bit for animations and package loading
      await page.waitForTimeout(2000)

      // Take a screenshot
      await page.screenshot({
        path: 'public/test-outputs/credits-dialog-mobile.png',
        fullPage: false
      })

      console.log('Mobile screenshot saved to public/test-outputs/credits-dialog-mobile.png')

      // Keep dialog open for viewing
      await page.waitForTimeout(3000)
    } else {
      console.log('Tokens button not found on mobile - user may not be logged in')
      await page.screenshot({
        path: 'public/test-outputs/credits-dialog-mobile-not-logged-in.png',
        fullPage: true
      })
    }
  })
})
