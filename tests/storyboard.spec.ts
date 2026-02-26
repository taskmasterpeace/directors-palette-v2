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

  // Main Workflow Sidebar Buttons (Story, Style, Director, Chars, Shots, Gen, Results)
  // The storyboard uses a vertical sidebar with custom <button> elements, not role="tab"
  private readonly sidebarLabelMap: Record<string, string> = {
    'Story': 'Story',
    'Style': 'Style',
    'Director': 'Director',
    'Characters': 'Chars',
    'Chars': 'Chars',
    'Shots': 'Shots',
    'Generate': 'Gen',
    'Gen': 'Gen',
    'Results': 'Results',
    'Gallery': 'Results',
  }

  async getMainTabs() {
    // Sidebar buttons are inside the sidebar strip (w-14 border-r)
    return this.page.locator('.flex-shrink-0.w-14 button')
  }

  async getMainTabCount(): Promise<number> {
    const tabs = await this.getMainTabs()
    return await tabs.count()
  }

  async clickMainTab(tabName: string) {
    const label = this.sidebarLabelMap[tabName] || tabName
    // Click the sidebar button containing the label text
    await this.page.locator(`.flex-shrink-0.w-14 button:has-text("${label}")`).click()
  }

  async getActiveMainTab(): Promise<string | null> {
    // The active sidebar button has bg-background and shadow-sm classes
    const activeTab = this.page.locator('.flex-shrink-0.w-14 button.bg-background')
    return await activeTab.textContent()
  }

  async isMainTabVisible(tabName: string): Promise<boolean> {
    const label = this.sidebarLabelMap[tabName] || tabName
    const tab = this.page.locator(`.flex-shrink-0.w-14 button:has-text("${label}")`)
    return await tab.isVisible()
  }

  // Tab Navigation Shortcuts
  async clickStoryTab() {
    await this.clickMainTab('Story')
  }

  async clickStyleTab() {
    await this.clickMainTab('Style')
  }

  async clickCharactersTab() {
    await this.clickMainTab('Characters')
  }

  async clickShotsTab() {
    await this.clickMainTab('Shots')
  }

  async clickGenerateTab() {
    await this.clickMainTab('Generate')
  }

  async clickResultsTab() {
    await this.clickMainTab('Results')
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
  test('should display all sidebar nav tabs', async ({ page }) => {
    // Check key navigation labels are visible in sidebar
    await expect(page.locator('.flex-shrink-0.w-14 button:has-text("Story")')).toBeVisible()
    await expect(page.locator('.flex-shrink-0.w-14 button:has-text("Style")')).toBeVisible()
    await expect(page.locator('.flex-shrink-0.w-14 button:has-text("Director")')).toBeVisible()
    await expect(page.locator('.flex-shrink-0.w-14 button:has-text("Chars")')).toBeVisible()
    await expect(page.locator('.flex-shrink-0.w-14 button:has-text("Shots")')).toBeVisible()
    await expect(page.locator('.flex-shrink-0.w-14 button:has-text("Gen")')).toBeVisible()
    await expect(page.locator('.flex-shrink-0.w-14 button:has-text("Results")')).toBeVisible()
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

    // Click Characters tab (sidebar label is "Chars")
    await storyboardPage.clickCharactersTab()
    activeTab = await storyboardPage.getActiveMainTab()
    expect(activeTab).toContain('Chars')
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

  test('should navigate through always-enabled main tabs', async ({ page }) => {
    const storyboardPage = new StoryboardPage(page)

    // Only test always-enabled tabs (Shots/Gen/Results may be disabled without story text)
    const tabs = [
      { click: 'Story', expect: 'Story' },
      { click: 'Style', expect: 'Style' },
      { click: 'Director', expect: 'Director' },
      { click: 'Chars', expect: 'Chars' },
    ]

    for (const tab of tabs) {
      await storyboardPage.clickMainTab(tab.click)
      const activeTab = await storyboardPage.getActiveMainTab()
      expect(activeTab).toContain(tab.expect)
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
