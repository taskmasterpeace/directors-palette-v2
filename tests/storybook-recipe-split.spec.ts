import { test, expect, Page } from '@playwright/test'

/**
 * E2E Test: Verify Storybook Page Recipe Split
 *
 * Tests that:
 * - First page (index 0) uses "Storybook Page (First)" recipe
 * - Continuation pages (index > 0) use "Storybook Page (Continuation)" recipe
 * - Field mappings are correct for each recipe type
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

// Simple test story with 2 pages
const TEST_STORY = `Once upon a time, there was a brave little girl named Emma.

Emma loved to explore the magical forest near her home.`

class StorybookRecipeTestPage {
  private recipeApiCalls: any[] = []

  constructor(private page: Page) {}

  async setupApiInterception() {
    // Intercept recipe execution API calls
    await this.page.route('**/api/recipes/**/execute', async (route, request) => {
      const url = request.url()
      const recipeName = url.split('/api/recipes/')[1]?.split('/execute')[0]
      const body = request.postDataJSON()

      this.recipeApiCalls.push({
        recipeName: decodeURIComponent(recipeName),
        fieldValues: body.fieldValues,
        referenceImages: body.referenceImages,
        modelSettings: body.modelSettings,
      })

      // Return mock success response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          imageUrl: 'https://example.com/test-image.png',
          predictionId: 'test-prediction-123',
        }),
      })
    })
  }

  getRecipeApiCalls() {
    return this.recipeApiCalls
  }

  clearRecipeApiCalls() {
    this.recipeApiCalls = []
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async clickStorybookTab() {
    const storybookButton = this.page.locator('button:has-text("Storybook"), [data-testid="sidebar-storybook"]').first()
    await storybookButton.click()
    await this.page.waitForTimeout(500)
  }

  async selectPasteMode() {
    // Look for "Paste Your Own Story" button
    const pasteButton = this.page.locator('button:has-text("Paste Your Own Story"), button:has-text("paste")', { hasText: /paste/i }).first()
    if (await pasteButton.isVisible()) {
      await pasteButton.click()
      await this.page.waitForTimeout(300)
    }
  }

  async enterStoryText(text: string) {
    const textarea = this.page.locator('textarea[placeholder*="Once upon a time"], textarea[placeholder*="story"]').first()
    await textarea.fill(text)
    await this.page.waitForTimeout(300)
  }

  async selectPageCount(count: number) {
    // Find page count selector
    const selector = this.page.locator('button:has-text("pages"), select, [role="combobox"]').first()
    await selector.click()
    await this.page.waitForTimeout(200)

    const option = this.page.locator(`[role="option"]:has-text("${count}")`).first()
    await option.click()
    await this.page.waitForTimeout(200)
  }

  async clickNextButton() {
    const nextButton = this.page.locator('button:has-text("Next"), button:has-text("Continue")').first()
    await nextButton.click()
    await this.page.waitForTimeout(500)
  }

  async skipStyleStep() {
    // Skip style selection by clicking Next
    await this.clickNextButton()
  }

  async skipCharacterStep() {
    // Skip character sheets by clicking Next
    await this.clickNextButton()
  }

  async generatePage(pageNumber: number) {
    // Find the generate button for the specific page
    const generateButton = this.page.locator(`button:has-text("Generate Page ${pageNumber}"), button:has-text("Generate")`).nth(pageNumber - 1)
    await generateButton.click()

    // Wait for generation to complete (mock response)
    await this.page.waitForTimeout(1000)
  }
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Storybook Recipe Split', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
  })

  test('should use "Storybook Page (First)" recipe for first page', async ({ page }) => {
    const storybookPage = new StorybookRecipeTestPage(page)

    // Setup API interception
    await storybookPage.setupApiInterception()

    // Navigate to storybook
    await storybookPage.goto()
    await storybookPage.clickStorybookTab()

    // Enter story in paste mode
    await storybookPage.selectPasteMode()
    await storybookPage.enterStoryText(TEST_STORY)
    await storybookPage.selectPageCount(2)
    await storybookPage.clickNextButton()

    // Skip style and character steps
    await storybookPage.skipStyleStep()
    await storybookPage.skipCharacterStep()

    // Generate first page
    await storybookPage.clearRecipeApiCalls()
    await storybookPage.generatePage(1)

    // Verify API call
    const apiCalls = storybookPage.getRecipeApiCalls()
    expect(apiCalls.length).toBeGreaterThan(0)

    const firstPageCall = apiCalls[0]
    expect(firstPageCall.recipeName).toBe('Storybook Page (First)')

    // Verify field mapping for first page (no previous_page_text)
    const fields = firstPageCall.fieldValues
    expect(fields).toHaveProperty('stage0_field0_page_text')
    expect(fields).toHaveProperty('stage0_field2_mood')
    expect(fields).toHaveProperty('stage0_field4_target_age')
    expect(fields).not.toHaveProperty('stage0_field0_previous_page_text')
  })

  test('should use "Storybook Page (Continuation)" recipe for second page', async ({ page }) => {
    const storybookPage = new StorybookRecipeTestPage(page)

    // Setup API interception
    await storybookPage.setupApiInterception()

    // Navigate to storybook
    await storybookPage.goto()
    await storybookPage.clickStorybookTab()

    // Enter story in paste mode
    await storybookPage.selectPasteMode()
    await storybookPage.enterStoryText(TEST_STORY)
    await storybookPage.selectPageCount(2)
    await storybookPage.clickNextButton()

    // Skip style and character steps
    await storybookPage.skipStyleStep()
    await storybookPage.skipCharacterStep()

    // Generate second page
    await storybookPage.clearRecipeApiCalls()
    await storybookPage.generatePage(2)

    // Verify API call
    const apiCalls = storybookPage.getRecipeApiCalls()
    expect(apiCalls.length).toBeGreaterThan(0)

    const secondPageCall = apiCalls[0]
    expect(secondPageCall.recipeName).toBe('Storybook Page (Continuation)')

    // Verify field mapping for continuation page (WITH previous_page_text)
    const fields = secondPageCall.fieldValues
    expect(fields).toHaveProperty('stage0_field0_previous_page_text')
    expect(fields).toHaveProperty('stage0_field1_page_text')
    expect(fields).toHaveProperty('stage0_field3_mood')
    expect(fields).toHaveProperty('stage0_field5_target_age')
  })

  test('should verify field indices match template order', async ({ page }) => {
    const storybookPage = new StorybookRecipeTestPage(page)

    // Setup API interception
    await storybookPage.setupApiInterception()

    // Navigate and setup
    await storybookPage.goto()
    await storybookPage.clickStorybookTab()
    await storybookPage.selectPasteMode()
    await storybookPage.enterStoryText(TEST_STORY)
    await storybookPage.selectPageCount(2)
    await storybookPage.clickNextButton()
    await storybookPage.skipStyleStep()
    await storybookPage.skipCharacterStep()

    // Generate first page
    await storybookPage.clearRecipeApiCalls()
    await storybookPage.generatePage(1)
    const firstPageCall = storybookPage.getRecipeApiCalls()[0]

    // Verify First Page field order: PAGE_TEXT, SCENE_DESCRIPTION, MOOD, CHARACTER_NAMES, TARGET_AGE
    expect(Object.keys(firstPageCall.fieldValues)).toContain('stage0_field0_page_text')
    expect(Object.keys(firstPageCall.fieldValues)).toContain('stage0_field1_scene_description')
    expect(Object.keys(firstPageCall.fieldValues)).toContain('stage0_field2_mood')
    expect(Object.keys(firstPageCall.fieldValues)).toContain('stage0_field3_character_names')
    expect(Object.keys(firstPageCall.fieldValues)).toContain('stage0_field4_target_age')

    // Generate second page
    await storybookPage.clearRecipeApiCalls()
    await storybookPage.generatePage(2)
    const secondPageCall = storybookPage.getRecipeApiCalls()[0]

    // Verify Continuation Page field order: PREVIOUS_PAGE_TEXT, PAGE_TEXT, SCENE_DESCRIPTION, MOOD, CHARACTER_NAMES, TARGET_AGE
    expect(Object.keys(secondPageCall.fieldValues)).toContain('stage0_field0_previous_page_text')
    expect(Object.keys(secondPageCall.fieldValues)).toContain('stage0_field1_page_text')
    expect(Object.keys(secondPageCall.fieldValues)).toContain('stage0_field2_scene_description')
    expect(Object.keys(secondPageCall.fieldValues)).toContain('stage0_field3_mood')
    expect(Object.keys(secondPageCall.fieldValues)).toContain('stage0_field4_character_names')
    expect(Object.keys(secondPageCall.fieldValues)).toContain('stage0_field5_target_age')
  })
})
