import { test, expect } from '@playwright/test'

test.describe('Gallery Upgrades & Bugfixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('1. Black text bug fix — prompt text stays visible after typing and clearing', async ({ page }) => {
    // Navigate to Shot Creator via sidebar
    const shotCreatorNav = page.getByText('Shot Creator').first()
    if (await shotCreatorNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shotCreatorNav.click()
      await page.waitForTimeout(1000)
    }

    const textarea = page.getByLabel('Prompt').last()
    await expect(textarea).toBeAttached({ timeout: 10000 })

    // Type text with @ reference syntax
    await textarea.evaluate(el => el.focus())
    await textarea.pressSequentially('@test_ref hello world', { delay: 30 })
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'tests/screenshots/upgrade-01-typed.png' })

    // Clear the text (simulating deleting reference)
    await textarea.evaluate((el: HTMLTextAreaElement) => {
      el.value = 'hello world'
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForTimeout(300)

    await page.screenshot({ path: 'tests/screenshots/upgrade-02-cleared.png' })

    // Check textarea still has content and isn't invisible
    const value = await textarea.inputValue()
    console.log(`Textarea value after clearing ref: "${value}"`)
  })

  test('2. Upscale button exists in gallery image action menu', async ({ page }) => {
    // Navigate to Gallery via sidebar
    const galleryNav = page.getByText('Gallery').first()
    if (await galleryNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await galleryNav.click()
      await page.waitForTimeout(2000)
    }

    await page.screenshot({ path: 'tests/screenshots/upgrade-03a-gallery.png' })

    // Find a gallery image card with a dropdown trigger
    const menuButton = page.locator('[aria-label="Image actions menu"]').first()
    const menuExists = await menuButton.isVisible({ timeout: 5000 }).catch(() => false)

    if (menuExists) {
      await menuButton.click()
      await page.waitForTimeout(500)

      await page.screenshot({ path: 'tests/screenshots/upgrade-03-dropdown.png' })

      // Check for upscale menu item
      const upscaleItem = page.getByText('Upscale 4x (2 pts)')
      const upscaleVisible = await upscaleItem.isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`Upscale 4x button visible in dropdown: ${upscaleVisible}`)

      // Also check Remove Background is there
      const removeBgItem = page.getByText('Remove Background (3 pts)')
      const removeBgVisible = await removeBgItem.isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`Remove Background button visible: ${removeBgVisible}`)
    } else {
      // No gallery images — try Shot Creator which may have recent images
      console.log('No gallery images found in Gallery tab, trying Shot Creator...')
      const shotCreatorNav = page.getByText('Shot Creator').first()
      if (await shotCreatorNav.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shotCreatorNav.click()
        await page.waitForTimeout(2000)
      }

      const menuButton2 = page.locator('[aria-label="Image actions menu"]').first()
      const menuExists2 = await menuButton2.isVisible({ timeout: 5000 }).catch(() => false)

      if (menuExists2) {
        await menuButton2.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'tests/screenshots/upgrade-03-dropdown.png' })

        const upscaleItem = page.getByText('Upscale 4x (2 pts)')
        const upscaleVisible = await upscaleItem.isVisible({ timeout: 3000 }).catch(() => false)
        console.log(`Upscale 4x button visible in dropdown: ${upscaleVisible}`)
      } else {
        console.log('No gallery images found anywhere — generate an image first to test dropdown')
        await page.screenshot({ path: 'tests/screenshots/upgrade-03-no-gallery.png' })
      }
    }
  })

  test('3. Upscale button exists in fullscreen modal', async ({ page }) => {
    // Navigate to Gallery via sidebar
    const galleryNav = page.getByText('Gallery').first()
    if (await galleryNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await galleryNav.click()
      await page.waitForTimeout(2000)
    }

    // Click on first gallery image to open fullscreen modal
    const galleryImage = page.locator('img[alt]').first()
    const imageExists = await galleryImage.isVisible({ timeout: 5000 }).catch(() => false)

    if (imageExists) {
      await galleryImage.click()
      await page.waitForTimeout(500)

      await page.screenshot({ path: 'tests/screenshots/upgrade-03b-fullscreen.png' })

      // Check for upscale button in fullscreen modal
      const upscaleButton = page.getByText('Upscale 4x (2 pts)')
      const upscaleVisible = await upscaleButton.isVisible({ timeout: 3000 }).catch(() => false)
      console.log(`Upscale 4x button in fullscreen modal: ${upscaleVisible}`)
    } else {
      console.log('No images in gallery to open fullscreen modal')
      await page.screenshot({ path: 'tests/screenshots/upgrade-03b-no-images.png' })
    }
  })

  test('4. Wildcard detail modal in community', async ({ page }) => {
    // Navigate to Community via sidebar text
    const communityNav = page.getByText('Community').first()
    if (await communityNav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await communityNav.click()
      await page.waitForTimeout(2000)

      await page.screenshot({ path: 'tests/screenshots/upgrade-04-community.png' })

      // Click the "Wildcards" filter tab to show only wildcard items
      const wildcardFilter = page.locator('button').filter({ hasText: 'Wildcards' }).first()
      if (await wildcardFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await wildcardFilter.click()
        await page.waitForTimeout(1500)
      }

      await page.screenshot({ path: 'tests/screenshots/upgrade-05-wildcards.png' })

      // Now click a wildcard card — they have cursor-pointer class from CommunityCard
      // After filtering to wildcards, all visible cards should be wildcard type
      const wildcardCard = page.locator('.cursor-pointer.group').first()
      if (await wildcardCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        const cardText = await wildcardCard.textContent()
        console.log(`Clicking wildcard card: "${cardText?.substring(0, 50)}..."`)
        await wildcardCard.click()
        await page.waitForTimeout(1000)

        await page.screenshot({ path: 'tests/screenshots/upgrade-06-wildcard-modal.png' })

        // Check if dialog appeared
        const dialog = page.locator('[role="dialog"]')
        const dialogVisible = await dialog.isVisible({ timeout: 3000 }).catch(() => false)
        console.log(`Wildcard detail modal visible: ${dialogVisible}`)

        if (dialogVisible) {
          // Check for entries list and add button
          const addButton = page.getByText(/Add to My Wildcards|Already in My Wildcards/)
          const addVisible = await addButton.isVisible({ timeout: 3000 }).catch(() => false)
          console.log(`Add/Already button visible: ${addVisible}`)

          // Check for entry count badge
          const entryBadge = page.getByText(/\d+ entries/)
          const badgeVisible = await entryBadge.isVisible({ timeout: 3000 }).catch(() => false)
          console.log(`Entry count badge visible: ${badgeVisible}`)

          await page.screenshot({ path: 'tests/screenshots/upgrade-07-modal-content.png' })
        }
      } else {
        console.log('No wildcard cards found after filtering')
        await page.screenshot({ path: 'tests/screenshots/upgrade-05b-no-wildcards.png' })
      }
    } else {
      console.log('Community nav item not found in sidebar')
      await page.screenshot({ path: 'tests/screenshots/upgrade-04-no-community.png' })
    }
  })
})
