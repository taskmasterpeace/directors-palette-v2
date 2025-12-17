import { test, expect } from '@playwright/test'

test.describe('Community Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for load
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should display community tab in sidebar', async ({ page }) => {
    // Check that the Community tab exists in the sidebar
    const communityTab = page.locator('[data-tab="community"], button:has-text("Community")')
    await expect(communityTab.first()).toBeVisible()
  })

  test('should navigate to community page', async ({ page }) => {
    // Click on Community tab
    const communityTab = page.locator('[data-tab="community"], button:has-text("Community")')
    await communityTab.first().click()

    // Wait for the community page to load
    await page.waitForTimeout(1000)

    // Check that community page header is visible
    const header = page.locator('h1:has-text("Community")')
    await expect(header).toBeVisible()
  })

  test('should display filter options', async ({ page }) => {
    // Navigate to community
    const communityTab = page.locator('[data-tab="community"], button:has-text("Community")')
    await communityTab.first().click()

    await page.waitForTimeout(1000)

    // Check for type filter
    const typeFilter = page.locator('select, [role="combobox"]').first()
    await expect(typeFilter).toBeVisible()
  })

  test('should display item count in footer', async ({ page }) => {
    // Navigate to community
    const communityTab = page.locator('[data-tab="community"], button:has-text("Community")')
    await communityTab.first().click()

    await page.waitForTimeout(1000)

    // Check for stats footer showing item count
    const itemCount = page.locator('text=/\\d+ items? in community/')
    await expect(itemCount).toBeVisible()
  })

  test('should have refresh button', async ({ page }) => {
    // Navigate to community
    const communityTab = page.locator('[data-tab="community"], button:has-text("Community")')
    await communityTab.first().click()

    await page.waitForTimeout(1000)

    // Check for refresh button
    const refreshButton = page.locator('button:has-text("Refresh")')
    await expect(refreshButton).toBeVisible()
  })
})

test.describe('Community Admin Moderation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin page
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test('should display community tab in admin dashboard', async ({ page }) => {
    // Check that the Community tab exists in admin
    const communityTab = page.locator('button:has-text("Community"), [role="tab"]:has-text("Community")')
    await expect(communityTab.first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to community moderation tab', async ({ page }) => {
    // Click on Community tab in admin
    const communityTab = page.locator('button:has-text("Community"), [role="tab"]:has-text("Community")')
    await communityTab.first().click()

    await page.waitForTimeout(1000)

    // Check for moderation content - either the table or "Pending Review" card
    const content = page.locator('text=/Pending|Community Submissions/')
    await expect(content.first()).toBeVisible()
  })

  test('should have status filter tabs', async ({ page }) => {
    // Click on Community tab in admin
    const communityTab = page.locator('button:has-text("Community"), [role="tab"]:has-text("Community")')
    await communityTab.first().click()

    await page.waitForTimeout(1000)

    // Check for status tabs
    const pendingTab = page.locator('button:has-text("Pending"), [role="tab"]:has-text("Pending")')
    const approvedTab = page.locator('button:has-text("Approved"), [role="tab"]:has-text("Approved")')

    await expect(pendingTab.first()).toBeVisible()
    await expect(approvedTab.first()).toBeVisible()
  })
})
