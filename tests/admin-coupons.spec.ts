import { test, expect } from '@playwright/test'

/**
 * Admin Coupons Page Tests
 *
 * NOTE: These tests require authentication. To run them:
 * 1. Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local
 * 2. Ensure the test user has admin privileges
 */
test.describe('Admin Coupons Page', () => {
    // Skip tests if no auth is set up
    test.skip(({ browserName }) => !process.env.TEST_USER_EMAIL, 'Skipping - no auth configured')

    test.beforeEach(async ({ page }) => {
        // Navigate to admin coupons page (uses baseURL from config)
        await page.goto('/admin/coupons')
        await page.waitForLoadState('networkidle')
    })

    test('should load coupons page without console errors', async ({ page }) => {
        // Capture console errors
        const consoleErrors: string[] = []
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text())
            }
        })

        // Wait for page to fully render
        await page.waitForTimeout(2000)

        // Check that the page title is visible
        await expect(page.locator('h1')).toContainText('Admin Dashboard')

        // Check that tabs are present
        await expect(page.getByRole('tab', { name: 'Coupon Management' })).toBeVisible()
        await expect(page.getByRole('tab', { name: 'User Stats' })).toBeVisible()

        // Verify no "unique key" errors occurred
        const keyErrors = consoleErrors.filter(e => e.includes('unique "key"'))
        expect(keyErrors.length).toBe(0)
    })

    test('should display coupon table with proper columns', async ({ page }) => {
        // Check that the coupons table is present
        await expect(page.locator('table').first()).toBeVisible()

        // Check table headers
        await expect(page.getByRole('columnheader', { name: 'Code' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: 'Credits' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    })

    test('should switch to User Stats tab without crashing', async ({ page }) => {
        // Capture page errors
        const pageErrors: string[] = []
        page.on('pageerror', err => pageErrors.push(err.message))

        // Click on User Stats tab
        await page.getByRole('tab', { name: 'User Stats' }).click()
        await page.waitForTimeout(1000)

        // Check for user stats table headers
        await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: 'Generations' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: 'Credits Used' })).toBeVisible()

        // Verify no crashes occurred (the user_id?.slice fix)
        const sliceErrors = pageErrors.filter(e => e.includes('slice'))
        expect(sliceErrors.length).toBe(0)
    })

    test('should have working search in User Stats', async ({ page }) => {
        // Click on User Stats tab
        await page.getByRole('tab', { name: 'User Stats' }).click()
        await page.waitForTimeout(500)

        // Find and use the search input
        const searchInput = page.getByPlaceholder('Search email...')
        await expect(searchInput).toBeVisible()

        // Type in search - should not crash
        await searchInput.fill('test@example.com')
        await page.waitForTimeout(300)

        // Search should filter without errors
        await expect(searchInput).toHaveValue('test@example.com')
    })

    test('should open New Coupon dialog', async ({ page }) => {
        // Find and click New Coupon button
        const newCouponBtn = page.getByRole('button', { name: /New Coupon/i })
        await expect(newCouponBtn).toBeVisible()

        await newCouponBtn.click()

        // Check dialog opened
        await expect(page.getByText('Create New Coupon')).toBeVisible()
        await expect(page.getByPlaceholder('e.g. SUMMER2025')).toBeVisible()
    })
})

// API-level smoke tests that don't require authentication
test.describe('API Smoke Tests', () => {
    test('coupons API should respond without crashing', async ({ request }) => {
        const response = await request.get('/api/coupons')
        // Should return 401 (unauthorized) or 200, not 500
        expect([200, 401, 403]).toContain(response.status())
    })

    test('admin users API should respond without crashing', async ({ request }) => {
        const response = await request.get('/api/admin/users')
        // Should return 401 (unauthorized) or 200, not 500
        expect([200, 401, 403]).toContain(response.status())
    })
})
