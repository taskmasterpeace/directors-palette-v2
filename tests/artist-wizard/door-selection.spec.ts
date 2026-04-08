import { test, expect } from '@playwright/test'

/**
 * Smoke test for the Artist Creation Wizard door selection screen.
 *
 * Covers the entry point added in the Artist Creation Wizard feature:
 * clicking "Create New Artist" routes to the three-door selector instead
 * of dropping straight into the 6-tab editor.
 */

const ARTIST_DNA_URL = '/music-lab/artist-dna'

test.describe('Artist Wizard - Door Selection', () => {
  test('Create New Artist shows three-door selector', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').first().click()

    // Three door cards should render
    await expect(page.getByText(/Inspired by an artist/i)).toBeVisible()
    await expect(page.getByText(/Build it/i)).toBeVisible()
    await expect(page.getByText(/Surprise me/i)).toBeVisible()
  })

  test('Door 1 opens the seed-from-artist input', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').first().click()
    await page.getByText(/Inspired by an artist/i).click()

    await expect(page.getByPlaceholder(/kendrick|artist name|real artist/i)).toBeVisible()
  })

  test('Door 3 requires a base genre before ROLL enables', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').first().click()
    await page.getByText(/Surprise me/i).click()

    const rollButton = page.getByRole('button', { name: /roll/i })
    await expect(rollButton).toBeVisible()
    await expect(rollButton).toBeDisabled()
  })

  test('Door 2 Generate is disabled with no description and no pins', async ({ page }) => {
    await page.goto(ARTIST_DNA_URL)
    await page.getByText('Create New Artist').first().click()
    await page.getByText(/Build it/i).click()

    const generateButton = page.getByRole('button', { name: /generate/i })
    await expect(generateButton).toBeVisible()
    await expect(generateButton).toBeDisabled()
  })
})
