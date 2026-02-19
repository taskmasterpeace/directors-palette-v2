import { test, expect } from '@playwright/test'

/**
 * Music Lab Visual Inspection Test
 *
 * Walks through the Music Lab setup phase taking screenshots.
 * Tests all 7 input sections in the setup phase.
 */

test.describe('Music Lab Visual Inspection', () => {
  test('setup phase walkthrough', async ({ page }) => {
    test.setTimeout(120000)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to Music Lab via sidebar
    const musicLabNav = page.locator('button:has-text("Music Lab")')
    if (await musicLabNav.count() > 0) {
      await musicLabNav.first().click()
    }
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'tests/screenshots/musiclab-01-landing.png', fullPage: false })

    // Check main heading / title area
    const heading = page.getByRole('heading', { level: 1 }).or(page.getByRole('heading', { level: 2 }))
    await page.screenshot({ path: 'tests/screenshots/musiclab-02-header.png', fullPage: false })

    // Look for the 7 setup sections
    const sections = [
      'Upload Track',
      'Lyrics',
      'Genre',
      'Visual Style',
      'Scout Location',
      'Creative Vision',
      'Reference Sheet',
    ]

    for (const section of sections) {
      const el = page.getByText(section, { exact: false }).first()
      if (await el.count() > 0) {
        await el.scrollIntoViewIfNeeded()
        await page.waitForTimeout(300)
      }
    }
    await page.screenshot({ path: 'tests/screenshots/musiclab-03-sections-visible.png', fullPage: false })

    // Scroll to check each major section
    const scrollable = page.locator('.overflow-auto, main, [class*="scroll"]').first()

    // Section 1: Audio Upload
    const audioUploader = page.getByText('Upload Track', { exact: false }).or(page.getByText('Upload Audio', { exact: false }))
    if (await audioUploader.count() > 0) {
      await audioUploader.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/musiclab-04-audio-upload.png', fullPage: false })
    }

    // Section 2: Lyrics
    const lyrics = page.getByText('Lyrics', { exact: false })
    if (await lyrics.count() > 0) {
      await lyrics.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/musiclab-05-lyrics.png', fullPage: false })
    }

    // Section 3: Genre
    const genre = page.getByText('Genre', { exact: false })
    if (await genre.count() > 0) {
      await genre.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/musiclab-06-genre.png', fullPage: false })
    }

    // Section 4: Visual Style
    const visualStyle = page.getByText('Visual Style', { exact: false })
    if (await visualStyle.count() > 0) {
      await visualStyle.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/musiclab-07-visual-style.png', fullPage: false })
    }

    // Scroll further down
    if (await scrollable.count() > 0) {
      await scrollable.evaluate(el => el.scrollTop = el.scrollHeight / 2)
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'tests/screenshots/musiclab-08-mid-scroll.png', fullPage: false })
    }

    // Section 5: Scout Locations
    const locations = page.getByText('Scout', { exact: false }).or(page.getByText('Location', { exact: false }))
    if (await locations.count() > 0) {
      await locations.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/musiclab-09-locations.png', fullPage: false })
    }

    // Section 6: Creative Vision / Artist Notes
    const vision = page.getByText('Creative Vision', { exact: false }).or(page.getByText('Artist Notes', { exact: false }))
    if (await vision.count() > 0) {
      await vision.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/musiclab-10-creative-vision.png', fullPage: false })
    }

    // Section 7: Reference Sheets
    const refSheets = page.getByText('Reference Sheet', { exact: false }).or(page.getByText('Reference', { exact: false }))
    if (await refSheets.count() > 0) {
      await refSheets.first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.screenshot({ path: 'tests/screenshots/musiclab-11-reference-sheets.png', fullPage: false })
    }

    // Scroll to bottom to see the Ingest button
    if (await scrollable.count() > 0) {
      await scrollable.evaluate(el => el.scrollTop = el.scrollHeight)
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'tests/screenshots/musiclab-12-bottom.png', fullPage: false })
    }

    // Check for the main action button
    const ingestBtn = page.getByRole('button', { name: /Ingest|Analyze|Structure|Generate/i })
    if (await ingestBtn.count() > 0) {
      await page.screenshot({ path: 'tests/screenshots/musiclab-13-action-button.png', fullPage: false })
    }

    // Try entering some test data
    // Lyrics textarea
    const lyricsTextarea = page.locator('textarea').first()
    if (await lyricsTextarea.count() > 0) {
      await lyricsTextarea.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
    }

    // Genre selector
    const genreSelect = page.locator('select, [role="combobox"], [role="listbox"]').first()
    if (await genreSelect.count() > 0) {
      await genreSelect.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
    }

    await page.screenshot({ path: 'tests/screenshots/musiclab-14-final-state.png', fullPage: false })

    console.log('Music Lab visual inspection complete!')
  })
})
