import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Shot Lab (Blocking & VFX Bay)
 * 
 * Features tested:
 * - Accessing Storyboard
 * - Generating Prompts
 * - Opening Shot Lab (Refine Shot)
 * - Using VFX Bay (Toolbar interactions)
 * - Using Blocking Canvas (Add Actor, Add Prop)
 */

const STORYBOARD_URL = '/storyboard'

class ShotLabPage {
    constructor(private page: Page) { }

    async goto() {
        await this.page.goto(STORYBOARD_URL)
        await this.page.waitForLoadState('networkidle')
    }

    async inputStory(text: string) {
        const textarea = this.page.locator('textarea[placeholder*="Paste your script"]')
        await textarea.fill(text)
    }

    async clickGeneratePrompts() {
        await this.page.getByRole('button', { name: /Generate Shot Prompts/i }).click()
        // Wait for generation (simulated by finding a shot card or Refine button)
        await this.page.waitForSelector('button:has-text("Refine Shot")', { timeout: 30000 })
    }

    async clickRefineShot(index = 0) {
        const refineButtons = this.page.locator('button:has-text("Refine Shot")')
        await refineButtons.nth(index).click()
        await this.page.waitForSelector('text=Shot Lab', { state: 'visible' })
    }

    async switchToTab(tabName: 'VFX Bay' | 'Blocking') {
        await this.page.getByRole('tab', { name: tabName }).click()
    }

    // VFX Bay Actions
    async selectPaintTool() {
        await this.page.getByRole('button', { name: 'Paint Mask' }).click()
    }

    async selectEraseTool() {
        await this.page.getByRole('button', { name: 'Erase Mask' }).click()
    }

    async setBrushSize(size: number) {
        // Slider interaction might be complex in PW, skipping precise interaction for now
    }

    async enterVfxInstruction(text: string) {
        const input = this.page.locator('input[placeholder*="Describe what to change"]')
        await input.fill(text)
    }

    // Blocking Canvas Actions
    async addActor() {
        await this.page.getByTitle('Add Actor').click()
    }

    async addProp() {
        await this.page.getByTitle('Add Prop').click()
    }

    async generateLayoutPrompt() {
        await this.page.getByRole('button', { name: /Generate Prompt from Layout/i }).click()
    }

    async close() {
        await this.page.getByRole('button', { name: 'Close' }).click()
    }
}

test.describe('Shot Lab Integration', () => {
    test.beforeEach(async ({ page }) => {
        // Assuming test env setup or auth bypass
        await page.goto(STORYBOARD_URL)
    })

    test('should generate prompts and open Shot Lab', async ({ page }) => {
        const lab = new ShotLabPage(page)
        await lab.inputStory('INT. DINER - DAY\nAlice sits at the counter.')
        await lab.clickGeneratePrompts()

        // Open Lab
        await lab.clickRefineShot(0)
        await expect(page.getByText('Shot Lab')).toBeVisible()
    });

    test('should verify VFX Bay tools', async ({ page }) => {
        const lab = new ShotLabPage(page)
        // Setup (skip if possible, but flow is sequential)
        await lab.inputStory('A cat jumps.')
        await lab.clickGeneratePrompts()
        await lab.clickRefineShot(0)

        // Check VFX Bay (Default tab)
        await lab.selectPaintTool()
        await expect(page.getByRole('button', { name: 'Paint Mask' })).toHaveAttribute('data-state', 'active') // Assuming toggle group uses data-state

        await lab.selectEraseTool()
        await expect(page.getByRole('button', { name: 'Erase Mask' })).toHaveAttribute('data-state', 'active')

        await lab.enterVfxInstruction('Make the cat purple')
        await expect(page.getByRole('button', { name: 'Generate' })).toBeEnabled()
    });

    test('should verify Blocking Canvas interactions', async ({ page }) => {
        const lab = new ShotLabPage(page)
        await lab.inputStory('A dog spins.')
        await lab.clickGeneratePrompts()
        await lab.clickRefineShot(0)

        // Switch to Blocking
        await lab.switchToTab('Blocking')
        await expect(page.getByText('Blocking Stage')).toBeVisible()

        // Add elements (Fabric canvas interaction is hard to assert visually without snapshot, 
        // but we can check if buttons don't crash)
        await lab.addActor()
        await lab.addProp()

        await lab.generateLayoutPrompt()
        // Prompt update is internal, manual verification needed for store update, 
        // but checking for no error is a start.
    });
})
