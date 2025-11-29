/**
 * Test Data Helpers
 * Utilities for creating and managing test data for folder system tests
 */

import { Page } from '@playwright/test'

export const FOLDER_COLORS = {
  RED: '#EF4444',
  AMBER: '#F59E0B',
  GREEN: '#10B981',
  BLUE: '#3B82F6',
  PURPLE: '#8B5CF6',
  PINK: '#EC4899',
  GRAY: '#6B7280',
  TEAL: '#14B8A6',
} as const

export const TEST_FOLDERS = {
  BASIC: {
    name: 'Test Folder',
    color: FOLDER_COLORS.RED,
  },
  UPDATED: {
    name: 'Updated Test Folder',
    color: FOLDER_COLORS.GREEN,
  },
  CHARACTERS: {
    name: 'Characters',
    color: FOLDER_COLORS.BLUE,
  },
  LOCATIONS: {
    name: 'Locations',
    color: FOLDER_COLORS.PURPLE,
  },
  PROPS: {
    name: 'Props',
    color: FOLDER_COLORS.AMBER,
  },
  NO_COLOR: {
    name: 'No Color Folder',
    color: undefined,
  },
} as const

export const RESERVED_NAMES = ['All', 'Uncategorized', 'All Images']

export const VALIDATION = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 50,
  MAX_FOLDERS_PER_USER: 100,
}

/**
 * Generate a random folder name for tests that need unique names
 */
export function generateRandomFolderName(prefix = 'Test'): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Generate folder name that's too long for validation testing
 */
export function generateLongFolderName(): string {
  return 'a'.repeat(VALIDATION.MAX_NAME_LENGTH + 1)
}

/**
 * Create multiple test folders at once
 */
export async function createTestFolders(
  page: Page,
  folders: Array<{ name: string; color?: string }>
): Promise<void> {
  for (const folder of folders) {
    await page.getByRole('button', { name: 'New Folder' }).click()
    await page.getByLabel('Folder Name *').fill(folder.name)

    if (folder.color) {
      await page.locator(`button[style*="background-color: ${folder.color}"]`).click()
    }

    await page.getByRole('button', { name: 'Create Folder' }).click()
    await page.locator('text=Folder created successfully').waitFor({ state: 'visible' })
    await page.locator('text=Folder created successfully').waitFor({ state: 'hidden' })
  }
}

/**
 * Delete all test folders (cleanup helper)
 */
export async function deleteAllTestFolders(page: Page): Promise<void> {
  // Get all folder buttons except special folders
  const folderButtons = page.locator('[data-testid="user-folder"]').or(
    page.locator('button:has-text("Test")')
  )

  const count = await folderButtons.count()

  for (let i = 0; i < count; i++) {
    try {
      await folderButtons.first().click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Delete' }).click()
      await page.getByRole('button', { name: 'Delete' }).click()
      await page.locator('text=/Folder deleted|deleted successfully/').waitFor({ state: 'visible' })
      await page.locator('text=/Folder deleted|deleted successfully/').waitFor({ state: 'hidden' })
    } catch (error) {
      // Ignore errors during cleanup
      console.log('Cleanup error (expected):', error)
    }
  }
}

/**
 * Verify folder exists in sidebar
 */
export async function verifyFolderExists(
  page: Page,
  folderName: string
): Promise<boolean> {
  const folder = page.getByRole('button', { name: new RegExp(folderName) })
  return await folder.isVisible()
}

/**
 * Get folder count badge value
 */
export async function getFolderImageCount(
  page: Page,
  folderName: string
): Promise<number> {
  const folderButton = page.getByRole('button', { name: new RegExp(folderName) })
  const badge = folderButton.locator('[class*="badge"]')
  const text = await badge.textContent()
  return parseInt(text || '0', 10)
}

/**
 * Wait for folder operation to complete
 */
export async function waitForFolderOperation(
  page: Page,
  operation: 'create' | 'update' | 'delete'
): Promise<void> {
  const messages = {
    create: /Folder created|created successfully/,
    update: /Folder updated|updated successfully/,
    delete: /Folder deleted|deleted successfully/,
  }

  await page.locator(`text=${messages[operation]}`).waitFor({ state: 'visible' })
  await page.locator(`text=${messages[operation]}`).waitFor({ state: 'hidden' })
}

