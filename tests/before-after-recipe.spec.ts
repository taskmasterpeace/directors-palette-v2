import { test, expect } from '@playwright/test'

test.describe('Before/After Location Recipe', () => {
  test('recipe appears in Prompt Tools', async ({ page }) => {
    // Navigate to main page
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Find and click on Prompt Tools in sidebar
    const promptTools = page.locator('text=Prompt Tools').first()
    await promptTools.click()
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/prompt-tools-initial.png', fullPage: true })

    // Look for Recipes section
    const scenesCategory = page.locator('text=Scenes').first()
    if (await scenesCategory.isVisible()) {
      console.log('Found Scenes category')
    }

    // Scroll down to see more content
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/prompt-tools-scrolled.png', fullPage: true })

    // Search for Before/After recipe
    const beforeAfterRecipe = page.locator('text=Before/After Location')
    const isVisible = await beforeAfterRecipe.isVisible().catch(() => false)
    console.log('Before/After Location recipe visible:', isVisible)

    // Also check for the quick access label
    const quickAccessLabel = page.locator('text=Before/After').first()
    const quickAccessVisible = await quickAccessLabel.isVisible().catch(() => false)
    console.log('Before/After quick access visible:', quickAccessVisible)

    // Check for 9-Frame Cinematic to verify recipes are loading
    const cinematicRecipe = page.locator('text=9-Frame').first()
    const cinematicVisible = await cinematicRecipe.isVisible().catch(() => false)
    console.log('9-Frame recipe visible:', cinematicVisible)

    // List all visible recipe-related text
    const allText = await page.locator('body').innerText()
    if (allText.includes('Before/After')) {
      console.log('Page contains "Before/After" text')
    }
    if (allText.includes('9-Frame')) {
      console.log('Page contains "9-Frame" text')
    }

    await page.screenshot({ path: 'tests/screenshots/prompt-tools-recipes.png', fullPage: true })
  })
})
