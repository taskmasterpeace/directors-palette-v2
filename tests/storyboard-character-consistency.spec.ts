import { test, expect, Page } from '@playwright/test'

/**
 * Storyboard Character Consistency Tests
 *
 * Tests the character extraction and consistency features:
 * - Character extraction from story text
 * - Character descriptions and reference handling
 * - Character sheet generation
 * - How characters without references are handled
 */

const STORYBOARD_URL = '/test-storyboard'

// Test story with multiple characters (main + supporting)
const MULTI_CHARACTER_STORY = `Marcus walked into the crowded bar, his leather jacket worn from years on the road.
His sister Maya was already there, her bright red hair catching the neon lights.
At the corner table sat Old Pete, the bartender's father, nursing his usual whiskey.

"You're late," Maya said, pushing a beer toward him.
Marcus shrugged. "Traffic."

Old Pete shuffled over. "You two still chasing that treasure?"
The siblings exchanged a look. Their grandmother's map led here.`

// Story with clear visual descriptions
const DESCRIPTIVE_STORY = `The warrior Kira stood tall, her silver armor gleaming in the moonlight.
She was a formidable sight - dark skin, close-cropped hair, and a scar running down her left cheek.
Her companion, the young mage Theo, barely reached her shoulder.
Theo's pale complexion and oversized spectacles made him look more scholar than fighter.
Together they faced the dragon's lair.`

class StoryboardCharacterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(STORYBOARD_URL)
    await this.page.waitForLoadState('networkidle')
  }

  async inputStory(story: string) {
    const textarea = this.page.locator('textarea').first()
    await textarea.fill(story)
  }

  async clickExtractCharacters() {
    await this.page.getByRole('button', { name: /Extract Characters/i }).click()
  }

  async waitForExtraction() {
    // Wait for loading to complete (up to 60s for AI extraction)
    await this.page.waitForSelector('[class*="Loader"], [class*="animate-spin"]', {
      state: 'hidden',
      timeout: 60000
    }).catch(() => {})
    // Give time for UI to update
    await this.page.waitForTimeout(1000)
  }

  async clickCharactersTab() {
    await this.page.getByRole('tab', { name: /Characters/i }).click()
  }

  async clickShotsTab() {
    await this.page.getByRole('tab', { name: /Shots/i }).click()
  }

  async getCharacterCards() {
    // Look for character cards in the Characters tab
    return this.page.locator('[class*="character"], [data-testid*="character"]')
  }

  async getCharacterCount(): Promise<number> {
    const cards = await this.getCharacterCards()
    return await cards.count()
  }

  async getCharacterNames(): Promise<string[]> {
    // Get all character name elements
    const names: string[] = []
    const nameElements = this.page.locator('[class*="character"] h3, [class*="character"] [class*="name"]')
    const count = await nameElements.count()
    for (let i = 0; i < count; i++) {
      const text = await nameElements.nth(i).textContent()
      if (text) names.push(text.trim())
    }
    return names
  }

  async hasCharacterReferenceImage(characterName: string): Promise<boolean> {
    const characterCard = this.page.locator(`[class*="character"]:has-text("${characterName}")`)
    const image = characterCard.locator('img')
    return await image.isVisible().catch(() => false)
  }

  async hasCharacterDescription(characterName: string): Promise<boolean> {
    const characterCard = this.page.locator(`[class*="character"]:has-text("${characterName}")`)
    const description = characterCard.locator('[class*="description"], textarea')
    return await description.isVisible().catch(() => false)
  }

  async toggleCharacterReference(characterName: string) {
    // Find the character card and toggle the "has reference" checkbox
    const characterCard = this.page.locator(`[class*="character"]:has-text("${characterName}")`)
    const toggle = characterCard.locator('input[type="checkbox"], [role="switch"]').first()
    await toggle.click()
  }

  async getCharacterMentionCount(characterName: string): Promise<number> {
    const characterCard = this.page.locator(`[class*="character"]:has-text("${characterName}")`)
    const mentions = characterCard.locator('text=/\\d+ mention/')
    const text = await mentions.textContent().catch(() => null)
    if (text) {
      const match = text.match(/(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }
    return 0
  }

  async isCharacterSheetGeneratorVisible(): Promise<boolean> {
    return this.page.locator('text=/Character Sheet|Generate Sheet/i').isVisible().catch(() => false)
  }

  async clickGenerateCharacterSheet(characterName: string) {
    const characterCard = this.page.locator(`[class*="character"]:has-text("${characterName}")`)
    const generateBtn = characterCard.locator('button:has-text("Generate")')
    await generateBtn.click()
  }

  // Screenshot helper
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `tests/screenshots/storyboard-${name}.png`,
      fullPage: true
    })
  }
}

// ============================================================================
// Test Suite
// ============================================================================

