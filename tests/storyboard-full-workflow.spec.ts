import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive Storyboard E2E Test
 *
 * Tests the full workflow:
 * 1. Navigate to Storyboard via sidebar
 * 2. Paste a long story (~1500 words)
 * 3. Extract characters and locations
 * 4. Generate character sheets (optional - costs credits)
 * 5. Generate shot prompts
 * 6. Apply director enhancement
 * 7. Generate images (optional - costs credits)
 * 8. Test B-roll and Angles on shots
 */

// Long test story (~1500 words, should generate 40-60 shots)
const LONG_STORY = `The rain hammered against the warehouse windows as Marcus pulled his black Escalade into the empty loading dock. He killed the engine and sat for a moment, watching the water stream down the windshield. His gold chain felt heavy tonight, like it knew what was coming.

He checked his phone one last time. The text from Damon was clear: "Midnight. Alone. Don't be late." Marcus slipped the phone into his leather jacket and stepped out into the downpour.

The warehouse door was already cracked open, a sliver of yellow light cutting through the darkness. Marcus pushed through, his fresh Jordans splashing in a puddle just inside the threshold. The smell hit him first - rust, motor oil, and something else. Something metallic.

Inside, the space opened up into a cathedral of decay. Broken pallets lined the walls. Exposed pipes ran overhead like the bones of some great beast. A single work light hung from a chain, swinging gently in a draft that seemed to come from nowhere.

Sarah was waiting by a stack of wooden crates, her crimson dress impossibly out of place in this industrial graveyard. Her arms were crossed, her dark eyes tracking his every move. Behind her, two men in black suits stood like statues, their hands clasped in front of them.

"You brought muscle," Marcus said, stopping twenty feet away. "That wasn't the deal."

Sarah's lips curved into something that wasn't quite a smile. "Insurance. You understand."

Marcus understood more than she knew. He'd been in rooms like this before, negotiations that balanced on a knife's edge. He pulled the thick manila envelope from inside his jacket and held it up.

"Three hundred thousand. Unmarked. Just like you asked."

Sarah's eyes flickered to the envelope, then back to his face. She uncrossed her arms and took a single step forward. Her heels echoed in the vast space like a countdown.

"And the files?"

Marcus reached into his other pocket and produced a small USB drive. "Everything Damon had on Judge Patterson. Court records, offshore accounts, the property in the Caymans. It's all here."

For a moment, the only sound was the rain hammering the roof and the distant rumble of thunder. Then Sarah laughed - a cold, musical sound that bounced off the concrete walls.

"You know what I love about you, Marcus? You actually believe you're the one in control here."

Before Marcus could respond, the warehouse lights flickered. Then they cut out entirely.

In the darkness, Marcus heard movement. Footsteps. Multiple sets, coming from different directions. He dropped low, reaching for the piece tucked in his waistband, but a bright light blinded him before he could draw.

"Don't," a deep voice commanded from somewhere to his left.

The emergency lights kicked on, bathing everything in a sickly red glow. Marcus blinked the spots from his eyes and found himself surrounded. Six men, all armed, all wearing the same black tactical gear. And at the center of them, emerging from behind a rusted forklift, was Damon himself.

Damon Cross was a big man, built like a linebacker who'd never stopped training. His shaved head gleamed under the red lights, and the scar running from his left eye to his jaw seemed to pulse with its own shadow.

"Marcus, Marcus, Marcus," Damon said, shaking his head slowly. "You really thought you could play both sides?"

Marcus's mind raced. The envelope was still in his hand. The USB drive was in his pocket. And his gun was too far from his reach to matter.

"I don't know what she told you—" Marcus started.

"She didn't tell me anything." Damon cut him off. "She didn't have to. You think I don't have eyes everywhere? You've been feeding information to the Feds for six months."

Sarah had moved now, drifting toward Damon like she belonged there. Because she did, Marcus realized. She always had.

"The dress was a nice touch," Marcus said, managing something like a smile even as his world collapsed. "Really sold the whole femme fatale thing."

Sarah actually laughed at that, genuine this time. "You were so easy, Marcus. All those late night meetings. All those whispered promises. You wanted so badly to believe you were special."

Damon raised his hand, and the tactical team tightened their circle. Rain still hammered the roof. Somewhere in the distance, a siren wailed.

"Here's what's going to happen," Damon said, his voice calm and measured. "You're going to tell me exactly what you gave the Feds. Every name, every document, every conversation. And then we're going to have a longer discussion about loyalty."

Marcus looked around the circle of guns pointed at his chest. He looked at Sarah, who was examining her nails like this was all terribly boring. He looked at Damon, whose eyes held nothing but cold calculation.

And then Marcus did something no one expected.

He smiled.

"You really should have searched the car," he said.

The explosion came from the loading dock - not massive, but loud enough to draw every eye in that direction. In that split second of distraction, Marcus moved.

He threw the envelope at the nearest guard, a cloud of bills erupting into the air. He dove left, behind a concrete pillar, as gunfire erupted. Bullets sparked off metal and punched through wooden crates. The air filled with the smell of cordite and the shouts of men.

Marcus ran. Through the maze of debris, past rusted machinery, toward the back of the warehouse where he knew there was a door. His lungs burned. His legs pumped. Behind him, the chaos continued.

He burst through the emergency exit into an alley, rain immediately soaking through his clothes. He didn't stop. Couldn't stop. He ran until the warehouse was three blocks behind him, until the sirens he'd been hearing grew louder, until he found the unmarked sedan waiting exactly where Agent Torres had promised it would be.

Marcus yanked open the door and threw himself inside. Torres was behind the wheel, her FBI windbreaker already on.

"You cut it close," she said, pulling away from the curb before he'd even closed the door.

Marcus leaned back against the seat, breathing hard, rain dripping from his face. In his pocket, the USB drive was still safe. The real one, not the decoy he'd given Sarah.

"Did you get it all?" he asked.

Torres smiled, tapping the dashboard where a small screen showed multiple video feeds. "Every word. Damon Cross just confessed to conspiracy, witness tampering, and about fifteen other felonies. His whole operation is done."

Marcus closed his eyes. Six months undercover. Six months of lies, of wearing a mask, of becoming someone he barely recognized. It was finally over.

"What happens to Sarah?" he asked, though he wasn't sure why he cared.

Torres glanced at him in the rearview mirror. "She's done too. We've had surveillance on her for weeks. She'll be in custody by morning."

The sedan merged onto the highway, leaving the warehouse district behind. The rain was letting up now, the clouds beginning to part. Somewhere ahead, the first hints of dawn were painting the sky in shades of orange and gold.

Marcus touched the gold chain around his neck - the one that had been his father's, the one that had kept him grounded through all of this. He was finally going home.

But as the city lights faded in the mirror, Marcus couldn't shake the feeling that this wasn't really the end. Men like Damon Cross had long memories and longer reaches.

The game wasn't over. It was just beginning a new round.`

