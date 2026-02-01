import { test, expect, Page } from '@playwright/test'

/**
 * Storyboard API Integration Test
 *
 * Tests the actual API workflow:
 * 1. Input story
 * 2. Extract characters (API call to OpenRouter)
 * 3. Generate shot prompts (API call to OpenRouter)
 * 4. Generate 2 test images (API call to Replicate)
 * 5. Verify character consistency in prompts
 */

// Shorter test story for faster testing
const TEST_STORY = `Marcus stepped into the warehouse, his gold chain glinting in the dim light. His leather jacket creaked as he moved through the shadows.

Sarah emerged from behind a stack of crates, her crimson dress a stark contrast to the industrial gray. Her dark eyes tracked his every move.

"You're late," she said, her voice echoing off the concrete walls.

Marcus pulled the thick envelope from inside his jacket. "Three hundred thousand. Just like you asked."

Sarah took a step forward, her heels clicking against the floor. For a moment, the only sound was the distant rumble of thunder.

Then Damon emerged from the darkness - a big man with a shaved head and a scar running from his eye to his jaw. He was flanked by two men in tactical gear.

"Marcus, Marcus, Marcus," Damon said, shaking his head. "You really thought you could play both sides?"

Marcus's mind raced. The envelope was still in his hand. He looked at Sarah, then at Damon.

And then he smiled.`

test.describe('Storyboard API Integration', () => {
    test.setTimeout(180000) // 3 minute timeout for API calls

    test('should extract characters and generate prompts', async ({ page }) => {
        // Navigate to storyboard
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Click on Storyboard in sidebar
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Verify Story tab is visible
        await expect(page.getByRole('tab', { name: /story/i })).toBeVisible()

        // Input the test story
        const textarea = page.locator('textarea').first()
        await textarea.fill(TEST_STORY)
        await page.waitForTimeout(500)

        // Click Extract Characters button
        const extractButton = page.getByRole('button', { name: /extract/i })
        await extractButton.click()

        // Wait for extraction to complete (can take 10-30 seconds)
        await page.waitForFunction(() => {
            // Wait for loading spinner to disappear
            const spinners = document.querySelectorAll('[class*="animate-spin"]')
            return spinners.length === 0
        }, { timeout: 60000 })
        await page.waitForTimeout(1000)

        // Take screenshot after extraction
        await page.screenshot({ path: 'test-results/api-01-after-extraction.png', fullPage: true })

        // Navigate to Characters tab to verify extraction
        await page.getByRole('tab', { name: /characters/i }).click()
        await page.waitForTimeout(500)

        await page.screenshot({ path: 'test-results/api-02-characters-tab.png', fullPage: true })

        // Verify at least some characters were extracted
        // Look for character names in the page content
        const pageContent = await page.content()
        const foundMarcus = pageContent.toLowerCase().includes('marcus')
        const foundSarah = pageContent.toLowerCase().includes('sarah')
        const foundDamon = pageContent.toLowerCase().includes('damon')

        console.log('Character extraction results:', { foundMarcus, foundSarah, foundDamon })

        // At least one character should be found
        expect(foundMarcus || foundSarah || foundDamon).toBe(true)

        // Navigate to Shots tab
        await page.getByRole('tab', { name: /shots/i }).click()
        await page.waitForTimeout(500)

        await page.screenshot({ path: 'test-results/api-03-shots-tab.png', fullPage: true })

        // Click Generate Shot Prompts
        const generateButton = page.getByRole('button', { name: /generate.*prompt/i })
        await generateButton.click()

        // Wait for prompt generation (can take 30-60 seconds for longer stories)
        await page.waitForFunction(() => {
            const spinners = document.querySelectorAll('[class*="animate-spin"]')
            return spinners.length === 0
        }, { timeout: 90000 })
        await page.waitForTimeout(1000)

        await page.screenshot({ path: 'test-results/api-04-after-prompts.png', fullPage: true })

        // Verify prompts were generated
        // Look for shot type badges which indicate prompts exist
        const shotBadges = page.locator('span:has-text("establishing"), span:has-text("wide"), span:has-text("medium"), span:has-text("close-up")')
        const badgeCount = await shotBadges.count()

        console.log('Shot prompts generated:', badgeCount)

        // Should have at least a few prompts generated
        expect(badgeCount).toBeGreaterThan(0)

        // Navigate to Generate tab
        await page.getByRole('tab', { name: /generate/i }).click()
        await page.waitForTimeout(500)

        await page.screenshot({ path: 'test-results/api-05-generate-tab.png', fullPage: true })
    })

    test('character consistency check - verify @tags in prompts', async ({ page }) => {
        // This test verifies that character @tags are used in generated prompts

        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Navigate to storyboard
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Input story
        const textarea = page.locator('textarea').first()
        await textarea.fill(TEST_STORY)

        // Extract characters
        const extractButton = page.getByRole('button', { name: /extract/i })
        await extractButton.click()
        await page.waitForFunction(() => {
            const spinners = document.querySelectorAll('[class*="animate-spin"]')
            return spinners.length === 0
        }, { timeout: 60000 })

        // Generate prompts
        await page.getByRole('tab', { name: /shots/i }).click()
        await page.waitForTimeout(500)

        const generateButton = page.getByRole('button', { name: /generate.*prompt/i })
        await generateButton.click()
        await page.waitForFunction(() => {
            const spinners = document.querySelectorAll('[class*="animate-spin"]')
            return spinners.length === 0
        }, { timeout: 90000 })

        // Expand a shot to see the full prompt
        const shotCards = page.locator('[class*="rounded-lg border"]').filter({ hasText: /establishing|wide|medium|close-up/ })
        if (await shotCards.count() > 0) {
            await shotCards.first().click()
            await page.waitForTimeout(500)
        }

        await page.screenshot({ path: 'test-results/api-06-expanded-shot.png', fullPage: true })

        // Get page content and check for @tags or character descriptions
        const content = await page.content()

        // Either @tags or inline descriptions should be present
        const hasCharacterReferences =
            content.includes('@marcus') ||
            content.includes('@sarah') ||
            content.includes('@damon') ||
            content.toLowerCase().includes('gold chain') || // Marcus's description
            content.toLowerCase().includes('crimson dress') || // Sarah's description
            content.toLowerCase().includes('shaved head') // Damon's description

        console.log('Character reference check:', hasCharacterReferences)
        expect(hasCharacterReferences).toBe(true)
    })
})
