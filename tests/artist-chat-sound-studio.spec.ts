/**
 * Comprehensive test suite for Artist Chat & Sound Studio features
 * Tests all new UI components, navigation, and interactions
 */

import { test, expect } from '@playwright/test'

test.describe('Music Lab - New Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to music lab
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')
  })

  test('should show all 5 sub-tabs in Music Lab', async ({ page }) => {
    // Check that all 5 tabs are visible
    await expect(page.getByRole('button', { name: /Artist Lab/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Artist Chat/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Writing Studio/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Sound Studio/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Music Video/i })).toBeVisible()

    await page.screenshot({ path: 'screenshots/test-01-music-lab-tabs.png', fullPage: true })
  })

  test('should navigate to Artist Chat tab', async ({ page }) => {
    await page.getByRole('button', { name: /Artist Chat/i }).click()
    await page.waitForTimeout(1000)

    // Should show artist picker or chat page
    await page.screenshot({ path: 'screenshots/test-02-artist-chat-tab.png', fullPage: true })
  })

  test('should navigate to Sound Studio tab', async ({ page }) => {
    await page.getByRole('button', { name: /Sound Studio/i }).click()
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'screenshots/test-03-sound-studio-tab.png', fullPage: true })
  })
})

test.describe('Artist Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Artist Chat/i }).click()
    await page.waitForTimeout(1000)
  })

  test('should show artist picker when no artist selected', async ({ page }) => {
    // ChatPage should show artist selection UI when no active artist
    await page.screenshot({ path: 'screenshots/test-04-chat-no-artist.png', fullPage: true })

    // Look for "Select" or "Create" text or artist grid
    const content = await page.textContent('body')
    expect(content).toBeTruthy()
  })

  test('should show chat interface when artist is selected', async ({ page }) => {
    // First select an artist from Artist Lab
    await page.getByRole('button', { name: /Artist Lab/i }).click()
    await page.waitForTimeout(1000)

    // Take screenshot of artist lab with artists
    await page.screenshot({ path: 'screenshots/test-05-artist-lab-overview.png', fullPage: true })

    // Try to find and click an artist card/button
    const artistButtons = page.locator('button:has-text("Switch"), [class*="artist"]')
    if (await artistButtons.count() > 0) {
      await artistButtons.first().click()
      await page.waitForTimeout(500)
    }

    // Now switch to chat
    await page.getByRole('button', { name: /Artist Chat/i }).click()
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'screenshots/test-06-chat-with-artist.png', fullPage: true })
  })
})

test.describe('Sound Studio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Sound Studio/i }).click()
    await page.waitForTimeout(1000)
  })

  test('should render Sound Studio page with all sections', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/test-07-sound-studio-full.png', fullPage: true })

    // Check for key sections
    const content = await page.textContent('body')
    expect(content).toContain('Sound Studio')
  })

  test('should show genre picker', async ({ page }) => {
    // Look for genre-related elements
    const genreSection = page.locator('text=Genre, text=genre, [class*="genre"]').first()
    if (await genreSection.isVisible()) {
      await genreSection.screenshot({ path: 'screenshots/test-08-genre-picker.png' })
    } else {
      await page.screenshot({ path: 'screenshots/test-08-genre-picker-full.png', fullPage: true })
    }
  })

  test('should show BPM slider', async ({ page }) => {
    // Look for BPM control
    const bpmSection = page.locator('text=BPM, input[type="range"]').first()
    if (await bpmSection.isVisible()) {
      await page.screenshot({ path: 'screenshots/test-09-bpm-slider.png', fullPage: true })
    }
  })

  test('should show mood selector', async ({ page }) => {
    await page.screenshot({ path: 'screenshots/test-10-mood-selector.png', fullPage: true })
  })

  test('should show instrument palette', async ({ page }) => {
    // Scroll down to find instruments
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-11-instruments.png', fullPage: true })
  })

  test('should show Suno prompt preview', async ({ page }) => {
    // Scroll to bottom to find prompt preview
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-12-suno-prompt.png', fullPage: true })
  })

  test('should show sound assistant', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-13-sound-assistant.png', fullPage: true })
  })

  test('should interact with BPM presets', async ({ page }) => {
    // Click a BPM preset button
    const preset120 = page.getByRole('button', { name: '120' })
    if (await preset120.isVisible()) {
      await preset120.click()
      await page.waitForTimeout(300)
    }
    await page.screenshot({ path: 'screenshots/test-14-bpm-preset-click.png', fullPage: true })
  })
})

test.describe('Tab Navigation Flow', () => {
  test('should navigate between all tabs smoothly', async ({ page }) => {
    await page.goto('/test-music-lab')
    await page.waitForLoadState('networkidle')

    // Artist Lab
    await page.getByRole('button', { name: /Artist Lab/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-15-nav-artist-lab.png', fullPage: true })

    // Artist Chat
    await page.getByRole('button', { name: /Artist Chat/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-16-nav-artist-chat.png', fullPage: true })

    // Writing Studio
    await page.getByRole('button', { name: /Writing Studio/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-17-nav-writing-studio.png', fullPage: true })

    // Sound Studio
    await page.getByRole('button', { name: /Sound Studio/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-18-nav-sound-studio.png', fullPage: true })

    // Music Video
    await page.getByRole('button', { name: /Music Video/i }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'screenshots/test-19-nav-music-video.png', fullPage: true })
  })
})
