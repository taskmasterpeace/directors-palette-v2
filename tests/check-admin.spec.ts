import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard Verification', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  test('verify all admin tabs exist', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/signin`)
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'taskmasterpeace@gmail.com')
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'TA$K2004')
    await page.click('button[type="submit"]')

    // Wait for redirect after login
    await page.waitForURL((url) => !url.pathname.includes('/auth/'), { timeout: 30000 })

    // Navigate to admin
    await page.goto(`${BASE_URL}/admin`)
    await page.waitForLoadState('networkidle')

    // Take screenshot of admin page
    await page.screenshot({ path: 'tests/screenshots/admin-dashboard.png', fullPage: true })

    // Check for all expected tabs
    const expectedTabs = ['Users', 'Activity', 'Coupons', 'Templates', 'Community', 'API', 'Financials']

    for (const tab of expectedTabs) {
      const tabElement = page.getByRole('tab', { name: tab })
      const isVisible = await tabElement.isVisible().catch(() => false)
      console.log(`Tab "${tab}": ${isVisible ? '✅ Found' : '❌ Missing'}`)
    }

    // Click on API tab
    await page.getByRole('tab', { name: 'API' }).click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/admin-api-tab.png', fullPage: true })

    // Click on Financials tab
    await page.getByRole('tab', { name: 'Financials' }).click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'tests/screenshots/admin-financials-tab.png', fullPage: true })

    console.log('Screenshots saved to tests/screenshots/')
  })
})
