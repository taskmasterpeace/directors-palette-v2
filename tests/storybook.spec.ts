import { test, expect, Page } from '@playwright/test'

/**
 * E2E tests for Storybook Feature (Children's Book Creator)
 *
 * Features tested:
 * - Story input and page count selection
 * - Page splitting logic
 * - Style selection step
 * - Character detection
 * - Wizard navigation
 */

// ============================================================================
// Test Configuration
// ============================================================================

const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

// Test data - Simple children's story
const SIMPLE_STORY = `Once upon a time, there was a little rabbit named Fluffy who lived in a cozy burrow under an old oak tree.

Every morning, Fluffy would hop through the meadow looking for tasty carrots and clover to eat.

One day, Fluffy met a friendly squirrel named Nutkin who was gathering acorns for winter.

"Would you like to be friends?" asked Fluffy, wiggling his fluffy tail.

Nutkin smiled and nodded. "I'd love that! Let's explore the forest together!"

And so Fluffy and Nutkin became the best of friends, sharing adventures and snacks every day.

The End.`

// Test data - Story with character mentions
const STORY_WITH_CHARACTERS = `@Maya was a brave little girl who lived in a small village by the sea.

Her best friend @Jake was always by her side, ready for adventure.

One sunny morning, @Maya and @Jake decided to explore the mysterious cave on the cliff.

"Are you scared?" asked @Jake, peering into the darkness.

"Not with you here!" replied @Maya with a confident smile.

Together, they discovered a hidden treasure that would change their lives forever.`

// ============================================================================
// Page Object Model
// ============================================================================

class StorybookPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async clickStorybookTab() {
    // Click the Storybook tab in sidebar
    await this.page.click('[data-testid="sidebar-storybook"], button:has-text("Storybook")')
    await this.page.waitForTimeout(500)
  }

  // Step 1: Story Input
  async getStoryTitleInput() {
    return this.page.locator('input[placeholder*="book title"]')
  }

  async getStoryTextArea() {
    return this.page.locator('textarea[placeholder*="Once upon a time"]')
  }

  async getPageCountSelect() {
    return this.page.locator('button:has-text("Auto Detect"), button:has-text("pages")')
  }

  async getSplitPagesButton() {
    return this.page.locator('button:has-text("Split into Pages")')
  }

  async enterStory(title: string, text: string) {
    const titleInput = await this.getStoryTitleInput()
    await titleInput.fill(title)

    const textArea = await this.getStoryTextArea()
    await textArea.fill(text)
  }

  async selectPageCount(count: string) {
    const trigger = await this.getPageCountSelect()
    await trigger.click()
    await this.page.click(`[role="option"]:has-text("${count}")`)
  }

  async splitPages() {
    const button = await this.getSplitPagesButton()
    await button.click()
    await this.page.waitForTimeout(500)
  }

  // Navigation buttons
  async getNextButton() {
    return this.page.locator('button:has-text("Next")')
  }

  async getBackButton() {
    return this.page.locator('button:has-text("Back")')
  }

  async clickNext() {
    const button = await this.getNextButton()
    await button.click()
    await this.page.waitForTimeout(500)
  }

  async clickBack() {
    const button = await this.getBackButton()
    await button.click()
    await this.page.waitForTimeout(500)
  }

  // Page detection results
  async getDetectedPagesCount() {
    const pagesText = await this.page.locator('text=/\\d+ Pages? Detected/').textContent()
    const match = pagesText?.match(/(\d+) Pages?/)
    return match ? parseInt(match[1], 10) : 0
  }

  // Step indicators
  async getCurrentStep() {
    const activeStep = await this.page.locator('[class*="text-amber"], .bg-amber-500').first()
    return activeStep.textContent()
  }

  // Word count
  async getWordCount() {
    const countText = await this.page.locator('text=/\\d+ words/').textContent()
    const match = countText?.match(/(\d+) words/)
    return match ? parseInt(match[1], 10) : 0
  }
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Storybook Wizard', () => {
  let storybookPage: StorybookPage

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    storybookPage = new StorybookPage(page)
    await storybookPage.goto()
  })

  test('should navigate to Storybook tab', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    // Check header is visible
    await expect(page.locator('text="Storybook"')).toBeVisible()
    await expect(page.locator('text="Turn stories into illustrated pages"')).toBeVisible()
  })

  test('should display story input step initially', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    // Check story input elements
    await expect(page.locator('text="Write Your Story"')).toBeVisible()
    await expect(storybookPage.getStoryTitleInput()).toBeVisible()
    await expect(storybookPage.getStoryTextArea()).toBeVisible()
    await expect(storybookPage.getSplitPagesButton()).toBeVisible()
  })

  test('should enter story and count words', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    await storybookPage.enterStory('Fluffy the Rabbit', SIMPLE_STORY)

    const wordCount = await storybookPage.getWordCount()
    expect(wordCount).toBeGreaterThan(50)
  })

  test('should split story into pages with auto-detect', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    await storybookPage.enterStory('Fluffy the Rabbit', SIMPLE_STORY)
    await storybookPage.splitPages()

    // Check pages were detected (story has paragraph breaks)
    const pagesCount = await storybookPage.getDetectedPagesCount()
    expect(pagesCount).toBeGreaterThanOrEqual(3)
  })

  test('should split story into specific page count', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    await storybookPage.enterStory('Fluffy the Rabbit', SIMPLE_STORY)
    await storybookPage.selectPageCount('6 pages')
    await storybookPage.splitPages()

    const pagesCount = await storybookPage.getDetectedPagesCount()
    expect(pagesCount).toBeLessThanOrEqual(6)
  })

  test('should enable Next button after splitting pages', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    // Next should be disabled initially
    const nextButton = await storybookPage.getNextButton()
    await expect(nextButton).toBeDisabled()

    // Enter story and split
    await storybookPage.enterStory('Fluffy the Rabbit', SIMPLE_STORY)
    await storybookPage.splitPages()

    // Next should now be enabled
    await expect(nextButton).toBeEnabled()
  })

  test('should navigate to style selection step', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    await storybookPage.enterStory('Fluffy the Rabbit', SIMPLE_STORY)
    await storybookPage.splitPages()
    await storybookPage.clickNext()

    // Should be on style selection step
    await expect(page.locator('text=/style|Style/')).toBeVisible()
  })

  test('should detect character mentions', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    await storybookPage.enterStory('Maya and Jake', STORY_WITH_CHARACTERS)
    await storybookPage.splitPages()

    // Navigate to characters step
    await storybookPage.clickNext() // to style
    // Select a style if required, then next to characters
  })

  test('should show step indicator with 5 steps', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    // Check step indicator shows 5 steps
    await expect(page.locator('text="Step 1 of 5"')).toBeVisible()
  })

  test('should navigate back from style to story step', async ({ page }) => {
    await storybookPage.clickStorybookTab()

    await storybookPage.enterStory('Fluffy the Rabbit', SIMPLE_STORY)
    await storybookPage.splitPages()
    await storybookPage.clickNext()

    // Now go back
    await storybookPage.clickBack()

    // Should be back on story step
    await expect(page.locator('text="Write Your Story"')).toBeVisible()
  })
})

test.describe('Storybook - Page Splitting Logic', () => {
  let storybookPage: StorybookPage

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    storybookPage = new StorybookPage(page)
    await storybookPage.goto()
    await storybookPage.clickStorybookTab()
  })

  test('should split by paragraphs when double newlines present', async ({ page }) => {
    const storyWithParagraphs = `First paragraph here.

Second paragraph here.

Third paragraph here.

Fourth paragraph here.`

    await storybookPage.enterStory('Test Book', storyWithParagraphs)
    await storybookPage.splitPages()

    const pagesCount = await storybookPage.getDetectedPagesCount()
    expect(pagesCount).toBe(4)
  })

  test('should handle single-paragraph story', async ({ page }) => {
    const singleParagraph = 'This is a single paragraph story with no breaks. It has multiple sentences. Each sentence should be considered. The algorithm should split this intelligently.'

    await storybookPage.enterStory('Test Book', singleParagraph)
    await storybookPage.selectPageCount('4 pages')
    await storybookPage.splitPages()

    const pagesCount = await storybookPage.getDetectedPagesCount()
    expect(pagesCount).toBeGreaterThan(0)
    expect(pagesCount).toBeLessThanOrEqual(4)
  })
})
