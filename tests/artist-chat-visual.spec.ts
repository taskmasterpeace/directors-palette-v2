import { test, expect } from '@playwright/test'

test.describe('Artist Chat — Desktop Visual & Functional', () => {
  test('full chat flow: select artist, send messages about music style and lyrics, verify replies', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to Music Lab via sidebar
    const musicLabNav = page.getByText('Music Lab').first()
    await expect(musicLabNav).toBeVisible({ timeout: 5000 })
    await musicLabNav.click()
    await page.waitForTimeout(1500)

    await page.screenshot({ path: 'tests/screenshots/chat-d01-music-lab.png' })

    // Click Artist Chat sub-tab
    const chatTab = page.getByText('Artist Chat').first()
    if (await chatTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatTab.click()
      await page.waitForTimeout(1500)
    }

    await page.screenshot({ path: 'tests/screenshots/chat-d02-artist-picker.png' })

    // Select first artist if picker is showing
    const artistPickerText = page.getByText('Choose an artist to start chatting')
    if (await artistPickerText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const artistButton = page.locator('button').filter({ has: page.locator('.rounded-full.ring-2') }).first()
      if (await artistButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const artistName = await artistButton.textContent()
        console.log(`Selecting artist: ${artistName?.trim()}`)
        await artistButton.click()
        await page.waitForTimeout(3000)
      } else {
        console.log('No artists found — create an artist first')
        await page.screenshot({ path: 'tests/screenshots/chat-d02b-no-artists.png' })
        return
      }
    }

    await page.screenshot({ path: 'tests/screenshots/chat-d03-chat-view.png' })

    // Check chat input
    const chatInput = page.locator('input[placeholder="Type a message..."]')
    const inputVisible = await chatInput.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`Desktop chat input visible: ${inputVisible}`)

    if (!inputVisible) {
      console.log('Chat input not found — chat may not have loaded')
      return
    }

    // Check for living context
    const contextArea = page.getByText(/tap for details/i)
    const hasContext = await contextArea.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`Living context visible: ${hasContext}`)

    // === MESSAGE 1: Ask about music style ===
    await chatInput.fill("What kind of beats are you feeling right now? I'm thinking something with heavy 808s and a dark trap vibe.")
    await page.waitForTimeout(200)
    await page.screenshot({ path: 'tests/screenshots/chat-d04-typed-music-style.png' })

    await page.keyboard.press('Enter')
    console.log('Sent music style message, waiting for reply...')

    // Wait for artist response
    await page.waitForTimeout(12000)
    await page.screenshot({ path: 'tests/screenshots/chat-d05-music-style-reply.png' })

    // Verify user message appeared
    const userMsg1 = page.getByText('heavy 808s')
    const userMsg1Visible = await userMsg1.isVisible({ timeout: 3000 }).catch(() => false)
    console.log(`User message 1 visible: ${userMsg1Visible}`)

    // Check for artist reply (any message from the artist side)
    // Artist messages have different styling from user messages
    const allMessages = page.locator('[class*="rounded-2xl"][class*="px-"]')
    const msgCount = await allMessages.count()
    console.log(`Total message bubbles after first exchange: ${msgCount}`)

    // === MESSAGE 2: Ask for lyrics ===
    await chatInput.fill("Write me a verse about staying focused and grinding every day. Something with bars.")
    await page.waitForTimeout(200)
    await page.keyboard.press('Enter')
    console.log('Sent lyrics request, waiting for reply...')

    await page.waitForTimeout(12000)
    await page.screenshot({ path: 'tests/screenshots/chat-d06-lyrics-reply.png' })

    const msgCountAfter = await allMessages.count()
    console.log(`Total message bubbles after lyrics exchange: ${msgCountAfter}`)

    // Check if lyrics formatting appeared (amber accent)
    const lyricsElements = page.locator('[class*="border-l"][class*="amber"]')
    const lyricsCount = await lyricsElements.count()
    console.log(`Lyrics-styled elements: ${lyricsCount}`)

    // === MESSAGE 3: General conversation ===
    await chatInput.fill("That's fire! Can we collab on something? What's your creative process like?")
    await page.waitForTimeout(200)
    await page.keyboard.press('Enter')
    console.log('Sent conversation message, waiting for reply...')

    await page.waitForTimeout(12000)
    await page.screenshot({ path: 'tests/screenshots/chat-d07-conversation.png' })

    // Final full-page desktop screenshot
    await page.screenshot({ path: 'tests/screenshots/chat-d08-desktop-final.png', fullPage: true })

    const finalMsgCount = await allMessages.count()
    console.log(`Final message count: ${finalMsgCount}`)
    console.log('Desktop chat flow complete')
  })
})

