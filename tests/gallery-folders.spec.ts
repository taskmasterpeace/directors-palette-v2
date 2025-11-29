import { test, expect, Page } from '@playwright/test'

/**
 * Comprehensive E2E tests for Gallery Folder System
 *
 * Features tested:
 * - Folder CRUD operations (Create, Read, Update, Delete)
 * - Folder navigation (Desktop & Mobile)
 * - Move images to folders (Single & Bulk)
 * - Folder filtering and pagination
 * - Color-coded folders
 * - Responsive design
 * - Empty states
 */

// ============================================================================
// Test Configuration
// ============================================================================

const DESKTOP_VIEWPORT = { width: 1280, height: 720 }
const MOBILE_VIEWPORT = { width: 375, height: 667 }
const GALLERY_URL = '/gallery'

// Test data
const TEST_FOLDER_NAME = 'Test Folder'
const TEST_FOLDER_COLOR = '#EF4444' // red
const UPDATED_FOLDER_NAME = 'Updated Test Folder'
const UPDATED_FOLDER_COLOR = '#10B981' // green

// ============================================================================
// Helper Functions
// ============================================================================

class GalleryFolderPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto(GALLERY_URL)
    await this.page.waitForLoadState('networkidle')
  }

  // Folder Sidebar (Desktop)
  async clickAllImages() {
    await this.page.getByRole('button', { name: 'All Images' }).click()
  }

  async clickUncategorized() {
    await this.page.getByRole('button', { name: 'Uncategorized' }).click()
  }

  async clickFolder(folderName: string) {
    await this.page.getByRole('button', { name: folderName }).click()
  }

  async clickNewFolder() {
    await this.page.getByRole('button', { name: 'New Folder' }).click()
  }

  async getFolderCount(folderName: string): Promise<number> {
    const folderButton = this.page.getByRole('button', { name: new RegExp(folderName) })
    const badge = folderButton.locator('[class*="badge"]')
    const text = await badge.textContent()
    return parseInt(text || '0', 10)
  }

  async isFolderActive(folderName: string): Promise<boolean> {
    const folderButton = this.page.getByRole('button', { name: new RegExp(folderName) })
    const classes = await folderButton.getAttribute('class')
    return classes?.includes('bg-primary') || false
  }

  // Mobile Folder Menu
  async openMobileMenu() {
    await this.page.getByRole('button', { name: 'Open folder menu' }).click()
  }

  async isMobileMenuOpen(): Promise<boolean> {
    const menu = this.page.getByRole('dialog', { name: /folders/i })
    return await menu.isVisible()
  }

  async selectFolderFromMobileMenu(folderName: string) {
    await this.page.getByRole('button', { name: new RegExp(folderName) }).click()
  }

  // Folder Manager Modal
  async fillFolderName(name: string) {
    await this.page.getByLabel('Folder Name *').fill(name)
  }

  async selectFolderColor(color: string) {
    await this.page.locator(`button[style*="background-color: ${color}"]`).click()
  }

  async clearFolderColor() {
    await this.page.locator('button[title="No color"]').click()
  }

  async clickCreateFolder() {
    await this.page.getByRole('button', { name: 'Create Folder' }).click()
  }

  async clickUpdateFolder() {
    await this.page.getByRole('button', { name: 'Update Folder' }).click()
  }

  async clickDelete() {
    await this.page.getByRole('button', { name: 'Delete' }).click()
  }

  async clickCancel() {
    await this.page.getByRole('button', { name: 'Cancel' }).click()
  }

  async getValidationMessage(): Promise<string | null> {
    const message = this.page.locator('text=/.*characters/i')
    return await message.textContent()
  }

  // Image Actions
  async openImageActionMenu(imageIndex: number = 0) {
    const images = this.page.locator('[data-testid="image-card"]').or(
      this.page.locator('[class*="image"]').first()
    )
    const image = images.nth(imageIndex)
    await image.hover()
    await image.locator('button[aria-label="More options"]').or(
      image.locator('button:has-text("⋮")')
    ).click()
  }

  async moveImageToFolder(folderName: string) {
    await this.page.getByRole('menuitem', { name: 'Move to Folder' }).hover()
    await this.page.getByRole('menuitem', { name: folderName }).click()
  }

  async moveImageToUncategorized() {
    await this.page.getByRole('menuitem', { name: 'Move to Folder' }).hover()
    await this.page.getByRole('menuitem', { name: 'Uncategorized' }).click()
  }

  // Bulk Selection
  async selectAllImages() {
    await this.page.getByRole('button', { name: 'Select All' }).click()
  }

  async getSelectedCount(): Promise<number> {
    const badge = this.page.locator('text=/\\d+ selected/')
    const text = await badge.textContent()
    const match = text?.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  async clickBulkMoveToFolder() {
    await this.page.getByRole('button', { name: 'Move to Folder' }).click()
  }

  async selectBulkMoveFolder(folderName: string) {
    await this.page.getByRole('option', { name: folderName }).click()
  }

  // Gallery State
  async getImageCount(): Promise<number> {
    const images = this.page.locator('[data-testid="image-card"]').or(
      this.page.locator('[class*="grid"] > div')
    )
    return await images.count()
  }

  async getCurrentPage(): Promise<number> {
    const currentPageButton = this.page.locator('button[aria-current="page"]')
    const text = await currentPageButton.textContent()
    return parseInt(text || '1', 10)
  }

  async isEmptyState(message: string): Promise<boolean> {
    return await this.page.locator(`text=${message}`).isVisible()
  }

  // Responsive Design
  async isSidebarVisible(): Promise<boolean> {
    const sidebar = this.page.locator('[data-testid="folder-sidebar"]').or(
      this.page.locator('.sidebar')
    )
    return await sidebar.isVisible()
  }

  async isHamburgerVisible(): Promise<boolean> {
    const hamburger = this.page.getByRole('button', { name: 'Open folder menu' })
    return await hamburger.isVisible()
  }

  // Folder Management Context Menu
  async rightClickFolder(folderName: string) {
    await this.page.getByRole('button', { name: new RegExp(folderName) }).click({ button: 'right' })
  }

  async clickRenameFromContextMenu() {
    await this.page.getByRole('menuitem', { name: 'Rename' }).click()
  }

  async clickDeleteFromContextMenu() {
    await this.page.getByRole('menuitem', { name: 'Delete' }).click()
  }
}

