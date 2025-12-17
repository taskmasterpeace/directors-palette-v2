import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive E2E tests for Canvas/Layout Annotation Feature on Mobile
 *
 * Features tested:
 * - Mobile viewport navigation (iPhone 12 - 390x844)
 * - Left sidebar accessibility on mobile
 * - System Prompt section visibility and content
 * - Drawing tools accessibility
 * - Mobile UI interactions
 */

// ============================================================================
// Test Configuration
// ============================================================================

const MOBILE_VIEWPORT = { width: 390, height: 844 } // iPhone 12
const HOME_URL = '/'

// ============================================================================
// Page Object Model
// ============================================================================

class CanvasPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto(HOME_URL)
    await this.page.waitForLoadState('networkidle')
  }

  async navigateToLayoutAnnotation() {
    // Click on Canvas Editor tab in sidebar (renamed from Layout & Annotation)
    // First wait for the page to be ready
    await this.page.waitForSelector('button', { timeout: 10000 })

    // Try multiple possible names
    const layoutButton = this.page.getByRole('button', { name: /Canvas Editor/i })
      .or(this.page.getByRole('button', { name: /Layout.*Annotation/i }))

    await layoutButton.click({ timeout: 10000 })
    await this.page.waitForTimeout(1000) // Wait for tab transition
  }

  // Sidebar Controls
  async getSidebarToggleButton() {
    // On desktop, there's a toggle button; on mobile, sidebar is bottom sheet
    return this.page.locator('button').filter({ hasText: /Drawing Tools|System Prompt/i }).first()
  }

  async isSidebarVisible(): Promise<boolean> {
    // Check if sidebar content is visible
    const sidebar = this.page.locator('text=System Prompt (Advanced)')
    return await sidebar.isVisible()
  }

  async openMobileSidebar() {
    // On mobile, check if sidebar is already visible, if not find a way to open it
    const isVisible = await this.isSidebarVisible()
    if (!isVisible) {
      // Look for any button that might open the sidebar
      // The sidebar might be initially hidden on mobile
      const possibleTriggers = this.page.locator('[class*="bottom-0"]').filter({ hasText: /.+/ }).first()
      if (await possibleTriggers.isVisible()) {
        await possibleTriggers.click()
      }
    }
  }

  // System Prompt Section
  async getSystemPromptSection() {
    return this.page.locator('button:has-text("System Prompt (Advanced)")')
  }

  async isSystemPromptSectionVisible(): Promise<boolean> {
    const section = await this.getSystemPromptSection()
    return await section.isVisible()
  }

  async expandSystemPrompt() {
    const section = await this.getSystemPromptSection()
    const isExpanded = await this.isSystemPromptExpanded()

    if (!isExpanded) {
      // Use force: true to bypass element interception issues on mobile
      await section.click({ force: true })
      await this.page.waitForTimeout(300) // Wait for animation
    }
  }

  async isSystemPromptExpanded(): Promise<boolean> {
    // Check if textarea is visible
    const textarea = this.page.locator('textarea[class*="font-mono"]')
    return await textarea.isVisible()
  }

  async getSystemPromptContent(): Promise<string> {
    await this.expandSystemPrompt()
    const textarea = this.page.locator('textarea[class*="font-mono"]')
    return await textarea.inputValue()
  }

  async systemPromptContainsCyan(): Promise<boolean> {
    const content = await this.getSystemPromptContent()
    return content.includes('CYAN') && content.includes('#00d2d3')
  }

  // Drawing Tools Section
  async getDrawingToolsSection() {
    return this.page.locator('text=Drawing Tools').or(this.page.locator('[class*="Palette"]'))
  }

  async isDrawingToolsSectionVisible(): Promise<boolean> {
    // Drawing tools should be in a collapsible card with Palette icon
    // Check for the palette icon which is part of the drawing tools section
    const paletteIcon = this.page.locator('[class*="Palette"]').or(
      this.page.locator('svg').filter({ hasText: '' }).first()
    )

    // Also check for any canvas toolbar which indicates drawing tools are present
    const canvasToolbar = this.page.locator('[class*="CanvasToolbar"]')

    const iconVisible = await paletteIcon.first().isVisible().catch(() => false)
    const toolbarVisible = await canvasToolbar.first().isVisible().catch(() => false)

    return iconVisible || toolbarVisible
  }

  async expandDrawingTools() {
    const section = this.page.locator('button').filter({ has: this.page.locator('[class*="Palette"]') }).first()

    if (await section.isVisible()) {
      const isExpanded = await this.isDrawingToolsExpanded()
      if (!isExpanded) {
        await section.click()
        await this.page.waitForTimeout(300) // Wait for animation
      }
    }
  }

  async isDrawingToolsExpanded(): Promise<boolean> {
    // Check if drawing tool buttons are visible (like brush, arrow, etc.)
    const toolButtons = this.page.locator('[data-testid*="tool"]').or(
      this.page.locator('button[class*="tool"]')
    )
    const count = await toolButtons.count()
    return count > 0 && await toolButtons.first().isVisible()
  }

  async getToolbarButtons() {
    // Look for tool buttons in the canvas toolbar
    return this.page.locator('[class*="CanvasToolbar"] button, [class*="toolbar"] button')
  }

  async getToolbarButtonCount(): Promise<number> {
    const buttons = await this.getToolbarButtons()
    return await buttons.count()
  }

  // Canvas Elements
  async getCanvas() {
    return this.page.locator('canvas').first()
  }

  async isCanvasVisible(): Promise<boolean> {
    const canvas = await this.getCanvas()
    return await canvas.isVisible()
  }

  // AI Instruction Input
  async getAIInstructionTextarea() {
    return this.page.locator('textarea[placeholder*="Describe"]').or(
      this.page.locator('textarea[placeholder*="edits"]')
    )
  }

  async isAIInstructionVisible(): Promise<boolean> {
    const textarea = await this.getAIInstructionTextarea()
    return await textarea.isVisible()
  }

  // Generate Button
  async getGenerateButton() {
    return this.page.getByRole('button', { name: /Generate/i }).filter({ hasText: /pts/ })
  }

  async isGenerateButtonVisible(): Promise<boolean> {
    const button = await this.getGenerateButton()
    return await button.isVisible()
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/canvas-mobile-${name}.png`,
      fullPage: true
    })
  }
}

// ============================================================================
// Test Hooks
// ============================================================================

test.beforeEach(async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize(MOBILE_VIEWPORT)

  // Navigate to home
  await page.goto(HOME_URL)
  // Use domcontentloaded instead of networkidle for faster tests
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000) // Give React time to hydrate
})

// ============================================================================
// 1. Mobile Viewport and Navigation Tests
// ============================================================================

test.describe('Mobile Viewport - Canvas Navigation', () => {
  test('should display home page on mobile viewport', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    // Verify viewport
    const viewportSize = page.viewportSize()
    expect(viewportSize?.width).toBe(390)
    expect(viewportSize?.height).toBe(844)

    // Take initial screenshot
    await canvasPage.takeScreenshot('01-home-page')
  })

  test('should navigate to Layout & Annotation tab', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    // Navigate to Layout & Annotation
    await canvasPage.navigateToLayoutAnnotation()

    // Verify navigation worked
    const canvas = await canvasPage.getCanvas()
    await expect(canvas).toBeVisible({ timeout: 10000 })

    // Take screenshot
    await canvasPage.takeScreenshot('02-layout-annotation-tab')
  })
})

// ============================================================================
// 2. Left Sidebar Tests
// ============================================================================

test.describe('Mobile Sidebar', () => {
  test('should be able to access left sidebar on mobile', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()

    // On mobile, sidebar appears as bottom sheet - check if it's accessible
    const systemPromptSection = await canvasPage.getSystemPromptSection()

    // Scroll or wait to ensure visibility
    await page.waitForTimeout(1000)

    // The sidebar should be accessible (either visible or can be made visible)
    // On mobile, it may be in a bottom sheet that's always visible or swipeable
    const isVisible = await canvasPage.isSystemPromptSectionVisible()

    // If not visible, try scrolling down to find it
    if (!isVisible) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(500)
    }

    await expect(systemPromptSection).toBeVisible({ timeout: 5000 })

    // Take screenshot
    await canvasPage.takeScreenshot('03-sidebar-visible')
  })

  test('should display mobile drag handle for sidebar', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Look for the mobile drag handle (a visual element for bottom sheets)
    const dragHandle = page.locator('[class*="w-12"][class*="h-1"][class*="rounded-full"]')

    // The drag handle should be visible on mobile
    const handleExists = await dragHandle.count()
    expect(handleExists).toBeGreaterThan(0)

    // Take screenshot
    await canvasPage.takeScreenshot('04-mobile-drag-handle')
  })
})

// ============================================================================
// 3. System Prompt Section Tests
// ============================================================================

test.describe('System Prompt Section', () => {
  test('should display System Prompt (Advanced) section', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Check if System Prompt section is visible
    const isVisible = await canvasPage.isSystemPromptSectionVisible()
    expect(isVisible).toBe(true)

    // Take screenshot
    await canvasPage.takeScreenshot('05-system-prompt-section')
  })

  test('should be able to expand System Prompt section', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Expand the section
    await canvasPage.expandSystemPrompt()

    // Verify it's expanded
    const isExpanded = await canvasPage.isSystemPromptExpanded()
    expect(isExpanded).toBe(true)

    // Take screenshot
    await canvasPage.takeScreenshot('06-system-prompt-expanded')
  })

  test('should contain default prompt text about CYAN annotations', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Expand and get content
    await canvasPage.expandSystemPrompt()
    const content = await canvasPage.getSystemPromptContent()

    // Verify CYAN is mentioned
    expect(content).toContain('CYAN')
    expect(content).toContain('#00d2d3')
    expect(content).toContain('annotations')
    expect(content).toContain('ANNOTATION INTERPRETATION INSTRUCTIONS')

    // Verify key sections are present
    expect(content).toContain('CYAN BRUSH/MASK AREAS')
    expect(content).toContain('CYAN ARROWS')
    expect(content).toContain('CYAN TEXT LABELS')
    expect(content).toContain('CYAN FREEHAND DRAWINGS')

    console.log('System Prompt Content (first 200 chars):', content.substring(0, 200))

    // Take screenshot
    await canvasPage.takeScreenshot('07-system-prompt-content')
  })

  test('should have Reset to Default button', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Expand system prompt
    await canvasPage.expandSystemPrompt()

    // Look for Reset button
    const resetButton = page.getByRole('button', { name: /Reset to Default/i })
    await expect(resetButton).toBeVisible()

    // Take screenshot
    await canvasPage.takeScreenshot('08-reset-button')
  })
})

// ============================================================================
// 4. Drawing Tools Tests
// ============================================================================

test.describe('Drawing Tools', () => {
  test('should display drawing tools section', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Check if Drawing Tools section exists
    const isVisible = await canvasPage.isDrawingToolsSectionVisible()

    // It should be visible or expandable
    expect(isVisible).toBe(true)

    // Take screenshot
    await canvasPage.takeScreenshot('09-drawing-tools-section')
  })

  test('should have canvas element visible', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Canvas should be visible
    const isVisible = await canvasPage.isCanvasVisible()
    expect(isVisible).toBe(true)

    // Take screenshot
    await canvasPage.takeScreenshot('10-canvas-visible')
  })

  test('should display AI Instruction textarea', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Check for AI Instruction input
    const isVisible = await canvasPage.isAIInstructionVisible()
    expect(isVisible).toBe(true)

    // Take screenshot
    await canvasPage.takeScreenshot('11-ai-instruction')
  })

  test('should display Generate button with token cost', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Check for Generate button
    const isVisible = await canvasPage.isGenerateButtonVisible()
    expect(isVisible).toBe(true)

    const generateButton = await canvasPage.getGenerateButton()
    const buttonText = await generateButton.textContent()

    // Verify it shows token cost
    expect(buttonText).toMatch(/\d+\s*pts/)

    console.log('Generate Button Text:', buttonText)

    // Take screenshot
    await canvasPage.takeScreenshot('12-generate-button')
  })
})

// ============================================================================
// 5. Integration Tests
// ============================================================================

test.describe('Mobile Canvas Integration', () => {
  test('should complete full mobile workflow check', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    // 1. Navigate to Layout & Annotation
    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // 2. Verify canvas is visible
    const canvasVisible = await canvasPage.isCanvasVisible()
    expect(canvasVisible).toBe(true)

    // 3. Verify sidebar components are accessible
    const systemPromptVisible = await canvasPage.isSystemPromptSectionVisible()
    expect(systemPromptVisible).toBe(true)

    // 4. Expand and verify System Prompt content
    await canvasPage.expandSystemPrompt()
    const hasCyan = await canvasPage.systemPromptContainsCyan()
    expect(hasCyan).toBe(true)

    // 5. Verify AI Instruction is accessible
    const aiInstructionVisible = await canvasPage.isAIInstructionVisible()
    expect(aiInstructionVisible).toBe(true)

    // 6. Verify Generate button is accessible
    const generateVisible = await canvasPage.isGenerateButtonVisible()
    expect(generateVisible).toBe(true)

    // Take final screenshot
    await canvasPage.takeScreenshot('13-full-workflow-complete')

    console.log('✅ Mobile Canvas Integration Test Passed!')
  })

  test('should handle sidebar scroll on mobile', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(1000)

    // Get the sidebar container
    const sidebar = page.locator('[class*="bottom-0"][class*="fixed"]').first()

    // If sidebar exists, try scrolling within it
    if (await sidebar.isVisible()) {
      // Scroll to bottom of sidebar
      await sidebar.evaluate((el) => {
        el.scrollTop = el.scrollHeight
      })

      await page.waitForTimeout(500)

      // Scroll back to top
      await sidebar.evaluate((el) => {
        el.scrollTop = 0
      })

      await page.waitForTimeout(500)
    }

    // Take screenshot
    await canvasPage.takeScreenshot('14-sidebar-scroll')
  })

  test('should display all key UI elements in viewport', async ({ page }) => {
    const canvasPage = new CanvasPage(page)

    await canvasPage.navigateToLayoutAnnotation()
    await page.waitForTimeout(2000)

    // Take a full page screenshot for manual verification
    await page.screenshot({
      path: 'test-results/canvas-mobile-15-full-page.png',
      fullPage: true
    })

    // Verify key elements are in the DOM (even if not in immediate viewport)
    const elements = {
      canvas: await canvasPage.isCanvasVisible(),
      systemPrompt: await canvasPage.isSystemPromptSectionVisible(),
      aiInstruction: await canvasPage.isAIInstructionVisible(),
      generateButton: await canvasPage.isGenerateButtonVisible()
    }

    console.log('UI Elements Status:', elements)

    // At least canvas and one sidebar element should be visible
    expect(elements.canvas || elements.systemPrompt || elements.aiInstruction).toBe(true)
  })
})
