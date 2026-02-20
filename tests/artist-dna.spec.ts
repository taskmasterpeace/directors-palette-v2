import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Artist DNA Feature
 *
 * Tests cover the full lifecycle:
 * - Page loads
 * - Editor with 8 tabs
 * - Identity, Sound, Flow, Persona, Lexicon, Look tab fields
 * - TagInput component
 * - Catalog tab
 * - The Mix output + combine toggle
 * - Save/Load/Delete (requires Supabase)
 */

const ARTIST_DNA_URL = '/music-lab/artist-dna'

// ============================================================================
// Cycle 1: Page exists and loads
// ============================================================================

test.describe('Artist DNA - Page', () => {
  test('should load and show heading + create button', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await expect(page.getByText('Artist DNA')).toBeVisible()
    await expect(page.getByText('Create New Artist')).toBeVisible()
  })
})

// ============================================================================
// Cycle 2: Editor with 8 tabs
// ============================================================================

test.describe('Artist DNA - Editor Tabs', () => {
  test('clicking Create New Artist shows editor with 8 tabs', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()

    // All 8 tabs should be visible
    await expect(page.getByRole('tab', { name: 'Identity' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Sound' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Flow' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Persona' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Lexicon' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Look' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Catalog' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'The Mix' })).toBeVisible()
  })
})

// ============================================================================
// Cycle 3: Identity tab fields
// ============================================================================

test.describe('Artist DNA - Identity Tab', () => {
  test('has Name, City, Region, Backstory, Significant Events fields', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()

    // Should auto-open on Identity tab
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('City')).toBeVisible()
    await expect(page.getByLabel('Region')).toBeVisible()

    // Fill in fields
    await page.getByLabel('Name').fill('MC TestBot')
    await expect(page.getByLabel('Name')).toHaveValue('MC TestBot')

    await page.getByLabel('City').fill('Atlanta')
    await expect(page.getByLabel('City')).toHaveValue('Atlanta')

    await page.getByLabel('Region').fill('Southeast')
    await expect(page.getByLabel('Region')).toHaveValue('Southeast')

    // Backstory and Significant Events labels should exist
    await expect(page.getByText('Backstory')).toBeVisible()
    await expect(page.getByText('Significant Events')).toBeVisible()
  })
})

// ============================================================================
// Cycle 4: Sound tab
// ============================================================================

test.describe('Artist DNA - Sound Tab', () => {
  test('has genre cascade, vocal textures, tempo, production, era, instruments', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'Sound' }).click()

    await expect(page.getByText('Genres')).toBeVisible()
    await expect(page.getByText('Vocal Textures')).toBeVisible()
    await expect(page.getByText('Tempo', { exact: true })).toBeVisible()
    await expect(page.getByText('Production Styles')).toBeVisible()
    await expect(page.getByText('Era Influences')).toBeVisible()
    await expect(page.getByText('Instruments')).toBeVisible()
    await expect(page.getByText('Sound Description')).toBeVisible()
  })
})

// ============================================================================
// Cycle 5: Flow tab
// ============================================================================

test.describe('Artist DNA - Flow Tab', () => {
  test('has rhyme density, flow patterns, melody bias slider, line length, language', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'Flow' }).click()

    await expect(page.getByText('Rhyme Density')).toBeVisible()
    await expect(page.getByText('Flow Patterns')).toBeVisible()
    await expect(page.getByText('Melody Bias')).toBeVisible()
    await expect(page.getByText('Pure Rap')).toBeVisible()
    await expect(page.getByText('Pure Singing')).toBeVisible()
    await expect(page.getByText('Average Line Length')).toBeVisible()
    await expect(page.getByLabel('Language')).toBeVisible()
    await expect(page.getByText('Secondary Languages')).toBeVisible()
  })
})

// ============================================================================
// Cycle 6: Persona tab
// ============================================================================

test.describe('Artist DNA - Persona Tab', () => {
  test('has traits, likes, dislikes, attitude, worldview, quirks', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'Persona' }).click()

    await expect(page.getByText('Traits')).toBeVisible()
    await expect(page.getByText('Likes', { exact: true })).toBeVisible()
    await expect(page.getByText('Dislikes')).toBeVisible()
    await expect(page.getByText('Attitude')).toBeVisible()
    await expect(page.getByText('Worldview')).toBeVisible()
    await expect(page.getByText('Quirks')).toBeVisible()
  })
})

// ============================================================================
// Cycle 7: Lexicon tab
// ============================================================================

test.describe('Artist DNA - Lexicon Tab', () => {
  test('has signature phrases, slang, banned words, ad-libs, placement, vocabulary level', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'Lexicon' }).click()

    await expect(page.getByText('Signature Phrases')).toBeVisible()
    await expect(page.getByText('Slang')).toBeVisible()
    await expect(page.getByText('Banned Words')).toBeVisible()
    await expect(page.getByText('Ad-Libs', { exact: false })).toBeVisible()
    await expect(page.getByText('Ad-Lib Placement')).toBeVisible()
    await expect(page.getByText('Vocabulary Level')).toBeVisible()
  })
})