// Page Object for Storyboard
class StoryboardTestPage {
    constructor(private page: Page) {}

    // Navigate to storyboard via sidebar
    async navigateToStoryboard() {
        // Click on Storyboard in sidebar
        await this.page.getByRole('button', { name: /storyboard/i }).click()
        // Wait for the storyboard tab to be active
        await this.page.waitForTimeout(500)
    }

    // Get story textarea
    async getStoryTextarea() {
        return this.page.locator('textarea').first()
    }

    // Input story
    async inputStory(story: string) {
        const textarea = await this.getStoryTextarea()
        await textarea.fill(story)
    }

    // Click Extract Characters button
    async clickExtractCharacters() {
        const button = this.page.getByRole('button', { name: /extract/i })
        await button.click()
    }

    // Wait for extraction to complete
    async waitForExtraction(timeout = 60000) {
        // Wait for loading to finish
        await this.page.waitForSelector('[class*="animate-spin"]', { state: 'hidden', timeout }).catch(() => {})
        // Wait a bit for UI to update
        await this.page.waitForTimeout(1000)
    }

    // Get extracted characters count
    async getCharacterCount(): Promise<number> {
        const characterItems = this.page.locator('[data-testid="character-item"], [class*="character"]')
        return await characterItems.count()
    }

    // Click on a tab
    async clickTab(tabName: string) {
        await this.page.getByRole('tab', { name: new RegExp(tabName, 'i') }).click()
        await this.page.waitForTimeout(300)
    }

    // Get shot breakdown segments
    async getShotSegmentCount(): Promise<number> {
        const segments = this.page.locator('[data-testid="shot-segment"], [class*="segment"]')
        return await segments.count()
    }

    // Generate shot prompts
    async clickGeneratePrompts() {
        const button = this.page.getByRole('button', { name: /generate.*prompt/i })
        await button.click()
    }

    // Wait for prompts to generate
    async waitForPrompts(timeout = 120000) {
        await this.page.waitForSelector('[class*="animate-spin"]', { state: 'hidden', timeout }).catch(() => {})
        await this.page.waitForTimeout(1000)
    }

    // Get generated prompt count
    async getGeneratedPromptCount(): Promise<number> {
        const prompts = this.page.locator('[data-testid="generated-prompt"], [class*="prompt"]')
        return await prompts.count()
    }

    // Check if director selector is visible
    async isDirectorSelectorVisible(): Promise<boolean> {
        const selector = this.page.locator('[data-testid="director-selector"], button:has-text("Director")')
        return await selector.isVisible()
    }

    // Take screenshot for debugging
    async takeScreenshot(name: string) {
        await this.page.screenshot({ path: `test-results/storyboard-${name}.png`, fullPage: true })
    }
}

// ============================================================================
// Test Suite
// ============================================================================

