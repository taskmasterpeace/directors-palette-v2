import { test, expect } from '@playwright/test'

/**
 * Adhub v2 Visual Inspection Test
 *
 * Takes screenshots at every step of the flow for visual review.
 * Run with: npx playwright test tests/adhub-v2-visual.spec.ts --project=chromium --headed
 */

test.describe('Adhub v2 Visual Inspection', () => {
  test('full flow visual walkthrough', async ({ page }) => {
    test.setTimeout(120000)
    // Navigate to main page
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Click Adhub in sidebar
    const adhubNav = page.locator('button:has-text("Adhub")')
    if (await adhubNav.count() > 0) {
      await adhubNav.first().click()
    }
    await page.waitForTimeout(2000)

    // ===== STEP 1: BRAND SELECT =====
    await page.screenshot({ path: 'tests/screenshots/adhub-01-brand-step.png', fullPage: false })

    // Verify stepper is visible
    await expect(page.getByRole('button', { name: 'Create Ad', exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /Select a Brand/i })).toBeVisible()

    // Check if there are brands to select
    const brandCards = page.locator('.grid .cursor-pointer').filter({ has: page.locator('h3') })
    const brandCount = await brandCards.count()

    if (brandCount === 0) {
      await page.screenshot({ path: 'tests/screenshots/adhub-01b-no-brands.png', fullPage: false })
      console.log('No brands found - create a brand first to test full flow')
      return
    }

    // Select first brand
    await brandCards.first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-02-brand-selected.png', fullPage: false })

    // Click Continue
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.waitForTimeout(1500)

    // ===== STEP 2: PRODUCT SELECT =====
    await page.screenshot({ path: 'tests/screenshots/adhub-03-product-step.png', fullPage: false })
    await expect(page.getByRole('heading', { name: /Select a Product/i })).toBeVisible()

    // Open Create Product dialog
    await page.getByText('Create Product').click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-04-create-product-dialog.png', fullPage: false })

    // Fill in product info
    await page.locator('input[placeholder*="Premium Wireless"]').fill('Stellar Pro X1 Headphones')
    await page.locator('textarea[placeholder*="Paste your product"]').fill(
      'Introducing the Stellar Pro X1 - a revolutionary wireless noise-cancelling headphone designed for audiophiles and remote workers alike. ' +
      'Features include 40-hour battery life, adaptive ANC, spatial audio support, premium memory foam cushions, and seamless multi-device connectivity. ' +
      'Built with recycled aluminum and sustainable materials. Perfect for music lovers, podcast enthusiasts, and professionals who demand crystal-clear calls. ' +
      'Available in Midnight Black, Arctic White, and Ocean Blue. Starting at $299.'
    )
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-05-product-form-filled.png', fullPage: false })

    // Click Extract Ad Copy
    await page.getByRole('button', { name: /Extract Ad Copy/i }).click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/adhub-06-extracting-copy.png', fullPage: false })

    // Wait for extraction to complete (max 30s)
    let productCreated = false
    try {
      await expect(page.getByText('Extracted Ad Copy')).toBeVisible({ timeout: 30000 })
      await page.waitForTimeout(500)

      // Scroll dialog to see full extracted copy
      const dialogContent = page.locator('[class*="DialogContent"], [role="dialog"]')
      await dialogContent.evaluate(el => el.scrollTop = el.scrollHeight / 2)
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/adhub-07-extracted-copy.png', fullPage: false })

      // Scroll to bottom to see features + audience + Create button
      await dialogContent.evaluate(el => el.scrollTop = el.scrollHeight)
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/adhub-08-extracted-copy-bottom.png', fullPage: false })

      // Click Create Product button (scroll it into view first)
      const createBtn = page.getByRole('button', { name: /Create Product/i }).last()
      await createBtn.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
      await createBtn.click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'tests/screenshots/adhub-09-product-saved.png', fullPage: false })
      productCreated = true
    } catch {
      console.log('Copy extraction timed out or save failed. Closing dialog.')
      const cancelBtn = page.getByRole('button', { name: /Cancel/i })
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click()
        await page.waitForTimeout(500)
      }
    }

    // Select a product (first available)
    const productCards = page.locator('.grid > div.cursor-pointer').filter({ has: page.locator('h3') })
    const productCount = await productCards.count()

    if (productCount === 0) {
      await page.screenshot({ path: 'tests/screenshots/adhub-09b-no-products.png', fullPage: false })
      console.log('No products available after creation attempt')
      return
    }

    await productCards.first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-10-product-selected.png', fullPage: false })

    // Click Continue
    await page.getByRole('button', { name: /Continue/i }).click()
    await page.waitForTimeout(1500)

    // ===== STEP 3: PRESET + GENERATE =====
    await page.screenshot({ path: 'tests/screenshots/adhub-11-preset-step-top.png', fullPage: false })
    await expect(page.getByRole('heading', { name: /Create Your Ad/i })).toBeVisible()

    // Verify all 5 presets visible
    for (const name of ['Product Hero', 'Social Story', 'Display Banner', 'Lifestyle Scene', 'Bold Minimal']) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible()
    }

    // Select "Product Hero" preset
    await page.getByText('Product Hero').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-12-preset-selected.png', fullPage: false })

    // Scroll down to model + aspect ratio
    const scrollContainer = page.locator('.overflow-auto')
    await scrollContainer.evaluate(el => el.scrollTop = 400)
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-13-model-and-ratio.png', fullPage: false })

    // Scroll further to see reference images + Make It Talk
    await scrollContainer.evaluate(el => el.scrollTop = 800)
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-14-reference-images.png', fullPage: false })

    // Scroll to bottom for generate button
    await scrollContainer.evaluate(el => el.scrollTop = el.scrollHeight)
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-15-generate-section.png', fullPage: false })

    // Click a different aspect ratio
    const ratio16x9 = page.locator('button:has-text("16:9")')
    if (await ratio16x9.count() > 0) {
      await ratio16x9.first().click()
      await page.waitForTimeout(300)
    }

    // Try selecting another preset
    await scrollContainer.evaluate(el => el.scrollTop = 0)
    await page.waitForTimeout(300)
    await page.getByText('Social Story').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-16-social-story-preset.png', fullPage: false })

    // And Bold Minimal
    await page.getByText('Bold Minimal').first().click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'tests/screenshots/adhub-17-bold-minimal-preset.png', fullPage: false })

    // Open Architecture modal
    const howItWorks = page.getByRole('button', { name: /How It Works/i })
    if (await howItWorks.count() > 0) {
      await howItWorks.first().click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'tests/screenshots/adhub-18-architecture-modal.png', fullPage: false })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // Back to brand step via stepper
    const brandStepBtn = page.getByRole('button', { name: 'Brand', exact: true })
    if (await brandStepBtn.count() > 0) {
      await brandStepBtn.first().click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'tests/screenshots/adhub-19-back-to-brand.png', fullPage: false })
    }

    console.log('Visual inspection complete! Check tests/screenshots/adhub-*.png')
  })
})
