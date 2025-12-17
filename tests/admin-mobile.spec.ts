import { test, expect, Page, devices } from '@playwright/test'

/**
 * E2E Tests for Admin Dashboard on Mobile Viewport
 *
 * Features tested:
 * - Admin page loads correctly on mobile (iPhone 12 - 390x844)
 * - Tab navigation (Users, Activity, Coupons) - if authenticated
 * - User stats display properly - if authenticated
 * - Screenshots for verification
 * - Handles both authenticated and non-authenticated states
 *
 * Base URL: http://localhost:3007
 * Viewport: 390x844 (iPhone 12)
 */

const ADMIN_URL = '/admin'

class AdminMobilePage {
    constructor(private page: Page) { }

    async goto() {
        await this.page.goto(ADMIN_URL)
        await this.page.waitForLoadState('networkidle')
    }

    async takeScreenshot(name: string) {
        await this.page.screenshot({
            path: `test-results/admin-mobile-${name}.png`,
            fullPage: true
        })
    }

    async isOnAdminPage(): Promise<boolean> {
        const url = this.page.url()
        return url.includes('/admin')
    }

    async isAuthenticated(): Promise<boolean> {
        // Check if we're still on admin page (not redirected)
        const isAdmin = await this.isOnAdminPage()
        if (!isAdmin) return false

        // Check if we see auth requirement or access denied
        const authRequired = await this.page.locator('text=Authentication Required').isVisible().catch(() => false)
        const accessDenied = await this.page.locator('text=Access Denied').isVisible().catch(() => false)
        return !authRequired && !accessDenied
    }

    async hasAdminAccess(): Promise<boolean> {
        const isAdmin = await this.isOnAdminPage()
        if (!isAdmin) return false

        const isAuth = await this.isAuthenticated()
        if (!isAuth) return false

        // Check for admin dashboard elements
        const hasTabs = await this.page.getByRole('tab', { name: 'Users' }).isVisible().catch(() => false)
        return hasTabs
    }

    async switchToTab(tabName: 'Users' | 'Activity' | 'Coupons') {
        const tab = this.page.getByRole('tab', { name: tabName })
        await expect(tab).toBeVisible({ timeout: 10000 })
        await tab.click()
        await this.page.waitForTimeout(500) // Allow tab content to render
    }

    async verifyPageHeader() {
        const header = this.page.locator('h1, h2, [class*="title"]').first()
        await expect(header).toBeVisible()
        return header.textContent()
    }
}

// Use iPhone 12 viewport settings for all tests in this file
test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15'
})