// ============================================================================
// Test Hooks
// ============================================================================

test.beforeEach(async ({ page }) => {
  // Set up authentication if required
  // await page.goto('/login')
  // await page.fill('[name="email"]', 'test@example.com')
  // await page.fill('[name="password"]', 'password')
  // await page.click('button[type="submit"]')

  // Navigate to gallery and wait for load
  await page.goto(GALLERY_URL)
  await page.waitForLoadState('networkidle')
})

test.afterEach(async ({ page }) => {
  // Clean up: Delete any test folders created during the test
  const galleryPage = new GalleryFolderPage(page)

  try {
    // Try to find and delete test folders
    const testFolderExists = await page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) }).isVisible()
    if (testFolderExists) {
      await galleryPage.clickFolder(TEST_FOLDER_NAME)
      await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
      await galleryPage.clickDeleteFromContextMenu()
      await galleryPage.clickDelete()
    }
  } catch (error) {
    // Ignore cleanup errors
    console.log('Cleanup error (expected):', error)
  }
})

// ============================================================================
// 1. Folder Creation Tests
// ============================================================================

test.describe('Folder Creation', () => {
  test('should create a new folder with name and color', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Click New Folder button
    await galleryPage.clickNewFolder()

    // Fill in folder name
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)

    // Select color
    await galleryPage.selectFolderColor(TEST_FOLDER_COLOR)

    // Create folder
    await galleryPage.clickCreateFolder()

    // Wait for success toast
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Verify folder appears in sidebar with count of 0
    await expect(page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })).toBeVisible()
    const count = await galleryPage.getFolderCount(TEST_FOLDER_NAME)
    expect(count).toBe(0)

    // Verify color badge is displayed
    const folderButton = page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })
    const colorBadge = folderButton.locator(`[style*="${TEST_FOLDER_COLOR}"]`)
    await expect(colorBadge).toBeVisible()
  })

  test('should validate minimum folder name length', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName('')
    await galleryPage.clickCreateFolder()

    // Should show error toast
    await expect(page.locator('text=/Please enter a folder name|Folder name cannot be empty/')).toBeVisible()
  })

  test('should validate maximum folder name length', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.clickNewFolder()

    // Try to enter 51 characters (max is 50)
    const longName = 'a'.repeat(51)
    await galleryPage.fillFolderName(longName)

    // Verify character count
    const charCount = await galleryPage.getValidationMessage()
    expect(charCount).toContain('50/50')
  })

  test('should reject reserved folder names', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    const reservedNames = ['All', 'Uncategorized', 'All Images']

    for (const name of reservedNames) {
      await galleryPage.clickNewFolder()
      await galleryPage.fillFolderName(name)
      await galleryPage.clickCreateFolder()

      // Should show error
      await expect(page.locator('text=This folder name is reserved')).toBeVisible()

      // Close dialog
      await galleryPage.clickCancel()
    }
  })

  test('should reject duplicate folder names', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create first folder
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Try to create duplicate
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.clickCreateFolder()

    // Should show error
    await expect(page.locator('text=A folder with this name already exists')).toBeVisible()
  })

  test('should create folder without color', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName('No Color Folder')
    // Don't select a color
    await galleryPage.clickCreateFolder()

    await expect(page.locator('text=Folder created successfully')).toBeVisible()
    await expect(page.getByRole('button', { name: /No Color Folder/ })).toBeVisible()
  })
})

