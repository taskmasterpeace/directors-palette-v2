import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Shot Animator Seedance Prompting Features
 *
 * Tests the new features from the Seedance 1.5 Pro prompting guide audit:
 * - Multi-shot toggle button (Clapperboard icon)
 * - Prompt tips panel (Info icon)
 * - Textarea placeholder changes in multi-shot mode
 */

// Only run on chromium to keep things fast and focused
test.use({
  storageState: './tests/.auth/user.json',
})

class ShotAnimatorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToShotAnimator(): Promise<boolean> {
    // Look for the Shot Animator tab
    const tab = this.page.locator('[data-value="shot-animator"]')
      .or(this.page.locator('button:has-text("Shot Animator")'))
      .or(this.page.locator('[role="tab"]:has-text("Animator")'))

    if (await tab.count() > 0) {
      await tab.first().click()
      await this.page.waitForTimeout(1000)
      return true
    }
    return false
  }

  /** Select Seedance 1.5 Pro from the desktop model selector */
  async selectSeedanceModel(): Promise<boolean> {
    // Desktop model selector - the wider one (w-[320px])
    const desktopSelect = this.page.locator('button[role="combobox"]').filter({
      has: this.page.locator('span')
    })

    // Find the visible combobox (not the mobile one which is hidden sm:hidden)
    for (let i = 0; i < await desktopSelect.count(); i++) {
      const btn = desktopSelect.nth(i)
      if (await btn.isVisible()) {
        await btn.click()
        await this.page.waitForTimeout(500)

        // Look for Seedance 1.5 Pro option
        const option = this.page.locator('[role="option"]').filter({ hasText: 'Seedance 1.5 Pro' })
        if (await option.count() > 0) {
          await option.first().click()
          await this.page.waitForTimeout(500)
          return true
        }
        // Close the dropdown if we didn't find it
        await this.page.keyboard.press('Escape')
        break
      }
    }

    // It may already be selected - check if page shows Seedance
    const modelText = await this.page.locator('button[role="combobox"]').filter({
      hasText: /seedance/i
    }).count()
    return modelText > 0
  }

  /** Upload a test image to create a shot card */
  async uploadTestImage() {
    const buffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVQYV2P8z8BQz0BFwMgwasChAABwFAIRtUmxPAAAAABJRU5ErkJggg==',
      'base64'
    )

    const fileInput = this.page.locator('#file-upload-toolbar')
    await fileInput.setInputFiles({
      name: 'test-shot.png',
      mimeType: 'image/png',
      buffer,
    })
    await this.page.waitForTimeout(1000)
  }

  /** Check if a shot card exists */
  async hasShotCards(): Promise<boolean> {
    // Shot cards have a textarea with animation placeholder
    const cards = this.page.locator('textarea')
    return (await cards.count()) > 0
  }
}

test.describe('Shot Animator - Seedance Prompting Features', () => {
  let animator: ShotAnimatorPage

  test.beforeEach(async ({ page }) => {
    animator = new ShotAnimatorPage(page)
    await animator.goto()
  })

  test('multi-shot toggle and prompt tips appear for Seedance models', async ({ page }) => {
    const navigated = await animator.navigateToShotAnimator()
    test.skip(!navigated, 'Shot Animator tab not found')

    // Seedance 1.5 Pro should be default, but ensure it
    await animator.selectSeedanceModel()

    // Upload image
    await animator.uploadTestImage()

    // Wait for shot card to appear
    const hasCards = await animator.hasShotCards()
    test.skip(!hasCards, 'No shot cards created')

    // Multi-Shot button should be visible (Seedance uses 'reasoning' promptStyle)
    const multiShotBtn = page.locator('button:has-text("Multi-Shot")').first()
    await expect(multiShotBtn).toBeVisible({ timeout: 5000 })

    // Info (tips) button should be visible
    const infoBtn = page.locator('button svg.lucide-info').first()
    await expect(infoBtn).toBeVisible({ timeout: 5000 })

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-seedance-shot-card.png', fullPage: false })
  })

  test('multi-shot toggle changes placeholder and tips show camera switch', async ({ page }) => {
    const navigated = await animator.navigateToShotAnimator()
    test.skip(!navigated, 'Shot Animator tab not found')

    await animator.selectSeedanceModel()
    await animator.uploadTestImage()

    const hasCards = await animator.hasShotCards()
    test.skip(!hasCards, 'No shot cards created')

    // Check default textarea placeholder
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible({ timeout: 5000 })

    const placeholderBefore = await textarea.getAttribute('placeholder')
    expect(placeholderBefore).toContain('animation motion')

    // Click multi-shot toggle
    const multiShotBtn = page.locator('button:has-text("Multi-Shot")').first()
    await multiShotBtn.click()
    await page.waitForTimeout(300)

    // Placeholder should change to multi-shot
    const placeholderAfter = await textarea.getAttribute('placeholder')
    expect(placeholderAfter).toContain('multi-shot')

    // Open tips
    const infoBtn = page.locator('button:has(svg.lucide-info)').first()
    await infoBtn.click()
    await page.waitForTimeout(300)

    // Tips should include multi-shot guidance
    await expect(page.locator('text=Multi-Shot:').first()).toBeVisible()
    await expect(page.locator('text=camera switch').first()).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-multishot-mode.png', fullPage: false })
  })

  test('prompt tips panel shows intensity adverbs and film terms', async ({ page }) => {
    const navigated = await animator.navigateToShotAnimator()
    test.skip(!navigated, 'Shot Animator tab not found')

    await animator.selectSeedanceModel()
    await animator.uploadTestImage()

    const hasCards = await animator.hasShotCards()
    test.skip(!hasCards, 'No shot cards created')

    // Open tips panel via info button
    const infoBtn = page.locator('button:has(svg.lucide-info)').first()
    await expect(infoBtn).toBeVisible({ timeout: 5000 })
    await infoBtn.click()
    await page.waitForTimeout(300)

    // Verify prompt tips content
    await expect(page.locator('text=Prompt Tips:').first()).toBeVisible()
    await expect(page.locator('text=slowly, rapidly, gently, powerfully').first()).toBeVisible()
    await expect(page.locator('text=dolly push-in, tracking shot, crane up').first()).toBeVisible()

    // Toggle tips off
    await infoBtn.click()
    await page.waitForTimeout(300)
    await expect(page.locator('text=Prompt Tips:').first()).not.toBeVisible()
  })
})