/**
 * Mock test images for folder tests
 */
export interface MockImage {
  id: string
  url: string
  prompt: string
  folderId: string | null
}

export function createMockImages(count: number, folderId: string | null = null): MockImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `test-image-${i + 1}`,
    url: `https://example.com/image-${i + 1}.jpg`,
    prompt: `Test prompt ${i + 1}`,
    folderId,
  }))
}

/**
 * Setup test environment with folders and images
 */
export async function setupTestEnvironment(page: Page): Promise<{
  folders: Array<{ name: string; color?: string }>
  images: MockImage[]
}> {
  const folders = [
    TEST_FOLDERS.CHARACTERS,
    TEST_FOLDERS.LOCATIONS,
    TEST_FOLDERS.PROPS,
  ]

  await createTestFolders(page, folders)

  const images = createMockImages(10)

  return { folders, images }
}

/**
 * Clean up test environment
 */
export async function cleanupTestEnvironment(page: Page): Promise<void> {
  await deleteAllTestFolders(page)
}

/**
 * Test data for validation scenarios
 */
export const VALIDATION_TEST_CASES = {
  EMPTY_NAME: {
    input: '',
    expectedError: /Please enter a folder name|Folder name cannot be empty/,
  },
  WHITESPACE_ONLY: {
    input: '   ',
    expectedError: /Please enter a folder name|Folder name cannot be empty/,
  },
  TOO_LONG: {
    input: generateLongFolderName(),
    expectedError: /Folder name is too long|max 50 characters/,
  },
  RESERVED_ALL: {
    input: 'All',
    expectedError: /This folder name is reserved/,
  },
  RESERVED_UNCATEGORIZED: {
    input: 'Uncategorized',
    expectedError: /This folder name is reserved/,
  },
  RESERVED_ALL_IMAGES: {
    input: 'All Images',
    expectedError: /This folder name is reserved/,
  },
  VALID_MIN_LENGTH: {
    input: 'A',
    expectedError: null,
  },
  VALID_MAX_LENGTH: {
    input: 'a'.repeat(VALIDATION.MAX_NAME_LENGTH),
    expectedError: null,
  },
}

/**
 * Helper to wait for gallery to load
 */
export async function waitForGalleryLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle')
  await page.locator('[data-testid="gallery-loaded"]').or(
    page.locator('text=Unified Gallery')
  ).waitFor({ state: 'visible' })
}

/**
 * Helper to navigate to a specific folder
 */
export async function navigateToFolder(page: Page, folderName: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(folderName) }).click()
  await page.waitForLoadState('networkidle')
}

/**
 * Helper to verify folder is active
 */
export async function verifyFolderIsActive(
  page: Page,
  folderName: string
): Promise<boolean> {
  const folderButton = page.getByRole('button', { name: new RegExp(folderName) })
  const classes = await folderButton.getAttribute('class')
  return classes?.includes('bg-primary') || false
}

/**
 * Helper to get all folder names
 */
export async function getAllFolderNames(page: Page): Promise<string[]> {
  const folders = page.locator('[data-testid="user-folder"]').or(
    page.locator('[class*="folder-item"]')
  )

  const count = await folders.count()
  const names: string[] = []

  for (let i = 0; i < count; i++) {
    const text = await folders.nth(i).textContent()
    if (text) {
      // Extract folder name (remove count badge)
      const name = text.replace(/\d+$/, '').trim()
      names.push(name)
    }
  }

  return names
}

/**
 * Viewport presets for responsive testing
 */
export const VIEWPORTS = {
  MOBILE_SMALL: { width: 320, height: 568 }, // iPhone SE
  MOBILE: { width: 375, height: 667 }, // iPhone 6/7/8
  MOBILE_LARGE: { width: 414, height: 896 }, // iPhone 11 Pro Max
  TABLET: { width: 768, height: 1024 }, // iPad
  DESKTOP_SMALL: { width: 1024, height: 768 },
  DESKTOP: { width: 1280, height: 720 },
  DESKTOP_LARGE: { width: 1920, height: 1080 },
} as const

/**
 * Common test timeouts
 */
export const TIMEOUTS = {
  SHORT: 5000, // For quick operations like button clicks
  MEDIUM: 15000, // For API calls and page loads
  LONG: 30000, // For complex operations like bulk updates
} as const