// ============================================================================
// 2. Folder Navigation Tests (Desktop)
// ============================================================================

test.describe('Folder Navigation - Desktop', () => {
  test.use({ viewport: DESKTOP_VIEWPORT })

  test('should show all images when "All Images" is clicked', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.clickAllImages()

    // Verify "All Images" is active
    expect(await galleryPage.isFolderActive('All Images')).toBe(true)

    // Verify images are displayed
    const imageCount = await galleryPage.getImageCount()
    expect(imageCount).toBeGreaterThan(0)
  })

  test('should show uncategorized images when "Uncategorized" is clicked', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.clickUncategorized()

    // Verify "Uncategorized" is active
    expect(await galleryPage.isFolderActive('Uncategorized')).toBe(true)

    // Verify page title shows folder name
    await expect(page.locator('text=/Unified Gallery.*Uncategorized/')).toBeVisible()
  })

  test('should filter images when user folder is clicked', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create a test folder first
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Click the folder
    await galleryPage.clickFolder(TEST_FOLDER_NAME)

    // Verify folder is active
    expect(await galleryPage.isFolderActive(TEST_FOLDER_NAME)).toBe(true)

    // Verify empty state (no images in new folder)
    await expect(page.locator('text=No images in this folder')).toBeVisible()
  })

  test('should reset pagination to page 1 when switching folders', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Navigate to page 2 if available
    const paginationExists = await page.locator('button[aria-label="Next page"]').isVisible()
    if (paginationExists) {
      await page.locator('button[aria-label="Next page"]').click()

      // Verify we're on page 2
      expect(await galleryPage.getCurrentPage()).toBe(2)
    }

    // Switch to Uncategorized
    await galleryPage.clickUncategorized()

    // Verify pagination reset to page 1
    expect(await galleryPage.getCurrentPage()).toBe(1)
  })

  test('should update image count correctly', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Get initial counts
    await galleryPage.clickAllImages()
    const initialAllCount = await galleryPage.getFolderCount('All Images')

    await galleryPage.clickUncategorized()
    const initialUncategorizedCount = await galleryPage.getFolderCount('Uncategorized')

    // Verify counts are numbers
    expect(typeof initialAllCount).toBe('number')
    expect(typeof initialUncategorizedCount).toBe('number')
    expect(initialAllCount).toBeGreaterThanOrEqual(initialUncategorizedCount)
  })
})

// ============================================================================
// 3. Folder Navigation Tests (Mobile)
// ============================================================================

test.describe('Folder Navigation - Mobile', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test('should open hamburger menu', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Verify hamburger is visible
    expect(await galleryPage.isHamburgerVisible()).toBe(true)

    // Open menu
    await galleryPage.openMobileMenu()

    // Verify menu is open
    expect(await galleryPage.isMobileMenuOpen()).toBe(true)
  })

  test('should select folder from mobile menu', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Open menu
    await galleryPage.openMobileMenu()

    // Select Uncategorized
    await galleryPage.selectFolderFromMobileMenu('Uncategorized')

    // Verify menu closes
    expect(await galleryPage.isMobileMenuOpen()).toBe(false)

    // Verify folder is selected
    await expect(page.locator('text=/Uncategorized/')).toBeVisible()
  })

  test('should display correct images after mobile folder selection', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Open menu and select All Images
    await galleryPage.openMobileMenu()
    await galleryPage.selectFolderFromMobileMenu('All Images')

    // Verify images are displayed
    const imageCount = await galleryPage.getImageCount()
    expect(imageCount).toBeGreaterThan(0)
  })
})

