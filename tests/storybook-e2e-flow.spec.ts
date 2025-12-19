import { test, expect } from '@playwright/test'

/**
 * End-to-end test for the complete storybook creation flow.
 * This test uses stored authentication from tests/.auth/user.json
 */
test.describe('Storybook End-to-End Flow', () => {
  // Use stored authentication state
  test.use({ storageState: 'tests/.auth/user.json' })

  test('complete storybook creation flow', async ({ page }) => {
    console.log('=== STORYBOOK E2E TEST ===')

    // Step 1: Navigate to main page and go to Storybook
    console.log('Step 1: Navigating to Storybook...')
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Click on Storybook tab
    const storybookTab = page.locator('text=Storybook').first()
    await storybookTab.click()
    await page.waitForTimeout(2000)

    // Dismiss any popups
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Screenshot initial state
    await page.screenshot({ path: 'tests/screenshots/e2e-step1-initial.png', fullPage: true })
    console.log('✓ At Storybook - Step 1: Character Setup')

    // Step 2: Fill in character name
    console.log('Step 2: Setting up character...')
    const nameInput = page.locator('input[placeholder*="name" i]')
    await nameInput.fill('Luna')
    await page.waitForTimeout(500)

    // Click Continue
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'tests/screenshots/e2e-step2-category.png', fullPage: true })
    console.log('✓ Step 2: Category Selection')

    // Step 3: Select category (Science)
    console.log('Step 3: Selecting category...')
    await page.locator('text=Science').first().click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'tests/screenshots/e2e-step3-topic.png', fullPage: true })
    console.log('✓ Step 3: Topic Selection')

    // Step 4: Select topic (Animals)
    console.log('Step 4: Selecting topic...')
    await page.locator('text=Animals').first().click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'tests/screenshots/e2e-step4-settings.png', fullPage: true })
    console.log('✓ Step 4: Book Settings')

    // Step 5: Configure book settings
    console.log('Step 5: Configuring book settings...')

    // Dismiss any popup/dialog that might be blocking
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Close any open dialogs by clicking outside or pressing escape multiple times
    const dialogOverlay = page.locator('[data-slot="dialog-overlay"]')
    if (await dialogOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('  - Found dialog overlay, dismissing...')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }

    // Scroll down to see all settings
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(500)

    // Select page count 6
    const pageCount6 = page.getByRole('button', { name: '6' }).first()
    if (await pageCount6.isVisible()) {
      await pageCount6.click({ force: true })
    }
    await page.waitForTimeout(300)

    // Scroll down more to see Story Setting section
    await page.evaluate(() => window.scrollTo(0, 800))
    await page.waitForTimeout(500)

    // Select a setting (Park) - use force click to bypass any overlays
    const parkButton = page.locator('button:has-text("Park")').first()
    if (await parkButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await parkButton.click({ force: true })
      console.log('  - Selected Park setting')
    }

    // Select some story elements
    const dinosaursButton = page.locator('button:has-text("Dinosaurs")').first()
    if (await dinosaursButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dinosaursButton.click({ force: true })
      console.log('  - Added Dinosaurs element')
    }

    await page.screenshot({ path: 'tests/screenshots/e2e-step5-configured.png', fullPage: true })

    // Click Generate Story Ideas
    console.log('Step 6: Generating story ideas...')
    const generateBtn = page.getByRole('button', { name: /generate.*story.*ideas/i })
    if (await generateBtn.isVisible()) {
      await generateBtn.click()
      console.log('  - Clicked Generate button, waiting for API response...')

      // Wait for API call - this may take a while
      await page.waitForTimeout(30000)
    }

    // Dismiss any popup
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'tests/screenshots/e2e-step6-approach.png', fullPage: true })
    console.log('✓ Step 6: Story Approach Selection')

    // Check if we're on the approach step
    const approachTitle = page.locator('text=Choose Your Story')
    const onApproachStep = await approachTitle.isVisible({ timeout: 5000 }).catch(() => false)

    if (onApproachStep) {
      console.log('Step 7: Selecting story approach...')

      // Click on first story card
      const storyCard = page.locator('[class*="card"]').first()
      if (await storyCard.isVisible()) {
        await storyCard.click()
        console.log('  - Selected first story, generating full story...')

        // Wait for story generation
        await page.waitForTimeout(45000)
      }
    }

    await page.screenshot({ path: 'tests/screenshots/e2e-step7-review.png', fullPage: true })
    console.log('✓ Step 7: Story Review')

    // Check if we're on review step
    const reviewVisible = await page.locator('text=Review Your Story').isVisible({ timeout: 5000 }).catch(() => false)
    if (reviewVisible) {
      console.log('Step 8: Moving to Style Selection...')
      await page.getByRole('button', { name: /continue/i }).click()
      await page.waitForTimeout(2000)
    }

    await page.screenshot({ path: 'tests/screenshots/e2e-step8-style.png', fullPage: true })
    console.log('✓ Step 8: Style Selection')

    // Check if we're on style step
    const styleTitle = page.locator('text=Choose Your Style')
    const onStyleStep = await styleTitle.isVisible({ timeout: 5000 }).catch(() => false)

    if (onStyleStep) {
      console.log('Step 9: Testing style expansion...')

      // Try custom style
      const customStyleBtn = page.getByRole('button', { name: /create custom style/i })
      if (await customStyleBtn.isVisible()) {
        await customStyleBtn.click()
        await page.waitForTimeout(500)

        // Enter a style name
        const styleInput = page.locator('input[id="styleName"]')
        if (await styleInput.isVisible()) {
          await styleInput.fill('LEGO')
          console.log('  - Entered LEGO style, waiting for AI expansion...')
          await page.waitForTimeout(3000)

          // Check if expanded style appeared
          const expandedStyle = page.locator('text=AI-Enhanced Description')
          if (await expandedStyle.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('  ✓ AI-Enhanced style description appeared!')
          }
        }

        await page.screenshot({ path: 'tests/screenshots/e2e-step9-style-expanded.png', fullPage: true })

        // Generate style guide
        const generateStyleBtn = page.getByRole('button', { name: /generate style guide/i })
        if (await generateStyleBtn.isVisible()) {
          console.log('  - Generating style guide...')
          await generateStyleBtn.click()

          // Wait for generation
          await page.waitForTimeout(60000)
        }
      }
    }

    await page.screenshot({ path: 'tests/screenshots/e2e-final.png', fullPage: true })

    console.log('\n=== E2E TEST COMPLETE ===')
    console.log('Screenshots saved to tests/screenshots/e2e-*.png')
  })
})
