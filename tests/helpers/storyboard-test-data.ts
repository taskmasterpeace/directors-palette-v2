/**
 * Test Data Helpers for Storyboard Tests
 * Utilities for creating test stories and managing storyboard test data
 */

import { Page } from '@playwright/test'

// ============================================================================
// Story Templates
// ============================================================================

/**
 * Short story (no chapters expected)
 */
export const SHORT_STORIES = {
  ACTION: `The warrior stood at the edge of the cliff, sword drawn.
The wind howled around him as enemy forces gathered below.
With a battle cry, he leaped into the fray.`,

  ROMANCE: `She saw him across the crowded coffee shop.
Their eyes met, and time seemed to stop.
He smiled, and her heart skipped a beat.`,

  MYSTERY: `The detective examined the crime scene carefully.
A single clue caught her attention - a torn photograph.
Someone had been here before the police arrived.`,
}

/**
 * Long story with explicit "Chapter N" markers
 */
export const CHAPTER_MARKED_STORY = `Chapter 1: The Beginning

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

/**
 * Story with "---" divider markers
 */
export const DIVIDER_MARKED_STORY = `The heroes gathered at the tavern, planning their next move.
They knew the dragon's lair was just over the mountain.
The innkeeper warned them of the dangers ahead.

---

The journey was treacherous. Storms battered the party as they climbed.
When they finally reached the cave entrance, they paused to catch their breath.
The smell of sulfur filled the air.

---

Inside the lair, treasure glittered in the firelight.
The dragon slept atop its hoard, scales gleaming like armor.
The heroes drew their weapons and prepared for battle.`

/**
 * Story with double-newline markers
 */
export const DOUBLE_NEWLINE_STORY = `The spaceship descended through the clouds of the alien planet.
Captain Torres checked the landing gear and prepared for touchdown.
The crew was anxious but excited.


The surface was unlike anything they'd seen before.
Purple vegetation covered the landscape, pulsing with bioluminescence.
Strange sounds echoed from the nearby forest.


Torres led the expedition toward the mysterious signal.
What they found would change humanity's understanding of the universe.
The ancient structure loomed before them, humming with power.`

/**
 * Story with wildcard variables
 */
export const WILDCARD_STORIES = {
  BATTLE_RAP: `The battle rapper stepped onto _url_large_venue_ stage.
Wearing _designer_wardrobe_, he commanded the crowd's attention.
The atmosphere was electric as he began his verse.
His opponent stood frozen, intimidated by the presence.`,

  FASHION: `The model emerged wearing _streetwear_wardrobe_ for the shoot.
The _url_small_venue_ provided the perfect backdrop.
Photographers captured every angle of the stunning look.`,

  MIXED: `In _url_large_venue_, the champion prepared for battle.
Dressed in _designer_wardrobe_, confidence radiated from every move.
The crowd of _crowd_size_ waited in anticipation.
Tonight would determine the new king of the arena.`,
}

// ============================================================================
// Wildcard Test Data
// ============================================================================

export const WILDCARD_NAMES = {
  VENUES: ['url_large_venue', 'url_small_venue'],
  WARDROBE: ['designer_wardrobe', 'streetwear_wardrobe'],
  CUSTOM: ['crowd_size', 'time_of_day', 'weather'],
}

export const WILDCARD_PATTERNS = {
  VENUE_LARGE: '_url_large_venue_',
  VENUE_SMALL: '_url_small_venue_',
  WARDROBE_DESIGNER: '_designer_wardrobe_',
  WARDROBE_STREET: '_streetwear_wardrobe_',
}

// ============================================================================
// Chapter Detection Test Cases
// ============================================================================

export const CHAPTER_DETECTION_CASES = [
  {
    name: 'Short story - no chapters',
    story: SHORT_STORIES.ACTION,
    expectedChapters: 0,
    expectChapterTabs: false,
  },
  {
    name: 'Explicit Chapter markers',
    story: CHAPTER_MARKED_STORY,
    expectedChapters: 3,
    expectChapterTabs: true,
  },
  {
    name: 'Divider markers (---)',
    story: DIVIDER_MARKED_STORY,
    expectedChapters: 3,
    expectChapterTabs: true,
  },
  {
    name: 'Double newline markers',
    story: DOUBLE_NEWLINE_STORY,
    expectedChapters: 3,
    expectChapterTabs: true,
  },
]

// ============================================================================
// Viewport Presets
// ============================================================================

export const VIEWPORTS = {
  MOBILE_SMALL: { width: 320, height: 568 },
  MOBILE: { width: 375, height: 667 },
  MOBILE_LARGE: { width: 414, height: 896 },
  TABLET: { width: 768, height: 1024 },
  DESKTOP_SMALL: { width: 1024, height: 768 },
  DESKTOP: { width: 1280, height: 720 },
  DESKTOP_LARGE: { width: 1920, height: 1080 },
} as const

// ============================================================================
// Timeouts
// ============================================================================

export const TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 15000,
  LONG: 30000,
  ANALYSIS: 45000,
  PROMPT_GENERATION: 60000,
  IMAGE_GENERATION: 120000,
} as const

// ============================================================================
// URL Constants
// ============================================================================

export const URLS = {
  STORYBOARD: '/test-storyboard',
  SHOT_CREATOR: '/shot-creator',
  GALLERY: '/gallery',
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a random story from templates
 */
export function getRandomShortStory(): string {
  const stories = Object.values(SHORT_STORIES)
  return stories[Math.floor(Math.random() * stories.length)]
}

/**
 * Create a story with specific number of chapters
 */
export function createMultiChapterStory(chapterCount: number): string {
  const chapters: string[] = []

  for (let i = 1; i <= chapterCount; i++) {
    chapters.push(`Chapter ${i}: Section ${i}