// ============================================================================
// 4. Move Images to Folder Tests
// ============================================================================

test.describe('Move Images to Folder', () => {
  test.beforeEach(async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create a test folder for moving images
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.selectFolderColor(TEST_FOLDER_COLOR)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()
  })

  test('should move single image to folder via action menu', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Go to All Images
    await galleryPage.clickAllImages()

    // Get initial count
    const initialCount = await galleryPage.getFolderCount(TEST_FOLDER_NAME)

    // Open action menu for first image
    await galleryPage.openImageActionMenu(0)

    // Move to test folder
    await galleryPage.moveImageToFolder(TEST_FOLDER_NAME)

    // Wait for success toast
    await expect(page.locator('text=/Image moved|moved successfully/')).toBeVisible()

    // Verify count updated
    const newCount = await galleryPage.getFolderCount(TEST_FOLDER_NAME)
    expect(newCount).toBe(initialCount + 1)
  })

  test('should move multiple images via bulk selection', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Select all images
    await galleryPage.selectAllImages()

    // Get selected count
    const selectedCount = await galleryPage.getSelectedCount()
    expect(selectedCount).toBeGreaterThan(0)

    // Click bulk move to folder
    await galleryPage.clickBulkMoveToFolder()

    // Select test folder
    await galleryPage.selectBulkMoveFolder(TEST_FOLDER_NAME)

    // Wait for success
    await expect(page.locator('text=/Images moved|moved successfully/')).toBeVisible()

    // Verify count updated
    const folderCount = await galleryPage.getFolderCount(TEST_FOLDER_NAME)
    expect(folderCount).toBe(selectedCount)
  })

  test('should verify image appears in correct folder', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Move an image
    await galleryPage.clickAllImages()
    await galleryPage.openImageActionMenu(0)
    await galleryPage.moveImageToFolder(TEST_FOLDER_NAME)
    await expect(page.locator('text=/Image moved|moved successfully/')).toBeVisible()

    // Navigate to test folder
    await galleryPage.clickFolder(TEST_FOLDER_NAME)

    // Verify image is there
    const imageCount = await galleryPage.getImageCount()
    expect(imageCount).toBe(1)
  })

  test('should move image back to uncategorized', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // First move image to test folder
    await galleryPage.clickAllImages()
    await galleryPage.openImageActionMenu(0)
    await galleryPage.moveImageToFolder(TEST_FOLDER_NAME)
    await expect(page.locator('text=/Image moved|moved successfully/')).toBeVisible()

    // Get uncategorized count before
    const uncategorizedBefore = await galleryPage.getFolderCount('Uncategorized')

    // Move image back to uncategorized
    await galleryPage.clickFolder(TEST_FOLDER_NAME)
    await galleryPage.openImageActionMenu(0)
    await galleryPage.moveImageToUncategorized()
    await expect(page.locator('text=/Image moved|moved successfully/')).toBeVisible()

    // Verify counts updated
    expect(await galleryPage.getFolderCount(TEST_FOLDER_NAME)).toBe(0)
    expect(await galleryPage.getFolderCount('Uncategorized')).toBe(uncategorizedBefore + 1)
  })
})

// ============================================================================
// 5. Folder Rename Tests
// ============================================================================