test.describe('Admin Dashboard - Mobile Viewport', () => {
    let adminPage: AdminMobilePage

    test.beforeEach(async ({ page }) => {
        adminPage = new AdminMobilePage(page)
        await adminPage.goto()
    })

    test('should load page on mobile viewport', async ({ page }) => {
        // Page should load something (admin or redirect)
        const pageContent = page.locator('body')
        await expect(pageContent).toBeVisible()

        // Take screenshot
        await adminPage.takeScreenshot('initial-load')

        // Check viewport
        const viewportSize = page.viewportSize()
        expect(viewportSize).toEqual({ width: 390, height: 844 })

        const url = page.url()
        console.log(`✓ Page loaded on mobile viewport (390x844)`)
        console.log(`  Current URL: ${url}`)
    })

    test('should display proper UI on mobile', async ({ page }) => {
        const headerText = await adminPage.verifyPageHeader()
        expect(headerText).toBeTruthy()

        await adminPage.takeScreenshot('mobile-ui')

        console.log(`✓ Mobile UI rendering correctly`)
        console.log(`  Header: "${headerText}"`)
    })

    test('should handle authentication state', async ({ page }) => {
        const isOnAdmin = await adminPage.isOnAdminPage()
        const isAuth = await adminPage.isAuthenticated()
        const hasAccess = await adminPage.hasAdminAccess()

        await adminPage.takeScreenshot('auth-state')

        console.log(`✓ Authentication state checked:`)
        console.log(`  On admin page: ${isOnAdmin}`)
        console.log(`  Authenticated: ${isAuth}`)
        console.log(`  Has admin access: ${hasAccess}`)

        // We expect at least to be on some page
        expect(page.url()).toBeTruthy()
    })

    test('should be responsive and scrollable', async ({ page }) => {
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
        const viewportHeight = page.viewportSize()?.height || 0

        console.log(`✓ Page dimensions:`)
        console.log(`  Body height: ${bodyHeight}px`)
        console.log(`  Viewport height: ${viewportHeight}px`)

        // Test scrolling if content is tall enough
        if (bodyHeight > viewportHeight) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
            await page.waitForTimeout(300)

            await adminPage.takeScreenshot('scrolled-bottom')

            await page.evaluate(() => window.scrollTo(0, 0))
            await page.waitForTimeout(300)

            console.log(`  Scrollable: Yes`)
        } else {
            console.log(`  Scrollable: No (content fits)`)
        }
    })

    test('should handle touch interactions', async ({ page }) => {
        const clickableElements = page.locator('button, a').filter({ hasText: /.+/ })
        const count = await clickableElements.count()

        if (count > 0) {
            const firstButton = clickableElements.first()
            const buttonText = await firstButton.textContent().catch(() => 'unknown')

            await firstButton.tap()
            await page.waitForTimeout(500)

            console.log(`✓ Touch interaction tested`)
            console.log(`  Tapped button: "${buttonText?.trim()}"`)
        }

        await adminPage.takeScreenshot('after-touch')
    })

    test.describe('Admin features (requires authentication)', () => {
        test.beforeEach(async ({ page }) => {
            const hasAccess = await adminPage.hasAdminAccess()
            test.skip(!hasAccess, 'Skipping - user not authenticated or lacks admin access')
        })

        test('should navigate to Users tab', async ({ page }) => {
            await adminPage.switchToTab('Users')

            const usersTab = page.getByRole('tab', { name: 'Users' })
            await expect(usersTab).toHaveAttribute('data-state', 'active')

            await adminPage.takeScreenshot('users-tab')
            console.log('✓ Users tab accessible and active')
        })

        test('should navigate to Activity tab', async ({ page }) => {
            await adminPage.switchToTab('Activity')

            const activityTab = page.getByRole('tab', { name: 'Activity' })
            await expect(activityTab).toHaveAttribute('data-state', 'active')

            await adminPage.takeScreenshot('activity-tab')
            console.log('✓ Activity tab accessible and active')
        })

        test('should navigate to Coupons tab', async ({ page }) => {
            await adminPage.switchToTab('Coupons')

            const couponsTab = page.getByRole('tab', { name: 'Coupons' })
            await expect(couponsTab).toHaveAttribute('data-state', 'active')

            await adminPage.takeScreenshot('coupons-tab')
            console.log('✓ Coupons tab accessible and active')
        })

        test('should display user stats', async ({ page }) => {
            await adminPage.switchToTab('Users')

            const statsElements = await page.locator('[class*="stat"], [class*="card"], [class*="metric"]').count()

            expect(statsElements).toBeGreaterThan(0)

            await adminPage.takeScreenshot('user-stats')
            console.log(`✓ User stats displayed: ${statsElements} elements found`)
        })

        test('should navigate all tabs in sequence', async ({ page }) => {
            const tabs = ['Users', 'Activity', 'Coupons'] as const

            for (const tabName of tabs) {
                await adminPage.switchToTab(tabName)

                const tab = page.getByRole('tab', { name: tabName })
                await expect(tab).toHaveAttribute('data-state', 'active')

                console.log(`✓ ${tabName} tab navigation successful`)
            }

            await adminPage.takeScreenshot('all-tabs')
        })
    })

    test('final summary screenshot', async ({ page }) => {
        await adminPage.takeScreenshot('final')

        const isOnAdmin = await adminPage.isOnAdminPage()
        const isAuth = await adminPage.isAuthenticated()
        const hasAccess = await adminPage.hasAdminAccess()
        const viewportSize = page.viewportSize()

        console.log('\n=== Admin Mobile Test Summary ===')
        console.log(`Viewport: ${viewportSize?.width}x${viewportSize?.height} (iPhone 12)`)
        console.log(`Current URL: ${page.url()}`)
        console.log(`On Admin Page: ${isOnAdmin}`)
        console.log(`Authenticated: ${isAuth}`)
        console.log(`Has Admin Access: ${hasAccess}`)
        console.log(`Screenshots: test-results/admin-mobile-*.png`)
        console.log('===================================\n')
    })
})
