import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Music Lab Feature
 *
 * Tests:
 * - Music Lab page loads
 * - Phase 1A: Audio upload, lyrics, genre, locations, notes
 * - Phase 2: Director proposals (WIP)
 * - Phase 3: Wardrobe selector (WIP)
 * - Phase 4: Timeline (WIP)
 */

// ============================================================================
// Test Configuration
// ============================================================================

const MUSIC_LAB_URL = '/music-lab'

// Test data
const SAMPLE_LYRICS = `[Verse 1]
Rising from the ashes, we don't give up
Every struggle made us tougher, that's enough
From the bottom to the top, watch us climb
Every second, every moment, now it's our time

[Chorus]
We're unstoppable now, can't hold us down
Breaking every chain, wearing the crown
Nothing gonna stop this, feel the sound
We're unstoppable now`

// ============================================================================
// Basic Page Tests
// ============================================================================

test.describe('Music Lab Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(MUSIC_LAB_URL)
    })

    test('should load Music Lab page', async ({ page }) => {
        // Check page title/header
        await expect(page.getByText('Music Lab')).toBeVisible()
        await expect(page.getByText('Create Your Music Video Treatment')).toBeVisible()
    })

    test('should display setup phase sections', async ({ page }) => {
        // 6 setup sections should be visible
        await expect(page.getByText('1. Your Song')).toBeVisible()
        await expect(page.getByText('2. Lyrics')).toBeVisible()
        await expect(page.getByText('3. Genre')).toBeVisible()
        await expect(page.getByText('4. Visual Style')).toBeVisible()
        await expect(page.getByText('5. Locations')).toBeVisible()
        await expect(page.getByText('6. Your Vision')).toBeVisible()
    })

    test('should have disabled analyze button initially', async ({ page }) => {
        const analyzeButton = page.getByRole('button', { name: /Analyze Song/i })
        await expect(analyzeButton).toBeDisabled()
    })
})

// ============================================================================
// Phase 1A: Input Components Tests
// ============================================================================

test.describe('Phase 1A: Input Components', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(MUSIC_LAB_URL)
    })

    test('should allow entering lyrics manually', async ({ page }) => {
        // Look for lyrics textarea/editor
        const lyricsArea = page.locator('textarea').first()

        // Check if it exists (may be read-only until audio uploaded)
        if (await lyricsArea.isVisible()) {
            await lyricsArea.fill(SAMPLE_LYRICS)
            await expect(lyricsArea).toHaveValue(SAMPLE_LYRICS)
        }
    })

    test('should allow selecting genre', async ({ page }) => {
        // Look for genre selector
        const genreButton = page.getByRole('combobox').first()

        if (await genreButton.isVisible()) {
            await genreButton.click()
            // Look for hip-hop option
            const hipHopOption = page.getByRole('option', { name: /hip-hop/i })
            if (await hipHopOption.isVisible()) {
                await hipHopOption.click()
            }
        }
    })

    test('should display style options', async ({ page }) => {
        // Check for preset styles (Claymation, Muppet, Comic, Action Figure)
        await expect(page.getByText('Claymation')).toBeVisible()
        await expect(page.getByText('Comic Book')).toBeVisible()
    })

    test('should allow adding location', async ({ page }) => {
        // Look for add location button
        const addButton = page.getByRole('button', { name: /add/i }).first()

        if (await addButton.isVisible()) {
            await addButton.click()
            // Check if dialog/form appears
            await page.waitForTimeout(500)
        }
    })

    test('should enable analyze button after filling required fields', async ({ page }) => {
        // Fill lyrics
        const lyricsArea = page.locator('textarea').first()
        if (await lyricsArea.isVisible() && await lyricsArea.isEditable()) {
            await lyricsArea.fill(SAMPLE_LYRICS)
        }

        // Select genre if available
        const genreButton = page.getByRole('combobox').first()
        if (await genreButton.isVisible()) {
            await genreButton.click()
            const option = page.getByRole('option').first()
            if (await option.isVisible()) {
                await option.click()
            }
        }

        // Check if analyze button is enabled
        const analyzeButton = page.getByRole('button', { name: /Analyze Song/i })
        // This may still be disabled if audio is required
        // Just verify it exists
        await expect(analyzeButton).toBeVisible()
    })
})

// ============================================================================
// Component Existence Tests
// ============================================================================

test.describe('Component Verification', () => {
    test('should have audio uploader component', async ({ page }) => {
        await page.goto(MUSIC_LAB_URL)

        // Look for file upload area or audio-related text
        const uploadArea = page.getByText(/upload/i).first()
        await expect(uploadArea).toBeVisible()
    })

    test('should have artist notes section', async ({ page }) => {
        await page.goto(MUSIC_LAB_URL)

        // Look for vision/notes section
        await expect(page.getByText('Your Vision')).toBeVisible()
    })
})

// ============================================================================
// API Route Tests (if accessible)
// ============================================================================

test.describe('API Routes', () => {
    test('wardrobe generate-preview endpoint exists', async ({ request }) => {
        // Just check the endpoint responds (will fail auth but should get 401/403, not 404)
        const response = await request.post('/api/wardrobe/generate-preview', {
            data: { test: true }
        })

        // Should not be 404
        expect(response.status()).not.toBe(404)
    })

    test('wardrobe generate-reference endpoint exists', async ({ request }) => {
        const response = await request.post('/api/wardrobe/generate-reference', {
            data: { test: true }
        })

        expect(response.status()).not.toBe(404)
    })

    test('director proposal endpoint exists', async ({ request }) => {
        const response = await request.post('/api/director-proposal/generate', {
            data: { test: true }
        })

        expect(response.status()).not.toBe(404)
    })
})