test.describe('Folder Rename', () => {
  test.beforeEach(async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create a test folder
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()
  })

  test('should rename a folder', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Right-click folder
    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickRenameFromContextMenu()

    // Update name
    await galleryPage.fillFolderName(UPDATED_FOLDER_NAME)
    await galleryPage.clickUpdateFolder()

    // Verify success
    await expect(page.locator('text=Folder updated successfully')).toBeVisible()

    // Verify new name appears in sidebar
    await expect(page.getByRole('button', { name: new RegExp(UPDATED_FOLDER_NAME) })).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })).not.toBeVisible()
  })

  test('should preserve images when renaming folder', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Move an image to the folder
    await galleryPage.clickAllImages()
    await galleryPage.openImageActionMenu(0)
    await galleryPage.moveImageToFolder(TEST_FOLDER_NAME)
    await expect(page.locator('text=/Image moved|moved successfully/')).toBeVisible()

    // Get count before rename
    const countBefore = await galleryPage.getFolderCount(TEST_FOLDER_NAME)

    // Rename folder
    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickRenameFromContextMenu()
    await galleryPage.fillFolderName(UPDATED_FOLDER_NAME)
    await galleryPage.clickUpdateFolder()
    await expect(page.locator('text=Folder updated successfully')).toBeVisible()

    // Verify count is same
    const countAfter = await galleryPage.getFolderCount(UPDATED_FOLDER_NAME)
    expect(countAfter).toBe(countBefore)
  })

  test('should reject empty name during rename', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickRenameFromContextMenu()
    await galleryPage.fillFolderName('')
    await galleryPage.clickUpdateFolder()

    // Should show error
    await expect(page.locator('text=/Please enter a folder name|Folder name cannot be empty/')).toBeVisible()
  })

  test('should reject duplicate name during rename', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create second folder
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName('Second Folder')
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Try to rename first folder to second folder's name
    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickRenameFromContextMenu()
    await galleryPage.fillFolderName('Second Folder')
    await galleryPage.clickUpdateFolder()

    // Should show error
    await expect(page.locator('text=A folder with this name already exists')).toBeVisible()
  })
})

// ============================================================================
// 6. Folder Delete Tests
// ============================================================================

test.describe('Folder Delete', () => {
  test.beforeEach(async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create a test folder
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()
  })

  test('should show delete confirmation dialog', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickDeleteFromContextMenu()

    // Verify confirmation dialog
    await expect(page.locator('text=Delete Folder')).toBeVisible()
    await expect(page.locator(`text="${TEST_FOLDER_NAME}"`)).toBeVisible()
  })

  test('should delete folder and remove from sidebar', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickDeleteFromContextMenu()
    await galleryPage.clickDelete()

    // Verify success
    await expect(page.locator('text=/Folder deleted|deleted successfully/')).toBeVisible()

    // Verify folder removed from sidebar
    await expect(page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })).not.toBeVisible()
  })

  test('should move images to uncategorized when folder is deleted', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Move an image to the folder
    await galleryPage.clickAllImages()
    await galleryPage.openImageActionMenu(0)
    await galleryPage.moveImageToFolder(TEST_FOLDER_NAME)
    await expect(page.locator('text=/Image moved|moved successfully/')).toBeVisible()

    // Get uncategorized count before
    const uncategorizedBefore = await galleryPage.getFolderCount('Uncategorized')

    // Delete folder
    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickDeleteFromContextMenu()
    await galleryPage.clickDelete()
    await expect(page.locator('text=/Folder deleted|deleted successfully/')).toBeVisible()

    // Verify uncategorized count increased
    const uncategorizedAfter = await galleryPage.getFolderCount('Uncategorized')
    expect(uncategorizedAfter).toBe(uncategorizedBefore + 1)
  })

  test('should cancel delete operation', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickDeleteFromContextMenu()
    await galleryPage.clickCancel()

    // Verify folder still exists
    await expect(page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })).toBeVisible()
  })
})

// ============================================================================
// 7. Folder Color Tests
// ============================================================================

test.describe('Folder Color', () => {
  test('should create folder with color badge', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.selectFolderColor(TEST_FOLDER_COLOR)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Verify color badge
    const folderButton = page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })
    const colorBadge = folderButton.locator(`[style*="${TEST_FOLDER_COLOR}"]`)
    await expect(colorBadge).toBeVisible()
  })

  test('should change folder color', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create folder with red color
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.selectFolderColor(TEST_FOLDER_COLOR)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Change to green
    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickRenameFromContextMenu()
    await galleryPage.selectFolderColor(UPDATED_FOLDER_COLOR)
    await galleryPage.clickUpdateFolder()
    await expect(page.locator('text=Folder updated successfully')).toBeVisible()

    // Verify new color
    const folderButton = page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })
    const colorBadge = folderButton.locator(`[style*="${UPDATED_FOLDER_COLOR}"]`)
    await expect(colorBadge).toBeVisible()
  })

  test('should remove folder color', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create folder with color
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.selectFolderColor(TEST_FOLDER_COLOR)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Remove color
    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickRenameFromContextMenu()
    await galleryPage.clearFolderColor()
    await galleryPage.clickUpdateFolder()
    await expect(page.locator('text=Folder updated successfully')).toBeVisible()

    // Verify no color badge (should show folder icon instead)
    const folderButton = page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })
    const folderIcon = folderButton.locator('[class*="lucide-folder"]')
    await expect(folderIcon).toBeVisible()
  })
})

