import { test, expect } from '@playwright/test'

/**
 * Storybook Visual Inspection Test
 *
 * Walks through the Storybook wizard taking screenshots at each step.
 * Uses Generate mode (13-step wizard).
 */

test.describe('Storybook Visual Inspection', () => {
  test('wizard flow walkthrough', async ({ page }) => {
    test.setTimeout(120000)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to Storybook via sidebar
    const storybookNav = page.locator('button:has-text("Storybook")')
    if (await storybookNav.count() > 0) {
      await storybookNav.first().click()
    }
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/storybook-01-landing.png', fullPage: false })

    // Check if we're on the storybook wizard
    // The wizard should show character setup or a mode selector
    const characterSetup = page.getByText('Main Character')
    const modeSelector = page.getByText('Generate')

    if (await modeSelector.count() > 0) {
      // Click Generate mode
      await modeSelector.first().click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'tests/screenshots/storybook-02-mode-selected.png', fullPage: false })
    }

    // Character Setup Step
    if (await characterSetup.count() > 0) {
      await page.screenshot({ path: 'tests/screenshots/storybook-03-character-setup.png', fullPage: false })
    }

    // Check for the wizard top nav / step progress
    const topNav = page.locator('[class*="WizardTopNav"], [class*="flex"][class*="items-center"]').first()
    await page.screenshot({ path: 'tests/screenshots/storybook-04-wizard-nav.png', fullPage: false })

    // Check the sidebar sub-menu for wizard steps
    const sidebarSteps = page.locator('[class*="WizardStepsSubMenu"], [class*="submenu"]')
    if (await sidebarSteps.count() > 0) {
      await page.screenshot({ path: 'tests/screenshots/storybook-05-sidebar-steps.png', fullPage: false })
    }

    // Try to check if there's an existing project loaded
    const projectName = page.locator('[class*="project-name"], h1, h2').first()

    // Look for New / Load buttons
    const newButton = page.getByRole('button', { name: /New/i })
    const loadButton = page.getByRole('button', { name: /Load|Open/i })

    if (await newButton.count() > 0) {
      await page.screenshot({ path: 'tests/screenshots/storybook-06-project-actions.png', fullPage: false })
    }

    // Scroll the main content to see full wizard step
    const mainContent = page.locator('.overflow-auto, main').first()
    if (await mainContent.count() > 0) {
      await mainContent.evaluate(el => el.scrollTop = el.scrollHeight / 2)
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/storybook-07-scrolled.png', fullPage: false })

      await mainContent.evaluate(el => el.scrollTop = el.scrollHeight)
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/storybook-08-bottom.png', fullPage: false })
    }

    // Try clicking Next if available
    const nextBtn = page.getByRole('button', { name: /Next|Continue/i })
    if (await nextBtn.count() > 0 && await nextBtn.first().isEnabled()) {
      await nextBtn.first().click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'tests/screenshots/storybook-09-next-step.png', fullPage: false })

      // Take another step if possible
      if (await nextBtn.count() > 0 && await nextBtn.first().isEnabled()) {
        await nextBtn.first().click()
        await page.waitForTimeout(1000)
        await page.screenshot({ path: 'tests/screenshots/storybook-10-step-3.png', fullPage: false })
      }
    }

    console.log('Storybook visual inspection complete!')
  })
})
