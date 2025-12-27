import { test, expect } from '@playwright/test'

test.describe('Storybook Character Consistency - Interactive', () => {
  test('explore storybook character step', async ({ page }) => {
    // Navigate to the app - use port 3002 as 3000 is in use
    await page.goto('http://localhost:3002')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    console.log('Looking for Storybook in sidebar...')

    // Take a screenshot of the initial state
    await page.screenshot({ path: 'tests/screenshots/01-home.png', fullPage: true })

    // Look for Storybook link in sidebar navigation
    // The sidebar has items like "Storybook" as links or buttons
    const storybookButton = page.locator('text=Storybook').first()

    if (await storybookButton.count() > 0) {
      console.log('Found Storybook button, clicking...')
      await storybookButton.click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/02-storybook-tab.png', fullPage: true })
      console.log('Storybook tab opened')
    } else {
      console.log('Storybook button not found. Looking in sidebar...')
      // List all sidebar items
      const sidebarItems = await page.locator('aside button, aside a, nav button, nav a, [role="navigation"] button').all()
      console.log('Found', sidebarItems.length, 'sidebar items')
      for (const item of sidebarItems.slice(0, 20)) {
        const text = await item.textContent()
        console.log('Sidebar item:', text?.trim().substring(0, 50))
        if (text?.toLowerCase().includes('storybook') || text?.toLowerCase().includes('children')) {
          console.log('Clicking:', text)
          await item.click()
          await page.waitForTimeout(2000)
          break
        }
      }
    }

    // Take screenshot of current state
    await page.screenshot({ path: 'tests/screenshots/03-storybook-view.png', fullPage: true })

    // Check if we see storybook content
    const pageContent = await page.locator('body').textContent()
    console.log('Page content preview:', pageContent?.substring(0, 800))

    // Look for wizard steps or character setup
    const characterElements = await page.locator('text=Character').count()
    console.log('Found', characterElements, 'elements with "Character" text')

    // Keep browser open for manual inspection
    console.log('\n=== Browser will stay open for 60 seconds ===')
    console.log('Navigate to the Character step in the storybook wizard to test the new functionality.')
    console.log('Look for supporting characters with purple badges and "Generate from Description" buttons.')
    await page.waitForTimeout(60000)
  })
})