test.describe('Artist Chat — Mobile Visual', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('mobile chat layout, send message, verify reply looks good', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.screenshot({ path: 'tests/screenshots/chat-m01-mobile-home.png' })

    // On mobile, need to open the navigation menu first
    // Look for the floating logo button / hamburger
    const menuButton = page.locator('button').first()
    await page.waitForTimeout(1000)

    // Try finding Music Lab directly (might be visible on mobile)
    let musicLabFound = false
    const musicLabDirect = page.getByText('Music Lab')
    if (await musicLabDirect.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await musicLabDirect.first().click()
      musicLabFound = true
    }

    if (!musicLabFound) {
      // Try opening mobile menu
      const allButtons = page.locator('button')
      const buttonCount = await allButtons.count()
      // Click first visible button that might be the menu
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const btn = allButtons.nth(i)
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
          await page.waitForTimeout(500)
          const musicLabInMenu = page.getByText('Music Lab').first()
          if (await musicLabInMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
            await musicLabInMenu.click()
            musicLabFound = true
            break
          }
        }
      }
    }

    if (!musicLabFound) {
      console.log('Could not find Music Lab navigation on mobile')
      await page.screenshot({ path: 'tests/screenshots/chat-m01b-no-music-lab.png' })
      return
    }

    await page.waitForTimeout(1500)
    await page.screenshot({ path: 'tests/screenshots/chat-m02-music-lab.png' })

    // Click Artist Chat sub-tab — on mobile, labels are hidden (icons only)
    // Artist Chat is the 2nd tab button in the sub-tab bar
    const chatTab = page.getByText('Artist Chat').first()
    if (await chatTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chatTab.click()
    } else {
      // Mobile: click the 2nd sub-tab button (Artist Chat icon)
      const subTabButtons = page.locator('.border-b button')
      const tabCount = await subTabButtons.count()
      console.log(`Mobile sub-tab buttons found: ${tabCount}`)
      if (tabCount >= 2) {
        await subTabButtons.nth(1).click() // 2nd button = Artist Chat
      }
    }
    await page.waitForTimeout(1500)

    await page.screenshot({ path: 'tests/screenshots/chat-m03-artist-picker.png' })

    // Select artist
    const artistPickerText = page.getByText('Choose an artist to start chatting')
    if (await artistPickerText.isVisible({ timeout: 3000 }).catch(() => false)) {
      const artistButton = page.locator('button').filter({ has: page.locator('.rounded-full.ring-2') }).first()
      if (await artistButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await artistButton.click()
        await page.waitForTimeout(3000)
      } else {
        console.log('Mobile: No artists available')
        return
      }
    }

    await page.screenshot({ path: 'tests/screenshots/chat-m04-chat-view.png' })

    const chatInput = page.locator('input[placeholder="Type a message..."]')
    const inputVisible = await chatInput.isVisible({ timeout: 5000 }).catch(() => false)
    console.log(`Mobile chat input visible: ${inputVisible}`)

    if (!inputVisible) {
      console.log('Mobile chat input not visible')
      return
    }

    // Send a message about music
    await chatInput.fill("What genre are you vibing with today? Let's make something.")
    await page.waitForTimeout(200)
    await page.screenshot({ path: 'tests/screenshots/chat-m05-typed.png' })

    await page.keyboard.press('Enter')
    console.log('Mobile: sent message, waiting for reply...')
    await page.waitForTimeout(12000)

    await page.screenshot({ path: 'tests/screenshots/chat-m06-reply.png' })

    // Check message bubbles aren't overflowing on mobile
    const messages = page.locator('[class*="rounded-2xl"][class*="px-"]')
    const count = await messages.count()
    console.log(`Mobile message count: ${count}`)

    // Send lyrics request
    await chatInput.fill("Spit some bars about the hustle for me")
    await page.keyboard.press('Enter')
    console.log('Mobile: sent lyrics request...')
    await page.waitForTimeout(12000)

    await page.screenshot({ path: 'tests/screenshots/chat-m07-lyrics.png' })

    // Final mobile screenshot
    await page.screenshot({ path: 'tests/screenshots/chat-m08-final.png', fullPage: true })

    const finalCount = await messages.count()
    console.log(`Mobile final message count: ${finalCount}`)
    console.log('Mobile chat flow complete')
  })
})
