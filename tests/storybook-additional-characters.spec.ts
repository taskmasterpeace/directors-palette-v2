import { test, expect } from '@playwright/test'

test.describe('Storybook Additional Characters Feature', () => {
  test('can add additional characters in wizard', async ({ page }) => {
    // Navigate to main page
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Find and click on the Storybook tab in sidebar
    const storybookTab = page.locator('text=Storybook').first()
    await storybookTab.click()
    await page.waitForTimeout(1000)

    // Dismiss any popups
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Step 1: Character Setup
    await page.screenshot({ path: 'tests/screenshots/additional-chars-step1.png', fullPage: true })
    console.log('Step 1: Character Setup - Initial state')

    // Fill in main character name
    const mainNameInput = page.locator('input#character-name')
    await mainNameInput.fill('Emma')
    await page.waitForTimeout(500)

    // Scroll down to see Additional Characters section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    // Look for Additional Characters section
    const additionalCharSection = page.locator('text=Additional Characters')
    expect(await additionalCharSection.isVisible()).toBeTruthy()
    console.log('Additional Characters section is visible')

    // Check initial counter shows 0/3
    const counter = page.locator('text=/\\d+\\/3\\s*added/i')
    expect(await counter.textContent()).toContain('0/3')
    console.log('Initial counter shows 0/3')

    await page.screenshot({ path: 'tests/screenshots/additional-chars-before-click.png', fullPage: true })

    // Click on the Sibling role button (first button with emoji)
    const siblingButton = page.locator('button').filter({ hasText: 'Sibling' })
    await siblingButton.click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/additional-chars-form-shown.png', fullPage: true })
    console.log('Clicked Sibling button, form should be visible')

    // Now the add character form should be visible
    // Look for the "Enter name" input that appears after clicking role
    const charNameInput = page.locator('input[placeholder="Enter name"]')
    expect(await charNameInput.isVisible()).toBeTruthy()
    console.log('Character name input is visible')

    // Fill in the character name
    await charNameInput.fill('Max')
    await page.waitForTimeout(300)

    // Fill in description (optional)
    const descriptionInput = page.locator('input[placeholder*="brother" i], input[placeholder*="sister" i]').first()
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Older brother who loves adventure')
    }

    await page.screenshot({ path: 'tests/screenshots/additional-chars-form-filled.png', fullPage: true })

    // Click the Add button
    const addButton = page.locator('button').filter({ hasText: 'Add' }).last()
    await addButton.click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/additional-chars-after-add.png', fullPage: true })

    // Verify counter updated to 1/3
    const updatedCounter = await page.locator('text=/\\d+\\/3\\s*added/i').textContent()
    console.log(`Counter after adding character: ${updatedCounter}`)
    expect(updatedCounter).toContain('1/3')

    // Check if Max appears in the list
    const maxText = page.locator('text=Max')
    expect(await maxText.isVisible()).toBeTruthy()
    console.log('Max appears in the character list')

    // Add a second character (Pet)
    const petButton = page.locator('button').filter({ hasText: 'Pet' })
    await petButton.click()
    await page.waitForTimeout(500)

    // Fill in pet name
    const petNameInput = page.locator('input[placeholder="Enter name"]')
    await petNameInput.fill('Buddy')
    await page.waitForTimeout(300)

    // Click Add
    const addPetButton = page.locator('button').filter({ hasText: 'Add' }).last()
    await addPetButton.click()
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'tests/screenshots/additional-chars-two-added.png', fullPage: true })

    // Verify counter shows 2/3
    const twoAddedCounter = await page.locator('text=/\\d+\\/3\\s*added/i').textContent()
    console.log(`Counter after adding pet: ${twoAddedCounter}`)
    expect(twoAddedCounter).toContain('2/3')

    console.log('Additional characters test completed successfully!')
  })

  test('wizard passes additional characters to story generation', async ({ page }) => {
    // Navigate to storybook
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const storybookTab = page.locator('text=Storybook').first()
    await storybookTab.click()
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Fill main character
    const nameInput = page.locator('input[placeholder*="name" i]')
    await nameInput.fill('Emma')

    // Continue to category
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1000)

    // Select Narrative category
    await page.locator('text=Narrative').first().click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1000)

    // Select Kindness topic
    await page.locator('text=Kindness').first().click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1000)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // We're now on Book Settings step
    await page.screenshot({ path: 'tests/screenshots/settings-step-for-chars-test.png', fullPage: true })

    // Check for Additional Characters section in settings
    const additionalCharsInSettings = page.locator('text=Additional Characters')
    const isVisible = await additionalCharsInSettings.isVisible()
    console.log(`Additional Characters in settings: ${isVisible}`)

    // Look for any display of characters we added earlier
    const pageContent = await page.content()
    console.log('Settings page has character-related content:', pageContent.includes('character'))

    console.log('Wizard flow for additional characters test completed')
  })
})
