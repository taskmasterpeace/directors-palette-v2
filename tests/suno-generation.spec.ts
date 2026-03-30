/**
 * Suno Music Generation UI Tests
 * Tests Generate Beat (Sound Studio) and Generate Song (Writing Studio)
 * on both desktop and mobile viewports
 */

import { test, expect, Page } from '@playwright/test'

// Tab indices: artist-lab=0, artist-chat=1, writing-studio=2, sound-studio=3, music-video=4
async function clickTab(page: Page, tabName: string) {
  const btn = page.getByRole('button', { name: new RegExp(tabName, 'i') })
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click()
  } else {
    const tabMap: Record<string, number> = {
      'Artist Lab': 0, 'Artist Chat': 1, 'Writing Studio': 2, 'Sound Studio': 3, 'Music Video': 4,
    }
    const idx = tabMap[tabName] ?? 0
    const tabs = page.locator('.flex.items-center.gap-1 > button')
    await tabs.nth(idx).click({ force: true })
  }
  await page.waitForTimeout(1000)
}

test.describe('Sound Studio - Generate Beat (Desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')
    await clickTab(page, 'Sound Studio')
  })

  test('should show Generate Beat button in Suno Prompt section', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Generate Beat/i })
    await expect(generateBtn).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'screenshots/suno-01-generate-beat-button.png', fullPage: true })
  })

  test('should show beat title input field', async ({ page }) => {
    // SunoPromptPreview renders twice (mobile + desktop) — use role to get visible one
    const titleInput = page.getByRole('textbox', { name: /Beat title/i })
    await titleInput.scrollIntoViewIfNeeded()
    await expect(titleInput).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'screenshots/suno-02-beat-title-input.png', fullPage: true })
  })

  test('should show 12 pts cost on Generate Beat button', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /12 pts/i })
    await expect(generateBtn).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'screenshots/suno-03-beat-12pts.png', fullPage: true })
  })

  test('should show copy button next to generate button', async ({ page }) => {
    const copyBtn = page.locator('button[title="Copy to clipboard"]').last()
    await expect(copyBtn).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'screenshots/suno-04-beat-copy-button.png', fullPage: true })
  })

  test('Generate Beat button should be disabled without artist selected', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Generate Beat/i })
    await expect(generateBtn).toBeDisabled()
  })

  test('should allow typing in beat title input', async ({ page }) => {
    const titleInput = page.getByRole('textbox', { name: /Beat title/i })
    await titleInput.scrollIntoViewIfNeeded()
    await titleInput.fill('My Test Beat')
    await expect(titleInput).toHaveValue('My Test Beat')

    await page.screenshot({ path: 'screenshots/suno-05-beat-title-typed.png', fullPage: true })
  })
})

test.describe('Writing Studio - Generate Song (Desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')

    // Try to select an artist so Writing Studio content loads
    const switchBtns = page.locator('button:has-text("Switch")')
    if (await switchBtns.count() > 0) {
      await switchBtns.first().click()
      await page.waitForTimeout(500)
    }

    await clickTab(page, 'Writing Studio')
  })

  test('should show Suno Export panel or artist selection', async ({ page }) => {
    // Writing Studio may show "Select or Create Artist" if no artist exists
    const sunoExport = page.getByText('Suno Export')
    const noArtist = page.getByText(/Select or Create Artist/i)

    // Wait for either to appear
    await expect(sunoExport.or(noArtist)).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'screenshots/suno-06-writing-studio.png', fullPage: true })
  })

  test('should show Generate Song button when Suno Export expanded (if artist exists)', async ({ page }) => {
    const sunoExport = page.getByText('Suno Export')

    // Skip if no artist (Writing Studio shows "Select or Create Artist")
    if (!(await sunoExport.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await sunoExport.click()
    await page.waitForTimeout(500)

    const generateBtn = page.getByRole('button', { name: /Generate Song/i })
    await generateBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(generateBtn).toBeVisible()

    await page.screenshot({ path: 'screenshots/suno-07-generate-song-button.png', fullPage: true })
  })

  test('should show 12 pts and style/lyrics fields when expanded (if artist exists)', async ({ page }) => {
    const sunoExport = page.getByText('Suno Export')

    if (!(await sunoExport.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await sunoExport.click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Style of Music')).toBeVisible()
    await expect(page.getByText('Formatted Lyrics')).toBeVisible()

    const generateBtn = page.getByRole('button', { name: /12 pts/i })
    await generateBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(generateBtn).toBeVisible()

    await page.screenshot({ path: 'screenshots/suno-08-song-expanded.png', fullPage: true })
  })
})

test.describe('Mobile - Sound Studio Generate Beat', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')
    await clickTab(page, 'Sound Studio')
  })

  test('should show Generate Beat button on mobile', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /Generate Beat/i })
    await generateBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(generateBtn).toBeVisible()

    await page.screenshot({ path: 'screenshots/suno-09-mobile-generate-beat.png', fullPage: true })
  })

  test('should show beat title input on mobile', async ({ page }) => {
    const titleInput = page.getByRole('textbox', { name: /Beat title/i })
    await titleInput.scrollIntoViewIfNeeded()
    await expect(titleInput).toBeVisible()

    await page.screenshot({ path: 'screenshots/suno-10-mobile-beat-title.png', fullPage: true })
  })

  test('should show 12 pts on mobile generate button', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /12 pts/i })
    await generateBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(generateBtn).toBeVisible()

    await page.screenshot({ path: 'screenshots/suno-11-mobile-12pts.png', fullPage: true })
  })

  test('full mobile Sound Studio layout', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/suno-12-mobile-sound-studio-top.png', fullPage: false })

    const generateBtn = page.getByRole('button', { name: /Generate Beat/i })
    await generateBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'screenshots/suno-13-mobile-sound-studio-bottom.png', fullPage: false })
  })
})

test.describe('Mobile - Writing Studio Generate Song', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')

    const switchBtns = page.locator('button:has-text("Switch")')
    if (await switchBtns.count() > 0) {
      await switchBtns.first().click({ force: true })
      await page.waitForTimeout(500)
    }

    await clickTab(page, 'Writing Studio')
  })

  test('should show Suno Export or artist selection on mobile', async ({ page }) => {
    const sunoExport = page.getByText('Suno Export')
    const noArtist = page.getByText(/Select or Create Artist/i)

    await expect(sunoExport.or(noArtist)).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'screenshots/suno-14-mobile-writing-studio.png', fullPage: true })
  })

  test('should show Generate Song on mobile when expanded (if artist exists)', async ({ page }) => {
    const sunoExport = page.getByText('Suno Export')

    if (!(await sunoExport.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await sunoExport.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await sunoExport.click()
    await page.waitForTimeout(500)

    const generateBtn = page.getByRole('button', { name: /Generate Song/i })
    await generateBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await expect(generateBtn).toBeVisible()

    await page.screenshot({ path: 'screenshots/suno-15-mobile-generate-song.png', fullPage: true })
  })
})
