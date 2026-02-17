import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Adhub v2 Flow
 *
 * Tests the 4-step wizard: Brand -> Product -> Create Ad -> Result
 * Verifies the new preset-based workflow with LLM copy extraction
 */

const BASE_URL = '/'

class AdhubPage {
  constructor(private page: Page) {}

  async navigateToAdhub() {
    await this.page.goto(BASE_URL)
    await this.page.waitForLoadState('networkidle')
    // Click on Adhub in the sidebar
    const adhubNav = this.page.locator('button:has-text("Adhub")')
    if (await adhubNav.count() > 0) {
      await adhubNav.first().click()
    }
    await this.page.waitForTimeout(1000)
  }

  /** Wait for the stepper to be visible by checking for the stepper area */
  async waitForStepperVisible() {
    // Wait for the stepper bar that contains step buttons
    await expect(this.page.getByRole('button', { name: 'Create Ad', exact: true })).toBeVisible({ timeout: 10000 })
  }

  /** Get the stepper area containing step buttons */
  get stepper() {
    return this.page.locator('.flex-shrink-0.border-b')
  }
}

test.describe('Adhub v2 Flow', () => {
  let adhub: AdhubPage

  test.beforeEach(async ({ page }) => {
    adhub = new AdhubPage(page)
    await adhub.navigateToAdhub()
  })

  test('should display 4-step stepper with correct labels', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // Verify all 4 step buttons are present in the stepper
    await expect(page.getByRole('button', { name: 'Brand', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Product', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Ad', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Result', exact: true })).toBeVisible()

    // Verify "How It Works" button exists
    await expect(page.getByRole('button', { name: /How It Works/i })).toBeVisible()
  })

  test('should start on brand selection step', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // Brand step should show brand selection UI
    await expect(page.getByRole('heading', { name: /Select a Brand/i })).toBeVisible()

    // Should have a create brand option
    await expect(page.getByText('Create Brand')).toBeVisible()
  })

  test('should show How Adhub Works flow guide on brand step', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // The flow guide should be present (collapsible section)
    const flowGuide = page.getByText('How Adhub Works')
    const flowGuideCount = await flowGuide.count()

    if (flowGuideCount > 0) {
      await flowGuide.first().click()
      await page.waitForTimeout(500)

      // Should describe the v2 flow
      await expect(page.getByText('Paste a description, AI extracts ad copy')).toBeVisible()
      await expect(page.getByText('Preset Template + Product Copy + Brand Context')).toBeVisible()
    }
  })

  test('should navigate to product step after selecting a brand', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // Check if there are existing brands to select
    const brandCards = page.locator('.grid .cursor-pointer').filter({
      has: page.locator('h3')
    })

    const brandCount = await brandCards.count()
    if (brandCount > 0) {
      // Click first existing brand
      await brandCards.first().click()
      await page.waitForTimeout(500)

      // Click Continue button
      const continueBtn = page.getByRole('button', { name: /Continue/i })
      if (await continueBtn.isEnabled()) {
        await continueBtn.click()
        await page.waitForTimeout(1000)

        // Should be on product step
        await expect(page.getByRole('heading', { name: /Select a Product/i })).toBeVisible()

        // Should have create product option
        await expect(page.getByText('Create Product')).toBeVisible()
      }
    }
  })

  test('should show product creation dialog', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // Navigate to product step by selecting a brand first
    const brandCards = page.locator('.grid .cursor-pointer').filter({
      has: page.locator('h3')
    })

    const brandCount = await brandCards.count()
    if (brandCount > 0) {
      await brandCards.first().click()
      await page.waitForTimeout(500)

      const continueBtn = page.getByRole('button', { name: /Continue/i })
      if (await continueBtn.isEnabled()) {
        await continueBtn.click()
        await page.waitForTimeout(1000)

        // Click Create Product
        await page.getByText('Create Product').click()
        await page.waitForTimeout(500)

        // Dialog should open with product form
        await expect(page.getByRole('heading', { name: /Create New Product/i })).toBeVisible()
        await expect(page.getByText('Product Name')).toBeVisible()
        await expect(page.getByText('Product Description')).toBeVisible()
        await expect(page.getByRole('button', { name: /Extract Ad Copy/i })).toBeVisible()
      }
    }
  })

  test('should navigate to preset step after selecting a product', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // Navigate to product step
    const brandCards = page.locator('.grid .cursor-pointer').filter({
      has: page.locator('h3')
    })

    const brandCount = await brandCards.count()
    if (brandCount > 0) {
      await brandCards.first().click()
      await page.waitForTimeout(500)

      const continueBtn = page.getByRole('button', { name: /Continue/i })
      if (await continueBtn.isEnabled()) {
        await continueBtn.click()
        await page.waitForTimeout(1000)

        // Check if there are existing products (skip dashed "Create Product" card)
        const productCards = page.locator('.grid > div.cursor-pointer').filter({
          has: page.locator('h3')
        })

        const productCount = await productCards.count()
        if (productCount > 0) {
          // Click first product
          await productCards.first().click()
          await page.waitForTimeout(500)

          const nextBtn = page.getByRole('button', { name: /Continue/i })
          if (await nextBtn.isEnabled()) {
            await nextBtn.click()
            await page.waitForTimeout(1000)

            // Should be on Create Ad step with preset options
            await expect(page.getByRole('heading', { name: /Create Your Ad/i })).toBeVisible()
          }
        }
      }
    }
  })

  test('should display 5 presets on the create ad step', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // Navigate through brand -> product -> preset step
    const brandCards = page.locator('.grid .cursor-pointer').filter({
      has: page.locator('h3')
    })

    const brandCount = await brandCards.count()
    if (brandCount > 0) {
      await brandCards.first().click()
      await page.waitForTimeout(500)

      let continueBtn = page.getByRole('button', { name: /Continue/i })
      if (await continueBtn.isEnabled()) {
        await continueBtn.click()
        await page.waitForTimeout(1000)

        // Select first product if available
        const productCards = page.locator('.grid > div.cursor-pointer').filter({
          has: page.locator('h3')
        })

        if (await productCards.count() > 0) {
          await productCards.first().click()
          await page.waitForTimeout(500)

          continueBtn = page.getByRole('button', { name: /Continue/i })
          if (await continueBtn.isEnabled()) {
            await continueBtn.click()
            await page.waitForTimeout(1000)

            // Check for preset names
            const presetNames = [
              'Product Hero',
              'Social Story',
              'Display Banner',
              'Lifestyle Scene',
              'Bold Minimal',
            ]

            for (const name of presetNames) {
              await expect(page.getByText(name, { exact: false }).first()).toBeVisible()
            }
          }
        }
      }
    }
  })

  test('should show model selector and aspect ratio on create ad step', async ({ page }) => {
    await adhub.waitForStepperVisible()

    // Navigate through steps to reach preset-generate
    const brandCards = page.locator('.grid .cursor-pointer').filter({
      has: page.locator('h3')
    })

    if (await brandCards.count() > 0) {
      await brandCards.first().click()
      await page.waitForTimeout(500)

      let continueBtn = page.getByRole('button', { name: /Continue/i })
      if (await continueBtn.isEnabled()) {
        await continueBtn.click()
        await page.waitForTimeout(1000)

        const productCards = page.locator('.grid > div.cursor-pointer').filter({
          has: page.locator('h3')
        })

        if (await productCards.count() > 0) {
          await productCards.first().click()
          await page.waitForTimeout(500)

          continueBtn = page.getByRole('button', { name: /Continue/i })
          if (await continueBtn.isEnabled()) {
            await continueBtn.click()
            await page.waitForTimeout(1000)

            // Check for aspect ratio section
            await expect(page.getByText('Aspect Ratio')).toBeVisible()

            // Check for model selector
            await expect(page.getByText('AI Model')).toBeVisible()

            // Check for generate button
            await expect(page.getByRole('button', { name: /Generate Ad/i })).toBeVisible()
          }
        }
      }
    }
  })

  test('should open architecture help modal', async ({ page }) => {
    await adhub.waitForStepperVisible()

    const howItWorks = page.getByRole('button', { name: /How It Works/i })
    if (await howItWorks.count() > 0) {
      await howItWorks.first().click()
      await page.waitForTimeout(500)

      // Modal should show v2 architecture info
      await expect(page.getByRole('heading', { name: /Adhub Architecture/i })).toBeVisible()
      await expect(page.getByText('1. Brand + Product')).toBeVisible()
      await expect(page.getByText('2. Preset + Prompt')).toBeVisible()
      await expect(page.getByText('3. Generation & Output')).toBeVisible()
    }
  })
})
