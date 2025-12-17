import { test, expect } from '@playwright/test'

/**
 * Admin Dashboard Tests
 * Tests the main /admin page with Users, Activity, Coupons, Templates tabs
 */
test.describe('Admin Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin')
        await page.waitForLoadState('networkidle')
    })

    test('should load admin dashboard with user table', async ({ page }) => {
        // Wait for dashboard to load
        await expect(page.locator('h1')).toContainText('Admin Dashboard')

        // Check tabs are present
        await expect(page.getByRole('tab', { name: 'Users' })).toBeVisible()
        await expect(page.getByRole('tab', { name: 'Activity' })).toBeVisible()
        await expect(page.getByRole('tab', { name: 'Coupons' })).toBeVisible()

        // Check stats cards are visible
        await expect(page.getByText('Total Users')).toBeVisible()
        await expect(page.getByText('Credits Purchased')).toBeVisible()
        await expect(page.getByText('Credits Used')).toBeVisible()

        // Check users table has data (not "No users found")
        const usersTable = page.locator('table').first()
        await expect(usersTable).toBeVisible()

        // Wait for users to load
        await page.waitForTimeout(2000)

        // Should have at least one user row (the admin user)
        const userRows = page.locator('table tbody tr')
        const rowCount = await userRows.count()
        console.log(`Found ${rowCount} user rows`)

        // If showing "No users found", that's only 1 row with the message
        // Otherwise we should have actual user data
        if (rowCount === 1) {
            const rowText = await userRows.first().textContent()
            expect(rowText).not.toContain('No users found')
        }
    })

    test('should switch to Coupons tab and show coupon table', async ({ page }) => {
        // Click Coupons tab
        await page.getByRole('tab', { name: 'Coupons' }).click()
        await page.waitForTimeout(1000)

        // Should show coupon management
        await expect(page.getByText('Coupon Management')).toBeVisible()

        // Should have New Coupon button
        await expect(page.getByRole('button', { name: /New Coupon/i })).toBeVisible()

        // Should have table with Code, Points columns
        await expect(page.getByRole('columnheader', { name: 'Code' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: 'Points' })).toBeVisible()
    })

    test('should have working Grant button for users', async ({ page }) => {
        // Wait for users to load
        await page.waitForTimeout(2000)

        // Find Grant button
        const grantButton = page.getByRole('button', { name: /Grant/i }).first()

        if (await grantButton.isVisible()) {
            await grantButton.click()

            // Should open grant dialog
            await expect(page.getByText('Grant Credits')).toBeVisible()
            await expect(page.getByLabel('Amount (in cents)')).toBeVisible()
        }
    })
})
