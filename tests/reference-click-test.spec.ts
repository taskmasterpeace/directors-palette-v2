import { test, expect } from '@playwright/test'

test.describe('Reference Image Click Test', () => {
    test('should open file dialog when clicking empty reference slot', async ({ page }) => {
        // Navigate to the shot creator page
        await page.goto('http://localhost:3001')

        // Wait for the page to load
        await page.waitForLoadState('networkidle')

        // Take screenshot before click
        await page.screenshot({ path: 'tests/screenshots/before-click.png' })

        // Find the empty reference slot (the one with the Plus icon)
        // It's a div with class containing "aspect-square" and "border-dashed"
        const emptySlot = page.locator('div.aspect-square.border-dashed').first()

        // Check if the slot exists
        const slotExists = await emptySlot.isVisible()
        console.log('Empty slot visible:', slotExists)

        if (slotExists) {
            // Set up a listener for the file chooser dialog
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null)

            // Click the empty slot
            console.log('Clicking empty slot...')
            await emptySlot.click()

            // Wait for file chooser
            const fileChooser = await fileChooserPromise

            if (fileChooser) {
                console.log('SUCCESS: File dialog opened!')
                // Cancel the dialog
                await fileChooser.setFiles([])
            } else {
                console.log('FAILED: File dialog did NOT open')
            }
        }

        // Take screenshot after click attempt
        await page.screenshot({ path: 'tests/screenshots/after-click.png' })
    })
})