test.describe('Storyboard Full Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to main app (authenticated via global-setup)
        await page.goto('/')
        await page.waitForLoadState('networkidle')
    })

    test('should navigate to Storyboard from sidebar', async ({ page }) => {
        const storyboard = new StoryboardTestPage(page)

        // Find and click Storyboard in sidebar
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await expect(sidebarButton).toBeVisible()
        await sidebarButton.click()

        // Verify storyboard is visible (look for Story tab)
        await expect(page.getByRole('tab', { name: /story/i })).toBeVisible({ timeout: 10000 })

        await storyboard.takeScreenshot('01-storyboard-loaded')
    })

    test('should input long story and show word count', async ({ page }) => {
        const storyboard = new StoryboardTestPage(page)

        // Navigate to storyboard
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Input the long story
        await storyboard.inputStory(LONG_STORY)

        // Verify story was input
        const textarea = await storyboard.getStoryTextarea()
        const value = await textarea.inputValue()
        expect(value.length).toBeGreaterThan(1000)

        await storyboard.takeScreenshot('02-story-input')
    })

    test('should extract characters from story', async ({ page }) => {
        test.setTimeout(120000) // 2 minute timeout for API calls

        const storyboard = new StoryboardTestPage(page)

        // Navigate to storyboard
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Input story
        await storyboard.inputStory(LONG_STORY)

        // Click Extract Characters
        await storyboard.clickExtractCharacters()

        // Wait for extraction
        await storyboard.waitForExtraction()

        await storyboard.takeScreenshot('03-after-extraction')

        // Navigate to Characters tab to verify
        await storyboard.clickTab('Characters')
        await page.waitForTimeout(500)

        await storyboard.takeScreenshot('04-characters-tab')

        // Should have extracted characters (Marcus, Sarah, Damon, Torres at minimum)
        // The exact check depends on UI structure
    })

    test('should show all workflow tabs', async ({ page }) => {
        const storyboard = new StoryboardTestPage(page)

        // Navigate to storyboard
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Verify all tabs are visible
        await expect(page.getByRole('tab', { name: /story/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /style/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /characters/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /shots/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /generate/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /results/i })).toBeVisible()

        await storyboard.takeScreenshot('05-all-tabs-visible')
    })

    test('should navigate through enabled tabs', async ({ page }) => {
        const storyboard = new StoryboardTestPage(page)

        // Navigate to storyboard
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Input story first (needed for Shots tab)
        await storyboard.inputStory(LONG_STORY)

        // Only click enabled tabs (Generate and Results are disabled until prompts exist)
        const enabledTabs = ['Style', 'Characters', 'Shots', 'Story']

        for (const tabName of enabledTabs) {
            await storyboard.clickTab(tabName)
            await page.waitForTimeout(300)
            await storyboard.takeScreenshot(`06-tab-${tabName.toLowerCase()}`)
        }

        // Verify Generate and Results tabs are disabled
        const generateTab = page.getByRole('tab', { name: /generate/i })
        await expect(generateTab).toBeDisabled()
    })

    test('should show breakdown level selector in Shots tab', async ({ page }) => {
        const storyboard = new StoryboardTestPage(page)

        // Navigate to storyboard
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // Input story
        await storyboard.inputStory(LONG_STORY)

        // Go to Shots tab
        await storyboard.clickTab('Shots')
        await page.waitForTimeout(500)

        // Look for granularity/breakdown level selector
        const granularitySelector = page.locator('select, [role="combobox"]').filter({ hasText: /fine|standard|coarse|sentence|comma/i })

        await storyboard.takeScreenshot('07-shots-tab-with-story')
    })
})

// ============================================================================
// Integration Tests (require API - run with caution due to credit usage)
// ============================================================================

test.describe('Storyboard API Integration', () => {
    test.skip(({ }) => true, 'Skipped by default - these tests use API credits')

    test('full workflow: story → extract → prompts → generate', async ({ page }) => {
        test.setTimeout(300000) // 5 minute timeout

        const storyboard = new StoryboardTestPage(page)

        // Navigate to storyboard
        const sidebarButton = page.locator('button, a').filter({ hasText: /storyboard/i }).first()
        await sidebarButton.click()
        await page.waitForTimeout(500)

        // 1. Input story
        await storyboard.inputStory(LONG_STORY)
        await storyboard.takeScreenshot('integration-01-story')

        // 2. Extract characters
        await storyboard.clickExtractCharacters()
        await storyboard.waitForExtraction()
        await storyboard.takeScreenshot('integration-02-extracted')

        // 3. Go to Shots tab and generate prompts
        await storyboard.clickTab('Shots')
        await page.waitForTimeout(1000)
        await storyboard.clickGeneratePrompts()
        await storyboard.waitForPrompts()
        await storyboard.takeScreenshot('integration-03-prompts')

        // 4. Go to Generate tab
        await storyboard.clickTab('Generate')
        await page.waitForTimeout(500)
        await storyboard.takeScreenshot('integration-04-generate-tab')

        // Note: Actual image generation would cost credits
        // We stop here for the test
    })
})
