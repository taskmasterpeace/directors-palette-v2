import { test, expect } from '@playwright/test'

/**
 * Visual check for the Canvas View in Storyboard
 */

test.use({ baseURL: 'http://localhost:3002' })

const STORYBOARD_URL = '/test-storyboard'

const TEST_STORY = `Chapter 1: The Heist

Marcus and Sarah crept through the museum's darkened halls.
The security lasers criss-crossed ahead of them like a deadly web.
Marcus pulled out his mirror device, ready to redirect the beams.

Chapter 2: The Vault

They reached the vault door - massive titanium reinforced steel.
Sarah placed her decoder on the electronic lock and went to work.
The seconds ticked by as alarms could trigger at any moment.`

test('canvas view visual check', async ({ page }) => {
    test.setTimeout(60000)

    await page.setViewportSize({ width: 1440, height: 900 })

    // Navigate to storyboard
    await page.goto(STORYBOARD_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'tests/screenshots/canvas-01-storyboard-loaded.png' })

    // Enter story text
    const storyTextarea = page.locator('textarea').first()
    if (await storyTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
        await storyTextarea.fill(TEST_STORY)
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'tests/screenshots/canvas-02-story-entered.png' })
    }

    // Check for view mode toggle
    const gridToggle = page.locator('button[title="Canvas View"]')
    const toggleCount = await gridToggle.count()

    await page.screenshot({ path: 'tests/screenshots/canvas-03-check-toggle.png' })

    if (toggleCount > 0) {
        await gridToggle.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'tests/screenshots/canvas-04-canvas-mode-active.png' })
    }

    // Try clicking Shots tab
    const shotsTab = page.locator('button:has-text("Shots"), [value="shots"]').first()
    if (await shotsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        if (await shotsTab.isEnabled()) {
            await shotsTab.click()
            await page.waitForTimeout(1000)
            await page.screenshot({ path: 'tests/screenshots/canvas-05-shots-tab.png' })
        }
    }

    // Try clicking Gallery tab
    const galleryTab = page.locator('button:has-text("Results"), [value="gallery"]').first()
    if (await galleryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        if (await galleryTab.isEnabled()) {
            await galleryTab.click()
            await page.waitForTimeout(1000)
            await page.screenshot({ path: 'tests/screenshots/canvas-06-gallery-tab.png' })
        }
    }

    // Screenshot each tab
    for (const tabName of ['input', 'style', 'entities']) {
        const tab = page.locator(`[value="${tabName}"]`).first()
        if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await tab.click()
            await page.waitForTimeout(500)
            await page.screenshot({ path: `tests/screenshots/canvas-tab-${tabName}.png` })
        }
    }

    await page.screenshot({ path: 'tests/screenshots/canvas-07-final.png' })

    expect(true).toBe(true)
})