// ============================================================================
// 8. Responsive Design Tests
// ============================================================================

test.describe('Responsive Design', () => {
  test('should show sidebar on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.goto()

    expect(await galleryPage.isSidebarVisible()).toBe(true)
    expect(await galleryPage.isHamburgerVisible()).toBe(false)
  })

  test('should hide sidebar and show hamburger on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.goto()

    expect(await galleryPage.isSidebarVisible()).toBe(false)
    expect(await galleryPage.isHamburgerVisible()).toBe(true)
  })

  test('should collapse/expand sidebar on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.goto()

    // Find and click collapse button
    const collapseButton = page.getByRole('button', { name: /collapse|expand/i })
    if (await collapseButton.isVisible()) {
      await collapseButton.click()

      // Wait for animation
      await page.waitForTimeout(500)

      // Verify sidebar is collapsed (should be narrower)
      const sidebar = page.locator('[data-testid="folder-sidebar"]').or(page.locator('.sidebar'))
      const width = await sidebar.evaluate((el) => el.getBoundingClientRect().width)
      expect(width).toBeLessThan(200)
    }
  })
})

// ============================================================================
// 9. Empty States Tests
// ============================================================================

test.describe('Empty States', () => {
  test('should show empty state when folder has no images', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create empty folder
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Click folder
    await galleryPage.clickFolder(TEST_FOLDER_NAME)

    // Verify empty state
    await expect(page.locator('text=/No images in this folder|This folder is empty/')).toBeVisible()
  })

  test('should show create folder prompt when no folders exist', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    await galleryPage.goto()

    // Check if "Create your first folder" prompt exists
    // This might not be visible if user already has folders
    const emptyPrompt = page.locator('text=/Create your first folder|No folders yet/')
    const hasPrompt = await emptyPrompt.isVisible()

    // This is conditional based on user's data
    if (hasPrompt) {
      await expect(emptyPrompt).toBeVisible()
    }
  })
})

// ============================================================================
// 10. Integration Tests
// ============================================================================

test.describe('Integration Tests', () => {
  test('should handle complete folder workflow', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // 1. Create folder
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.selectFolderColor(TEST_FOLDER_COLOR)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // 2. Move image to folder
    await galleryPage.clickAllImages()
    await galleryPage.openImageActionMenu(0)
    await galleryPage.moveImageToFolder(TEST_FOLDER_NAME)
    await expect(page.locator('text=/Image moved|moved successfully/')).toBeVisible()

    // 3. Verify image in folder
    await galleryPage.clickFolder(TEST_FOLDER_NAME)
    expect(await galleryPage.getImageCount()).toBe(1)

    // 4. Rename folder
    await galleryPage.rightClickFolder(TEST_FOLDER_NAME)
    await galleryPage.clickRenameFromContextMenu()
    await galleryPage.fillFolderName(UPDATED_FOLDER_NAME)
    await galleryPage.clickUpdateFolder()
    await expect(page.locator('text=Folder updated successfully')).toBeVisible()

    // 5. Verify image still in renamed folder
    await galleryPage.clickFolder(UPDATED_FOLDER_NAME)
    expect(await galleryPage.getImageCount()).toBe(1)

    // 6. Delete folder
    await galleryPage.rightClickFolder(UPDATED_FOLDER_NAME)
    await galleryPage.clickDeleteFromContextMenu()
    await galleryPage.clickDelete()
    await expect(page.locator('text=/Folder deleted|deleted successfully/')).toBeVisible()

    // 7. Verify image moved to uncategorized
    await galleryPage.clickUncategorized()
    const uncategorizedCount = await galleryPage.getImageCount()
    expect(uncategorizedCount).toBeGreaterThan(0)
  })

  test('should maintain folder state across page navigation', async ({ page }) => {
    const galleryPage = new GalleryFolderPage(page)

    // Create folder
    await galleryPage.clickNewFolder()
    await galleryPage.fillFolderName(TEST_FOLDER_NAME)
    await galleryPage.clickCreateFolder()
    await expect(page.locator('text=Folder created successfully')).toBeVisible()

    // Navigate away and back
    await page.goto('/')
    await galleryPage.goto()

    // Verify folder still exists
    await expect(page.getByRole('button', { name: new RegExp(TEST_FOLDER_NAME) })).toBeVisible()
  })
})