This is the content for chapter ${i}.
It contains multiple sentences to ensure proper segmentation.
The hero faces new challenges in this part of the story.
Events unfold that will lead to the next chapter.`)
  }

  return chapters.join('\n\n')
}

/**
 * Create a story with wildcards
 */
export function createWildcardStory(wildcards: string[]): string {
  const lines = wildcards.map((wildcard, index) =>
    `Scene ${index + 1}: The character appears in _${wildcard}_ setting.`
  )
  return lines.join('\n')
}

/**
 * Wait for storyboard page to be ready
 */
export async function waitForStoryboardReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('textarea', { state: 'visible' })
}

/**
 * Input story and analyze
 */
export async function inputAndAnalyzeStory(page: Page, story: string): Promise<void> {
  await page.locator('textarea').first().fill(story)
  await page.getByRole('button', { name: /Analyze|Break.*Down|Process/i }).click()
  await page.waitForSelector('[class*="Loader"]', { state: 'hidden', timeout: TIMEOUTS.ANALYSIS }).catch(() => {})
}

/**
 * Navigate to Generate tab and generate prompts
 */
export async function generatePrompts(page: Page): Promise<void> {
  await page.getByRole('tab', { name: /Generate|Prompts/i }).click()
  await page.getByRole('button', { name: /Generate.*Prompt/i }).click()
  await page.waitForSelector('[class*="Loader"]', { state: 'hidden', timeout: TIMEOUTS.PROMPT_GENERATION }).catch(() => {})
}

/**
 * Count wildcards in text
 */
export function countWildcardsInText(text: string): number {
  const wildcardRegex = /_([a-zA-Z0-9_]+)_/g
  const matches = text.match(wildcardRegex)
  return matches ? matches.length : 0
}

/**
 * Extract wildcard names from text
 */
export function extractWildcardNames(text: string): string[] {
  const wildcardRegex = /_([a-zA-Z0-9_]+)_/g
  const names: string[] = []
  let match

  while ((match = wildcardRegex.exec(text)) !== null) {
    names.push(match[1])
  }

  return names
}

/**
 * Verify wildcard highlighting
 */
export async function verifyWildcardHighlighting(
  page: Page,
  expectedCount: number
): Promise<boolean> {
  const badges = page.locator('[class*="amber"], [class*="wildcard"]')
  const count = await badges.count()
  return count >= expectedCount
}

/**
 * Get chapter tab names
 */
export async function getChapterTabNames(page: Page): Promise<string[]> {
  const tabs = page.locator('[role="tab"]')
  const count = await tabs.count()
  const names: string[] = []

  for (let i = 0; i < count; i++) {
    const text = await tabs.nth(i).textContent()
    if (text) names.push(text)
  }

  return names
}

/**
 * Select specific shots by index
 */
export async function selectShotsByIndex(page: Page, indices: number[]): Promise<void> {
  const checkboxes = page.locator('input[type="checkbox"]')

  for (const index of indices) {
    await checkboxes.nth(index).check()
  }
}

/**
 * Clear all shot selections
 */
export async function clearAllSelections(page: Page): Promise<void> {
  const deselectButton = page.getByRole('button', { name: /Deselect|Clear/i })
  if (await deselectButton.isVisible()) {
    await deselectButton.click()
  }
}

/**
 * Test story validation cases
 */
export const VALIDATION_CASES = {
  EMPTY: {
    input: '',
    expectedError: /Please enter|required|empty/i,
  },
  WHITESPACE_ONLY: {
    input: '   \n\t  ',
    expectedError: /Please enter|required|empty/i,
  },
  TOO_SHORT: {
    input: 'Hi',
    expectedError: /too short|minimum/i,
  },
  VALID_SHORT: {
    input: SHORT_STORIES.ACTION,
    expectedError: null,
  },
  VALID_LONG: {
    input: CHAPTER_MARKED_STORY,
    expectedError: null,
  },
}

/**
 * Style guide options for testing
 */
export const STYLE_GUIDES = {
  CINEMATIC: 'Cinematic',
  ANIME: 'Anime',
  PHOTOREALISTIC: 'Photorealistic',
  COMIC: 'Comic Book',
  NOIR: 'Film Noir',
}