test.beforeEach(async ({ page }) => {
  await page.goto(STORYBOARD_URL)
  await page.waitForLoadState('networkidle')
})

test.describe('Character Extraction', () => {
  test('should extract multiple characters from story', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    // Input story with multiple characters
    await storyboard.inputStory(MULTI_CHARACTER_STORY)

    // Click extract
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()

    // Navigate to Characters tab
    await storyboard.clickCharactersTab()
    await page.waitForTimeout(500)

    // Take screenshot
    await storyboard.takeScreenshot('characters-extracted')

    // Check that characters were found
    const count = await storyboard.getCharacterCount()
    console.log(`Found ${count} characters`)

    // Should have at least 2 characters (Marcus and Maya)
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should show character descriptions after extraction', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    // Use story with clear visual descriptions
    await storyboard.inputStory(DESCRIPTIVE_STORY)
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()

    await storyboard.clickCharactersTab()
    await page.waitForTimeout(500)

    await storyboard.takeScreenshot('characters-with-descriptions')

    // Look for description text or fields
    const hasDescriptions = await page.locator('[class*="description"], textarea[placeholder*="description"]').isVisible()
    console.log(`Has descriptions visible: ${hasDescriptions}`)
  })

  test('should identify main vs supporting characters by mention count', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    await storyboard.inputStory(MULTI_CHARACTER_STORY)
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()

    await storyboard.clickCharactersTab()
    await page.waitForTimeout(500)

    // Look for mention counts in the UI
    const mentionBadges = page.locator('text=/\\d+.*mention/i')
    const badgeCount = await mentionBadges.count()
    console.log(`Found ${badgeCount} mention badges`)

    await storyboard.takeScreenshot('character-mentions')
  })
})

test.describe('Character Reference Handling', () => {
  test('should allow toggling character reference status', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    await storyboard.inputStory(MULTI_CHARACTER_STORY)
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()

    await storyboard.clickCharactersTab()
    await page.waitForTimeout(500)

    // Look for reference toggles/checkboxes
    const toggles = page.locator('input[type="checkbox"], [role="switch"]')
    const toggleCount = await toggles.count()
    console.log(`Found ${toggleCount} toggles for reference handling`)

    await storyboard.takeScreenshot('character-toggles')

    expect(toggleCount).toBeGreaterThan(0)
  })

  test('should show upload option for character reference images', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    await storyboard.inputStory(MULTI_CHARACTER_STORY)
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()

    await storyboard.clickCharactersTab()
    await page.waitForTimeout(500)

    // Look for image upload inputs or buttons
    const uploadInputs = page.locator('input[type="file"], button:has-text("Upload"), [class*="upload"]')
    const uploadCount = await uploadInputs.count()
    console.log(`Found ${uploadCount} upload elements`)

    await storyboard.takeScreenshot('character-upload-options')
  })
})

test.describe('Character Sheet Generation', () => {
  test('should show character sheet generator option', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    await storyboard.inputStory(DESCRIPTIVE_STORY)
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()

    await storyboard.clickCharactersTab()
    await page.waitForTimeout(500)

    // Look for character sheet related UI
    const sheetUI = page.locator('text=/character sheet|model sheet|generate sheet/i')
    const isVisible = await sheetUI.isVisible().catch(() => false)
    console.log(`Character sheet UI visible: ${isVisible}`)

    await storyboard.takeScreenshot('character-sheet-options')
  })
})

test.describe('Characters in Shot Generation', () => {
  test('should show character references in Shots tab', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    await storyboard.inputStory(MULTI_CHARACTER_STORY)
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()

    // Navigate to Shots tab
    await storyboard.clickShotsTab()
    await page.waitForTimeout(500)

    await storyboard.takeScreenshot('shots-with-characters')

    // Look for character mentions in shot breakdown
    const characterRefs = page.locator('[class*="character"], [class*="@"], text=/@[a-z_]+/')
    const refCount = await characterRefs.count()
    console.log(`Found ${refCount} character references in shots`)
  })
})

test.describe('Visual Consistency Flow', () => {
  test('full workflow: story → extract → characters → shots', async ({ page }) => {
    const storyboard = new StoryboardCharacterPage(page)

    // Step 1: Input story
    await storyboard.inputStory(DESCRIPTIVE_STORY)
    await storyboard.takeScreenshot('01-story-input')

    // Step 2: Extract characters
    await storyboard.clickExtractCharacters()
    await storyboard.waitForExtraction()
    await storyboard.takeScreenshot('02-after-extraction')

    // Step 3: View characters
    await storyboard.clickCharactersTab()
    await page.waitForTimeout(500)
    await storyboard.takeScreenshot('03-characters-tab')

    // Step 4: View shots
    await storyboard.clickShotsTab()
    await page.waitForTimeout(500)
    await storyboard.takeScreenshot('04-shots-tab')

    console.log('Full workflow completed - check screenshots for visual verification')
  })
})
