import { test, expect } from '@playwright/test'

test.describe('Storybook Wizard Flow Test', () => {
  test('test wizard step navigation', async ({ page }) => {
    // Navigate to main page
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find and click on the Storybook tab in sidebar
    const storybookTab = page.locator('text=Storybook').first()
    await storybookTab.click()
    await page.waitForTimeout(2000)

    // Dismiss any popups (like Token Store)
    const closeButton = page.locator('button:has-text("×"), button:has-text("Close"), [aria-label="Close"]').first()
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click()
      await page.waitForTimeout(500)
    }

    // Click outside modal to dismiss if still present
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Step 1: Character Setup
    await page.screenshot({ path: 'tests/screenshots/step1-character.png', fullPage: true })
    console.log('Step 1: Character Setup')

    // Check step indicator - look for the active step indicator
    const stepIndicator = await page.locator('[class*="step"]').all()
    console.log(`Found ${stepIndicator.length} step-related elements`)

    // Fill in character name
    const nameInput = page.locator('input[placeholder*="name" i]')
    await nameInput.fill('Emma')
    await page.waitForTimeout(500)

    // Click Continue
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1500)

    // Step 2: Category Selection
    await page.screenshot({ path: 'tests/screenshots/step2-category.png', fullPage: true })
    console.log('Step 2: Category Selection')

    // Check that we're on Category step
    const categoryTitle = page.locator('text=What should Emma learn')
    console.log('Category title visible:', await categoryTitle.isVisible())

    // Click on Narrative category
    await page.locator('text=Narrative').first().click()
    await page.waitForTimeout(500)

    // Click Continue
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1500)

    // Step 3: Topic Selection
    await page.screenshot({ path: 'tests/screenshots/step3-topic.png', fullPage: true })
    console.log('Step 3: Topic Selection')

    // Check that we're on Topic step
    const topicTitle = page.locator('text=Narrative for Emma')
    console.log('Topic title visible:', await topicTitle.isVisible())

    // Click on Kindness (should be available for age 5)
    await page.locator('text=Kindness').first().click()
    await page.waitForTimeout(500)

    // Click Continue
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1500)

    // Dismiss Token Store popup if it appears
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Step 4: Book Settings
    await page.screenshot({ path: 'tests/screenshots/step4-settings.png', fullPage: true })
    console.log('Step 4: Book Settings')

    // Check that we're on Settings step
    const settingsTitle = page.locator('text=Configure Your Book')
    console.log('Settings title visible:', await settingsTitle.isVisible())

    // Select page count 6
    const pageCount6 = page.getByRole('button', { name: '6' }).first()
    if (await pageCount6.isVisible()) {
      await pageCount6.click()
    }

    // Select 2 sentences per page
    const sentences2 = page.locator('button:has-text("2")').first()
    if (await sentences2.isVisible()) {
      await sentences2.click()
    }

    await page.screenshot({ path: 'tests/screenshots/step4-configured.png', fullPage: true })

    // Look for "Generate 4 Story Ideas" button and click it
    const generateBtn = page.getByRole('button', { name: /generate.*story.*ideas/i })
    if (await generateBtn.isVisible()) {
      console.log('Clicking Generate 4 Story Ideas...')
      await generateBtn.click()

      // Wait for API call - this may take a while
      await page.waitForTimeout(20000)
    }

    // Dismiss any popup that might appear
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1000)

    // Step 5: Story Approach
    await page.screenshot({ path: 'tests/screenshots/step5-approach.png', fullPage: true })
    console.log('Step 5: Story Approach')

    // Check for story idea cards
    const pageContent = await page.content()
    console.log('Page contains "Choose Your Story":', pageContent.includes('Choose Your Story'))

    // Look for approach selection
    const approachTitle = page.locator('text=Choose Your Story')
    if (await approachTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Successfully reached Story Approach step!')

      // Click on first story card
      const storyCard = page.locator('[class*="card"]').first()
      if (await storyCard.isVisible()) {
        await storyCard.click()
        console.log('Clicked on story card, waiting for generation...')
        await page.waitForTimeout(30000) // Story generation takes time
      }
    }

    // Final screenshots
    await page.screenshot({ path: 'tests/screenshots/wizard-final.png', fullPage: true })
    console.log('Final screenshot taken')

    // Summary of step flow
    console.log('\n=== WIZARD FLOW SUMMARY ===')
    console.log('Step 1: Character Setup - Name, Age, Photo')
    console.log('Step 2: Category Selection - 6 educational categories')
    console.log('Step 3: Topic Selection - Age-filtered topics')
    console.log('Step 4: Book Settings - Page count, Sentences per page')
    console.log('Step 5: Story Approach - 4 AI-generated story ideas')
    console.log('Step 6: Review - Edit generated story')
    console.log('===========================\n')
  })
})
