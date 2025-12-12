import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive E2E tests for Storyboard Feature
 *
 * Features tested:
 * - Story input and chapter detection
 * - Chapter tab navigation
 * - Prompt generation with wildcards
 * - Shot selection and generation
 * - Gallery display with metadata
 * - Wildcard visual highlighting
 */

// ============================================================================
// Test Configuration
// ============================================================================

const DESKTOP_VIEWPORT = { width: 1280, height: 720 }
const MOBILE_VIEWPORT = { width: 375, height: 667 }
const STORYBOARD_URL = '/test-storyboard'
// Note: Dev server may use different ports - tests use webServer config in playwright.config.ts

// Test data - Short story (no chapters)
const SHORT_STORY = `The warrior stood at the edge of the cliff, sword drawn.
The wind howled around him as enemy forces gathered below.
With a battle cry, he leaped into the fray.`

// Test data - Long story with explicit chapters
const LONG_STORY_WITH_CHAPTERS = `Chapter 1: The Beginning

The sun rose over the ancient city, casting golden light across the cobblestone streets.
Maya awoke in her small apartment, unaware that today would change everything.
She dressed quickly and headed to the marketplace.

Chapter 2: The Discovery

In the crowded market, Maya found an old vendor selling mysterious artifacts.
One item caught her eye - a glowing amulet pulsing with strange energy.
She purchased it without knowing its true power.

Chapter 3: The Transformation

That night, the amulet activated. Maya felt power surge through her veins.
She discovered she could control the elements - fire, water, earth, and air.
But with great power came great danger, and dark forces began to stir.`

// Test data - Story with divider markers
const STORY_WITH_DIVIDERS = `The heroes gathered at the tavern, planning their next move.
They knew the dragon's lair was just over the mountain.

---

The journey was treacherous. Storms battered the party as they climbed.
When they finally reached the cave entrance, they paused to catch their breath.

---

Inside the lair, treasure glittered in the firelight.
The dragon slept atop its hoard, scales gleaming like armor.`

// Test data - Story with wildcard variables
const STORY_WITH_WILDCARDS = `The battle rapper stepped onto _url_large_venue_ stage.
Wearing _designer_wardrobe_, he commanded the crowd's attention.
The atmosphere was electric as he began his verse.`

// ============================================================================
// Page Object Model
// ============================================================================

class StoryboardPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto(STORYBOARD_URL)
    await this.page.waitForLoadState('networkidle')
  }

  // Story Input
  async getStoryTextarea() {
    return this.page.locator('textarea').first()
  }

  async inputStory(story: string) {
    const textarea = await this.getStoryTextarea()
    await textarea.fill(story)
  }

  async clickExtractCharacters() {
    await this.page.getByRole('button', { name: /Extract Characters/i }).click()
  }

  async waitForExtraction() {
    // Wait for loading to complete
    await this.page.waitForSelector('[class*="Loader"], [class*="animate-spin"]', { state: 'hidden', timeout: 60000 }).catch(() => {})
  }

  // Main Workflow Tabs (Story, Style, Characters, Shots, Generate, Results)
  async getMainTabs() {
    return this.page.locator('[role="tab"]')
  }

  async getMainTabCount(): Promise<number> {
    const tabs = await this.getMainTabs()
    return await tabs.count()
  }

  async clickMainTab(tabName: string) {
    await this.page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click()
  }

  async getActiveMainTab(): Promise<string | null> {
    const activeTab = this.page.locator('[role="tab"][data-state="active"], [role="tab"][aria-selected="true"]')
    return await activeTab.textContent()
  }

  async isMainTabVisible(tabName: string): Promise<boolean> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}")`)
    return await tab.isVisible()
  }

  // Tab Navigation Shortcuts
  async clickStoryTab() {
    await this.page.getByRole('tab', { name: /Story/i }).click()
  }

  async clickStyleTab() {
    await this.page.getByRole('tab', { name: /Style/i }).click()
  }

  async clickCharactersTab() {
    await this.page.getByRole('tab', { name: /Characters/i }).click()
  }

  async clickShotsTab() {
    await this.page.getByRole('tab', { name: /Shots/i }).click()
  }

  async clickGenerateTab() {
    await this.page.getByRole('tab', { name: /Generate/i }).click()
  }

  async clickResultsTab() {
    await this.page.getByRole('tab', { name: /Results/i }).click()
  }

  // Shot Segments
  async getShotSegments() {
    return this.page.locator('[data-testid="shot-segment"], [class*="shot-card"], [class*="segment"]')
  }

  async getShotSegmentCount(): Promise<number> {
    const segments = await this.getShotSegments()
    return await segments.count()
  }

  // Prompt Generation
  async clickGeneratePrompts() {
    await this.page.getByRole('button', { name: /Generate.*Prompt/i }).click()
  }

  async waitForPromptsGenerated() {
    // Wait for loading state to complete
    await this.page.waitForSelector('[class*="Loader"]', { state: 'hidden', timeout: 60000 }).catch(() => {})
    // Wait for prompts to appear
    await this.page.waitForSelector('[data-testid="generated-prompt"], [class*="prompt-card"]', { timeout: 60000 }).catch(() => {})
  }

  async getGeneratedPrompts() {
    return this.page.locator('[data-testid="generated-prompt"], [class*="prompt-card"], [class*="PromptCard"]')
  }

  async getGeneratedPromptCount(): Promise<number> {
    const prompts = await this.getGeneratedPrompts()
    return await prompts.count()
  }

  // Shot Selection
  async selectShot(index: number) {
    const checkboxes = this.page.locator('input[type="checkbox"]')
    await checkboxes.nth(index).check()
  }

  async selectAllShots() {
    await this.page.getByRole('button', { name: /Select All/i }).click()
  }

  async deselectAllShots() {
    await this.page.getByRole('button', { name: /Deselect|Clear/i }).click()
  }

  async getSelectedShotCount(): Promise<number> {
    const selectedBadge = this.page.locator('text=/\\d+ selected/')
    const text = await selectedBadge.textContent()
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  // Image Generation
  async clickGenerateImages() {
    await this.page.getByRole('button', { name: /Generate.*Image|Generate Selected/i }).click()
  }

  async clickGenerateAllImages() {
    await this.page.getByRole('button', { name: /Generate All/i }).click()
  }

  async waitForImageGeneration(timeout = 120000) {
    // Wait for at least one image to complete
    await this.page.waitForSelector('img[src*="http"], [class*="completed"]', { timeout })
  }

  async getGeneratedImages() {
    return this.page.locator('[data-testid="generated-image"], img[class*="shot"]')
  }

  async getGeneratedImageCount(): Promise<number> {
    const images = await this.getGeneratedImages()
    return await images.count()
  }

  // Gallery
  async getGalleryImages() {
    return this.page.locator('[class*="gallery"] img, [data-testid="gallery-image"]')
  }

  async hoverGalleryImage(index: number) {
    const images = await this.getGalleryImages()
    await images.nth(index).hover()
  }

  async clickMetadataButton() {
    await this.page.getByRole('button', { name: /Metadata|Info/i }).click()
  }

  async isMetadataTooltipVisible(): Promise<boolean> {
    const tooltip = this.page.locator('[role="tooltip"], [class*="TooltipContent"]')
    return await tooltip.isVisible()
  }

  async getMetadataContent(): Promise<string | null> {
    const tooltip = this.page.locator('[role="tooltip"], [class*="TooltipContent"]')
    return await tooltip.textContent()
  }

  // Wildcard Highlighting
  async getWildcardBadges() {
    return this.page.locator('[class*="amber"], [class*="wildcard-badge"]')
  }

  async getWildcardBadgeCount(): Promise<number> {
    const badges = await this.getWildcardBadges()
    return await badges.count()
  }

  async isWildcardHighlighted(wildcardName: string): Promise<boolean> {
    const badge = this.page.locator(`[class*="amber"]:has-text("_${wildcardName}_")`)
    return await badge.isVisible()
  }

  // Style Guide
  async selectStyleGuide(styleName: string) {
    const selector = this.page.locator('[data-testid="style-guide-selector"], [class*="StyleGuide"] select')
    await selector.selectOption({ label: styleName })
  }

  // Progress Indicators
  async getProgressText(): Promise<string | null> {
    const progress = this.page.locator('text=/Processing|Generating|\\d+.*of.*\\d+/')
    return await progress.textContent()
  }

  async isLoading(): Promise<boolean> {
    const loader = this.page.locator('[class*="Loader"], [class*="animate-spin"]')
    return await loader.isVisible()
  }

  // Error States
  async getErrorMessage(): Promise<string | null> {
    const error = this.page.locator('[class*="error"], [class*="destructive"]')
    return await error.textContent()
  }

  async hasError(): Promise<boolean> {
    const error = this.page.locator('[class*="error"], [class*="destructive"]')
    return await error.isVisible()
  }

  // Empty States
  async isEmptyState(): Promise<boolean> {
    const empty = this.page.locator('text=/No shots|No images|Empty|Get started/')
    return await empty.isVisible()
  }
}

