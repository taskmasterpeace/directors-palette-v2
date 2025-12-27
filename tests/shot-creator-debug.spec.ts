import { test, expect } from '@playwright/test'

/**
 * Debug test to investigate duplicate image display in shot creator
 */

test('investigate shot creator image display', async ({ page }) => {
    // Navigate to shot creator (assuming it's the main page or a specific route)
    await page.goto('http://localhost:3002/')
    await page.waitForLoadState('networkidle')

    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000)

    // Take a screenshot of the initial state
    await page.screenshot({
        path: 'shot-creator-initial.png',
        fullPage: true
    })

    // Try to find and click on the shot creator tab/section
    const shotCreatorTab = page.getByRole('tab', { name: /shot creator/i })
    if (await shotCreatorTab.count() > 0) {
        await shotCreatorTab.click()
        await page.waitForTimeout(1000)
        await page.screenshot({
            path: 'shot-creator-tab.png',
            fullPage: true
        })
    }

    // Try to upload/add an image to see the duplicate display
    // Look for the upload button or drop zone
    const uploadButton = page.getByText(/add reference|browse|upload/i).first()
    if (await uploadButton.count() > 0) {
        await page.screenshot({
            path: 'shot-creator-before-upload.png',
            fullPage: true
        })

        // Create a test image file
        const testImagePath = 'tests/fixtures/test-image.png'

        // If we have a file input, use it
        const fileInput = page.locator('input[type="file"]').first()
        if (await fileInput.count() > 0) {
            // Set the file - this will require a test image
            // For now, just take a screenshot showing where we'd upload
            await page.screenshot({
                path: 'shot-creator-upload-area.png',
                fullPage: true
            })
        }
    }

    // Print the page structure for debugging
    const body = await page.locator('body').innerHTML()
    console.log('Page structure loaded')

    // Look for any duplicate image elements
    const images = page.locator('img')
    const imageCount = await images.count()
    console.log(`Found ${imageCount} img elements on the page`)

    // Screenshot the reference manager area
    const referenceManager = page.locator('[class*="reference"], [class*="Reference"]').first()
    if (await referenceManager.count() > 0) {
        await referenceManager.screenshot({ path: 'reference-manager-area.png' })
    }
})

test('add image and check for duplicates', async ({ page }) => {
    await page.goto('http://localhost:3002/')
    await page.waitForLoadState('networkidle')

    // Navigate to shot creator if needed
    const shotCreatorTab = page.getByRole('tab', { name: /shot creator/i })
    if (await shotCreatorTab.count() > 0) {
        await shotCreatorTab.click()
        await page.waitForTimeout(1000)
    }

    // Look for the reference image area
    const dropZone = page.locator('[class*="drop-zone"], [class*="DropZone"]').first()

    // Take screenshot before
    await page.screenshot({
        path: 'before-image-add.png',
        fullPage: true
    })

    // Pause for manual inspection
    console.log('\n\n=== PAUSED FOR MANUAL INSPECTION ===')
    console.log('Open http://localhost:3002/ in your browser')
    console.log('Add an image to the reference manager')
    console.log('Screenshots saved to:')
    console.log('  - shot-creator-initial.png')
    console.log('  - shot-creator-tab.png')
    console.log('  - before-image-add.png')
    console.log('=====================================\n\n')
})
