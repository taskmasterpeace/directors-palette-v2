import { test, expect } from '@playwright/test'

/**
 * Camera Angle (Qwen Image Edit) - Integration Test
 */

test.describe('Camera Angle Model', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)
    })

    test('select camera angle model and verify gizmo appears', async ({ page }) => {
        await page.screenshot({ path: 'test-results/camera-01-loaded.png', fullPage: true })

        // Click the visible model selector
        const modelSelector = page.locator('button[role="combobox"]:visible').filter({ hasText: /Turbo|Banana|Camera|Edit/i }).first()
        await modelSelector.click()
        await page.waitForTimeout(500)

        // Select Camera Angle
        await page.locator('[role="option"]').filter({ hasText: 'Camera Angle' }).first().click()
        await page.waitForTimeout(2000)

        // Verify model changed
        const currentModel = await modelSelector.textContent()
        expect(currentModel).toContain('Camera Angle')
        await page.screenshot({ path: 'test-results/camera-02-selected.png', fullPage: true })

        // Scroll the settings panel to show the camera gizmo
        await page.evaluate(() => {
            document.querySelectorAll('[class*="overflow-auto"], [class*="overflow-y"], [style*="overflow"]').forEach(el => {
                if (el.scrollHeight > el.clientHeight) {
                    (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight
                }
            })
        })
        await page.waitForTimeout(1500)
        await page.screenshot({ path: 'test-results/camera-03-gizmo.png', fullPage: true })

        // Verify gizmo elements exist
        expect(await page.getByText('Rotate').count()).toBeGreaterThan(0)
        expect(await page.getByText('Tilt').count()).toBeGreaterThan(0)
        expect(await page.locator('button').filter({ hasText: /^Front$/ }).count()).toBeGreaterThan(0)

        // Click presets via dispatchEvent (avoids visibility issues from duplicate hidden elements)
        for (const preset of ['Front', 'Right', 'Back', 'Hero Low', 'Close-up']) {
            const btn = page.locator('button:visible').filter({ hasText: new RegExp(`^${preset}$`) }).first()
            if (await btn.count() > 0) {
                await btn.dispatchEvent('click')
                await page.waitForTimeout(300)
                console.log(`Clicked preset: ${preset}`)
            }
        }

        await page.screenshot({ path: 'test-results/camera-04-after-presets.png', fullPage: true })

        // Check description overlay updated
        const desc = page.locator('.backdrop-blur-sm:visible').first()
        if (await desc.count() > 0) {
            console.log('Camera description:', await desc.textContent())
        }

        await page.screenshot({ path: 'test-results/camera-05-final.png', fullPage: true })
    })
})
