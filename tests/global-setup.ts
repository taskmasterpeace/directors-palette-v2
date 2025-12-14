import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json')

/**
 * Global setup for Playwright tests
 *
 * This runs ONCE before all tests and handles authentication.
 * The auth state is saved to .auth/user.json and reused by all tests.
 *
 * Required environment variables:
 * - TEST_USER_EMAIL: Email for test account
 * - TEST_USER_PASSWORD: Password for test account
 *
 * Usage:
 *   1. Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.local
 *   2. Run tests: npm test
 */
async function globalSetup(config: FullConfig) {
    const { baseURL } = config.projects[0].use

    // Check for required credentials
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!email || !password) {
        console.log('\n⚠️  TEST_USER_EMAIL and TEST_USER_PASSWORD not set')
        console.log('   Skipping auth setup. Tests requiring auth will fail.\n')
        console.log('   To enable authenticated tests:')
        console.log('   1. Add to .env.local:')
        console.log('      TEST_USER_EMAIL=your-test@email.com')
        console.log('      TEST_USER_PASSWORD=your-password')
        console.log('   2. Re-run tests\n')
        return
    }

    // Check if auth file already exists and is recent (less than 1 hour old)
    if (fs.existsSync(AUTH_FILE)) {
        const stats = fs.statSync(AUTH_FILE)
        const ageMs = Date.now() - stats.mtimeMs
        const ageHours = ageMs / (1000 * 60 * 60)

        if (ageHours < 1) {
            console.log('✓ Using cached auth state (less than 1 hour old)')
            return
        }
    }

    console.log('🔐 Setting up test authentication...')

    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
        // Navigate to login page
        await page.goto(`${baseURL}/auth/signin`)
        await page.waitForLoadState('networkidle')

        // Fill in credentials
        await page.fill('#email', email)
        await page.fill('#password', password)

        // Submit login
        await page.click('button[type="submit"]')

        // Wait for successful login - redirect away from signin
        await page.waitForURL((url) => !url.pathname.includes('/auth/signin'), {
            timeout: 30000
        })

        console.log('✓ Login successful')

        // Ensure auth directory exists
        const authDir = path.dirname(AUTH_FILE)
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true })
        }

        // Save auth state
        await context.storageState({ path: AUTH_FILE })
        console.log('✓ Auth state saved to', AUTH_FILE)

    } catch (error) {
        console.error('❌ Authentication failed:', error)
        console.log('   Check that TEST_USER_EMAIL and TEST_USER_PASSWORD are correct')
        throw error
    } finally {
        await browser.close()
    }
}

export default globalSetup
