import { test, expect } from '@playwright/test'

/**
 * Visual capture of the Artist Creation Wizard doors.
 * Saves screenshots to screenshots/wizard-*.png for design iteration.
 */

test.describe('Artist Wizard - Visual Capture', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/music-lab/artist-dna')
    await page.waitForLoadState('networkidle')
  })

  test('door selector full page', async ({ page }) => {
    await page.getByText('Create New Artist').first().click()
    await page.waitForTimeout(300)
    await expect(page.getByText(/Inspired by an artist/i)).toBeVisible()
    await page.screenshot({ path: 'screenshots/wizard-doors.png', fullPage: true })
  })

  test('door selector mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByText('Create New Artist').first().click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: 'screenshots/wizard-doors-mobile.png', fullPage: true })
  })

  test('door 1 screen', async ({ page }) => {
    await page.getByText('Create New Artist').first().click()
    await page.getByText(/Inspired by an artist/i).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: 'screenshots/wizard-door1.png', fullPage: true })
  })

  test('door 2 screen', async ({ page }) => {
    await page.getByText('Create New Artist').first().click()
    await page.getByText(/Build it/i).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: 'screenshots/wizard-door2.png', fullPage: true })
  })

  test('door 3 screen', async ({ page }) => {
    await page.getByText('Create New Artist').first().click()
    await page.getByText(/Surprise me/i).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: 'screenshots/wizard-door3.png', fullPage: true })
  })
})
