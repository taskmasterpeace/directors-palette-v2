import { test, expect, Page } from '@playwright/test'

/**
 * Storyboard - Manual "Add Character" Button
 *
 * Tests that users can manually add characters to the storyboard
 * without needing to extract them from story text first.
 *
 * Expected behavior:
 * 1. Navigate to /test-storyboard
 * 2. Click the "Chars" sidebar tab
 * 3. See an "Add Character" button (even with no extracted characters)
 * 4. Click "Add Character"
 * 5. Fill in character name and select a role
 * 6. Submit/confirm the new character
 * 7. Character appears in the list with correct name and role
 */

const STORYBOARD_URL = '/test-storyboard'

class StoryboardAddCharacterPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(STORYBOARD_URL)
    await this.page.waitForLoadState('networkidle')
  }

  /** Click the "Chars" sidebar button (4th sidebar icon) */
  async clickCharsTab() {
    // The sidebar uses plain <button> elements containing a <span> with the label text.
    // The button also contains a step-number badge and icon, so we locate by the
    // span text "Chars" and then click its parent button.
    const charsButton = this.page.locator('button', { has: this.page.locator('span', { hasText: 'Chars' }) })
    await charsButton.click()
  }

  /** Locate the "Add Character" button */
  getAddCharacterButton() {
    return this.page.getByRole('button', { name: /Add Character/i })
  }
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Storyboard - Manual Add Character', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORYBOARD_URL)
    await page.waitForLoadState('networkidle')
  })

  test('should show "Add Character" button on empty Characters tab', async ({ page }) => {
    const storyboard = new StoryboardAddCharacterPage(page)

    // Navigate to the Characters (Chars) sidebar tab
    await storyboard.clickCharsTab()
    await page.waitForTimeout(500)

    // The "Add Character" button should be visible even when no characters exist
    const addButton = storyboard.getAddCharacterButton()
    await expect(addButton).toBeVisible({ timeout: 5000 })
  })

  test('should open a form when "Add Character" is clicked', async ({ page }) => {
    const storyboard = new StoryboardAddCharacterPage(page)

    // Navigate to the Characters tab
    await storyboard.clickCharsTab()
    await page.waitForTimeout(500)

    // Click "Add Character"
    const addButton = storyboard.getAddCharacterButton()
    await addButton.click()

    // A form or inline input should appear with at least a name field and role selector
    const nameInput = page.getByPlaceholder(/character name/i)
    await expect(nameInput).toBeVisible({ timeout: 5000 })
  })

  test('should add a character with name and role to the list', async ({ page }) => {
    const storyboard = new StoryboardAddCharacterPage(page)

    // Navigate to the Characters tab
    await storyboard.clickCharsTab()
    await page.waitForTimeout(500)

    // Click "Add Character"
    const addButton = storyboard.getAddCharacterButton()
    await addButton.click()

    // Fill in the character name
    const nameInput = page.getByPlaceholder(/character name/i)
    await nameInput.fill('Marcus')

    // Select role "main"
    // Could be a <select>, radio buttons, or a dropdown - look for accessible role selector
    const roleSelect = page.locator('select').filter({ hasText: /main/i })
      .or(page.getByRole('combobox', { name: /role/i }))
      .or(page.getByLabel(/role/i))
    await roleSelect.first().selectOption('main')

    // Submit/confirm the character
    const confirmButton = page.getByRole('button', { name: /add|confirm|save|create/i })
    await confirmButton.click()

    // Verify the character now appears in the character list
    await expect(page.getByText('Marcus')).toBeVisible({ timeout: 5000 })

    // Verify the role badge shows "main"
    await expect(page.locator('text=main').first()).toBeVisible()
  })
})