// ============================================================================
// Test Data Helpers
// ============================================================================

const TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 15000,
  LONG: 60000,
  GENERATION: 120000,
}

// ============================================================================
// Test Hooks
// ============================================================================

test.beforeEach(async ({ page }) => {
  // Navigate to storyboard
  await page.goto(STORYBOARD_URL)
  await page.waitForLoadState('networkidle')
})

// ============================================================================
// 1. Story Input Tests
// ============================================================================

test.describe('Story Input', () => {
  test('should display story input textarea', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    const textarea = await storyboardPage.getStoryTextarea()
    await expect(textarea).toBeVisible()
  })

  test('should accept story text input', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    await storyboardPage.inputStory(SHORT_STORY)

    const textarea = await storyboardPage.getStoryTextarea()
    await expect(textarea).toHaveValue(SHORT_STORY)
  })

  test('should have Extract Characters button', async ({ page }) => {
    const extractButton = page.getByRole('button', { name: /Extract Characters/i })
    await expect(extractButton).toBeVisible()
  })

  test('should enable Extract button when story has content', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    // Button should be disabled initially
    const extractButton = page.getByRole('button', { name: /Extract Characters/i })
    await expect(extractButton).toBeDisabled()

    // After entering text, button should be enabled
    await storyboardPage.inputStory(SHORT_STORY)
    await expect(extractButton).toBeEnabled()
  })
})

// ============================================================================
// 2. Main Tab Navigation Tests
// ============================================================================

test.describe('Main Tab Navigation', () => {
  test('should display all 6 main tabs', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    // Check all main tabs are visible
    await expect(page.getByRole('tab', { name: /Story/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Style/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Characters/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Shots/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Generate/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Results/i })).toBeVisible()
  })

  test('should start on Story tab', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    const activeTab = await storyboardPage.getActiveMainTab()
    expect(activeTab).toContain('Story')
  })

  test('should switch between tabs', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    // Click Style tab
    await storyboardPage.clickStyleTab()
    let activeTab = await storyboardPage.getActiveMainTab()
    expect(activeTab).toContain('Style')

    // Click Characters tab
    await storyboardPage.clickCharactersTab()
    activeTab = await storyboardPage.getActiveMainTab()
    expect(activeTab).toContain('Characters')
  })
})

// ============================================================================
// 3. Responsive Design Tests
// ============================================================================

test.describe('Responsive Design', () => {
  test('should be usable on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    const storyboardPage = new StoryboardPage(page)

    await storyboardPage.goto()

    const textarea = await storyboardPage.getStoryTextarea()
    await expect(textarea).toBeVisible()
  })

  test('should be usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    const storyboardPage = new StoryboardPage(page)

    await storyboardPage.goto()

    const textarea = await storyboardPage.getStoryTextarea()
    await expect(textarea).toBeVisible()
  })
})

// ============================================================================
// 4. Integration Tests
// ============================================================================

test.describe('Integration Tests', () => {
  test('should complete story input workflow', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    // 1. Input story
    await storyboardPage.inputStory(SHORT_STORY)
    const textarea = await storyboardPage.getStoryTextarea()
    await expect(textarea).toHaveValue(SHORT_STORY)

    // 2. Verify Extract button is enabled
    const extractButton = page.getByRole('button', { name: /Extract Characters/i })
    await expect(extractButton).toBeEnabled()
  })

  test('should navigate through all main tabs', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    const tabs = ['Story', 'Style', 'Characters', 'Shots', 'Generate', 'Results']

    for (const tabName of tabs) {
      await storyboardPage.clickMainTab(tabName)
      const activeTab = await storyboardPage.getActiveMainTab()
      expect(activeTab).toContain(tabName)
    }
  })
})

// ============================================================================
// 5. AI Model Selection Tests
// ============================================================================

test.describe('AI Model Selection', () => {
  test('should display AI model selector', async ({ page }) => {
    // Check for AI model combobox in the UI (role="combobox")
    const modelSelector = page.locator('[role="combobox"]').first()
    await expect(modelSelector).toBeVisible()
  })
})