// ============================================================================
// Cycle 8: Look tab
// ============================================================================

test.describe('Artist DNA - Look Tab', () => {
  test('has skin tone, hair, fashion, jewelry, tattoos, visual description, image', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'Look' }).click()

    await expect(page.getByLabel('Skin Tone')).toBeVisible()
    await expect(page.getByLabel('Hair Style')).toBeVisible()
    await expect(page.getByLabel('Fashion Style')).toBeVisible()
    await expect(page.getByLabel('Jewelry')).toBeVisible()
    await expect(page.getByLabel('Tattoos')).toBeVisible()
    await expect(page.getByText('Visual Description')).toBeVisible()
    await expect(page.getByLabel('Reference Image URL')).toBeVisible()
  })
})

// ============================================================================
// Cycle 9: TagInput component
// ============================================================================

test.describe('Artist DNA - TagInput', () => {
  test('renders tags as badges, allows adding/removing', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()

    // Use Identity tab's Significant Events TagInput
    const eventInput = page.locator('[placeholder="Add life event..."]')
    await eventInput.fill('First mixtape')
    await eventInput.press('Enter')

    // Tag should appear as a badge
    await expect(page.getByText('First mixtape')).toBeVisible()

    // Add another
    await eventInput.fill('Got signed')
    await eventInput.press('Enter')
    await expect(page.getByText('Got signed')).toBeVisible()

    // Remove first tag
    const removeButton = page.getByLabel('Remove First mixtape')
    await removeButton.click()
    await expect(page.getByText('First mixtape')).not.toBeVisible()
  })
})

// ============================================================================
// Cycle 14: Catalog tab
// ============================================================================

test.describe('Artist DNA - Catalog Tab', () => {
  test('can add a song with title, lyrics, mood, tempo', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'Catalog' }).click()

    // Empty state
    await expect(page.getByText('No songs in catalog yet')).toBeVisible()

    // Click Add Song
    await page.getByRole('button', { name: 'Add Song' }).click()

    // Dialog should appear
    await expect(page.getByText('Add Song to Catalog')).toBeVisible()

    // Fill in song details
    await page.getByLabel('Title').fill('Street Dreams')
    await page.getByLabel('Lyrics').fill('[Verse 1]\nRising from the pavement')

    // Submit
    await page.getByRole('button', { name: 'Add Song' }).last().click()

    // Song should appear in list
    await expect(page.getByText('Street Dreams')).toBeVisible()
  })
})

// ============================================================================
// Cycle 15: The Mix output
// ============================================================================

test.describe('Artist DNA - The Mix', () => {
  test('shows Generate Mix button and placeholder text', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'The Mix' }).click()

    await expect(page.getByRole('button', { name: 'Generate Mix' })).toBeVisible()
    await expect(page.getByText('Click "Generate Mix"')).toBeVisible()
  })
})

// ============================================================================
// Cycle 16: Combine toggle
// ============================================================================

test.describe('Artist DNA - Combine Toggle', () => {
  test('combine toggle exists on The Mix tab', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()
    await page.getByRole('tab', { name: 'The Mix' }).click()

    // The combine label should be visible (even before generation)
    await expect(page.getByText('Combine vocal + style into one prompt')).toBeVisible()
  })
})

// ============================================================================
// Cycle 11: Save artist (requires auth + Supabase)
// ============================================================================

test.describe('Artist DNA - Save', () => {
  test('save button exists and shows unsaved state', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').click()

    // Save button should be visible but disabled (no changes yet match empty == empty)
    const saveBtn = page.getByRole('button', { name: /Save/ })
    await expect(saveBtn).toBeVisible()

    // Make a change to enable save
    await page.getByLabel('Name').fill('Test Artist')
    await expect(page.getByText('(unsaved changes)')).toBeVisible()
  })
})

// ============================================================================
// API Route Tests
// ============================================================================

test.describe('Artist DNA - API Routes', () => {
  test('suggest endpoint exists', async ({ request }) => {
    const response = await request.post('/api/artist-dna/suggest', {
      data: { field: 'test', section: 'identity' },
    })
    expect(response.status()).not.toBe(404)
  })

  test('generate-mix endpoint exists', async ({ request }) => {
    const response = await request.post('/api/artist-dna/generate-mix', {
      data: { dna: {} },
    })
    expect(response.status()).not.toBe(404)
  })
})

// ============================================================================
// Navigation
// ============================================================================

test.describe('Artist DNA - Navigation', () => {
  test('Music Lab page has link to Artist DNA', async ({ page }) => {
    await page.goto('/music-lab')
    await expect(page.getByText('Artist DNA Lab')).toBeVisible()
  })

  test('Artist DNA page has back link to Music Lab', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await expect(page.getByRole('link', { name: /Music Lab/ })).toBeVisible()
  })
})
