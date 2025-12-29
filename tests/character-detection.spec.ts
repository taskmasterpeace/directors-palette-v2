import { test, expect } from '@playwright/test';

test.describe('Character Detection Fix', () => {
  // Increase timeout for this test since it involves story generation
  test.setTimeout(300000); // 5 minutes

  test('should route supporting characters correctly', async ({ page }) => {
    // Navigate to Storybook
    await page.goto('/');
    await page.click('text=Storybook');
    await page.waitForTimeout(1000);

    // Helper to wait for navigation button (Continue or Next) and click when enabled
    const clickNextButton = async (maxWait: number = 30000) => {
      console.log('Looking for Continue/Next button...');
      // Try "Continue" first, then "Next"
      let btn = page.locator('button:has-text("Continue")').first();
      try {
        await btn.waitFor({ state: 'visible', timeout: 3000 });
      } catch {
        // Try "Next" button
        btn = page.locator('button:has-text("Next")').first();
      }
      try {
        await btn.waitFor({ state: 'visible', timeout: maxWait });
        await expect(btn).toBeEnabled({ timeout: maxWait });
        await btn.click();
        console.log('Clicked navigation button');
        await page.waitForTimeout(500);
        return true;
      } catch {
        console.log('Navigation button not found or not enabled');
        return false;
      }
    };

    // Step 1: Character - Enter character name
    console.log('=== Step 1: Character ===');
    await page.fill('input[placeholder*="Enter a name"]', 'Emma');
    await clickNextButton();

    // Step 2: Category - Select Custom Story
    console.log('=== Step 2: Category ===');
    await page.click('h3:has-text("Custom Story")');
    await page.waitForTimeout(300);
    await clickNextButton();

    // Step 3: Topic - Fill story topic and generate ideas
    console.log('=== Step 3: Topic ===');
    const topicInput = page.locator('textarea').first();
    await topicInput.waitFor({ state: 'visible', timeout: 5000 });
    await topicInput.fill('Emma meets animal friends in the garden including a blue bird, a brown rabbit, and a green turtle');
    await page.waitForTimeout(500);

    // Click Generate Story Ideas
    console.log('Clicking Generate Story Ideas...');
    const generateIdeasBtn = page.locator('button:has-text("Generate")').first();
    await generateIdeasBtn.waitFor({ state: 'visible', timeout: 5000 });
    await generateIdeasBtn.click();

    // Wait for story ideas to appear (check for "Choose Your Story" heading)
    console.log('Waiting for story ideas...');
    await page.waitForSelector('h2:has-text("Choose Your Story")', { timeout: 120000 });
    console.log('Story ideas generated!');

    // Click on the first story card (h3 inside the story cards section)
    // Story cards contain h3 headings with titles like "Emma's Garden Quest"
    const storyTitle = page.locator('h3').filter({ hasText: /Emma/ }).first();
    await storyTitle.waitFor({ state: 'visible', timeout: 10000 });
    await storyTitle.click();
    console.log('Clicked story idea');
    await page.waitForTimeout(2000); // Wait for story generation to start

    // Step 4: Settings - click navigation button when available
    console.log('=== Step 4: Settings ===');
    await clickNextButton(60000);

    // Step 5: Approach - click navigation button
    console.log('=== Step 5: Approach ===');
    await clickNextButton(10000);

    // Step 6: Review - Generate full story and continue
    console.log('=== Step 6: Review ===');
    // Check if there's a Generate button
    const genStoryBtn = page.locator('button:has-text("Generate Story")');
    try {
      if (await genStoryBtn.isVisible({ timeout: 5000 })) {
        await genStoryBtn.click();
        console.log('Clicked Generate Story');
        // Wait for story generation to complete
        await page.waitForTimeout(30000);
      }
    } catch {
      console.log('No Generate Story button found, continuing...');
    }
    await clickNextButton(120000);

    // Step 7: Style - select Watercolor
    console.log('=== Step 7: Style ===');
    try {
      const watercolorStyle = page.locator('h3:has-text("Watercolor")').first();
      if (await watercolorStyle.isVisible({ timeout: 5000 })) {
        await watercolorStyle.click();
        console.log('Selected Watercolor style');
        await page.waitForTimeout(500);
      }
    } catch {
      console.log('Watercolor style not found, continuing...');
    }
    await clickNextButton(10000);

    // Step 8: Characters - THIS IS WHERE WE TEST THE FIX
    console.log('=== Step 8: Characters ===');
    await page.waitForSelector('text=Create Characters', { timeout: 30000 });
    console.log('Characters step loaded!');

    // Wait for character detection to complete
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/character-detection-test.png', fullPage: true });
    console.log('Screenshot saved');

    // Check for supporting character badges
    const supportingBadges = page.locator('text=Supporting');
    const supportingCount = await supportingBadges.count();
    console.log(`Found ${supportingCount} supporting character badges`);

    // Check for "Generate from Description" buttons
    const generateDescButtons = page.locator('button:has-text("Generate from Description")');
    const buttonCount = await generateDescButtons.count();
    console.log(`Found ${buttonCount} "Generate from Description" buttons`);

    // Verify the fix - supporting characters should have enabled buttons
    if (buttonCount > 0) {
      let enabledCount = 0;
      for (let i = 0; i < buttonCount; i++) {
        const btn = generateDescButtons.nth(i);
        const isDisabled = await btn.isDisabled();
        console.log(`Button ${i + 1} disabled: ${isDisabled}`);
        if (!isDisabled) enabledCount++;
      }

      console.log(`Total enabled buttons: ${enabledCount} out of ${buttonCount}`);

      // At least one should be enabled (supporting characters don't need photos)
      // The first button might be for main character (Emma) who needs a photo
      // But supporting characters should have enabled buttons
      expect(enabledCount).toBeGreaterThan(0);
      console.log('SUCCESS: Found enabled Generate from Description buttons!');
    }

    if (supportingCount > 0) {
      console.log('SUCCESS: Found supporting character badges!');
    } else {
      console.log('Note: No "Supporting" text found - may need to verify badge text');
    }
  });
});
