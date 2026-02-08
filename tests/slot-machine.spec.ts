import { test, expect } from '@playwright/test';

test.describe('Slot Machine Feature', () => {

  test('Panel appears when typing curly brackets', async ({ page }) => {
    // Navigate to Shot Creator
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find the prompt textarea
    const textarea = page.locator('textarea#prompt');
    await expect(textarea).toBeVisible();

    // Type a prompt without curly brackets - panel should not appear
    await textarea.fill('A woman holding a flower');
    await page.waitForTimeout(500);

    // Take screenshot before
    await page.screenshot({ path: 'tests/screenshots/slot-machine-before.png', fullPage: true });

    // Check that Slot Machine panel is NOT visible
    const panelBefore = page.locator('text=🎰');
    const panelCountBefore = await panelBefore.count();
    console.log(`Panel count before curly brackets: ${panelCountBefore}`);

    // Now type with curly brackets
    await textarea.fill('A woman {holding} a flower');
    await page.waitForTimeout(500);

    // Take screenshot after
    await page.screenshot({ path: 'tests/screenshots/slot-machine-after.png', fullPage: true });

    // Check that Slot Machine panel IS visible
    const panelAfter = page.locator('text=🎰');
    await expect(panelAfter).toBeVisible({ timeout: 5000 });
    console.log('Slot Machine panel appeared!');

    // Check for the counter UI
    const counter = page.locator('text=3').first(); // Default is 3
    await expect(counter).toBeVisible();
    console.log('Counter UI visible');

    // Check for Expand button
    const expandButton = page.locator('button:has-text("Expand")');
    await expect(expandButton).toBeVisible();
    console.log('Expand button visible');
  });

  test('Expand button calls API and shows result', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Type prompt with curly brackets
    const textarea = page.locator('textarea#prompt');
    await textarea.fill('A woman {holding} a flower in {the garden}');
    await page.waitForTimeout(500);

    // Click Expand button
    const expandButton = page.locator('button:has-text("Expand")');
    await expandButton.click();

    // Wait for loading to finish
    await page.waitForTimeout(5000);

    // Take screenshot of result
    await page.screenshot({ path: 'tests/screenshots/slot-machine-expanded.png', fullPage: true });

    // Check for result area (green box) or error
    const resultBox = page.locator('.bg-green-500\\/10');
    const errorBox = page.locator('.bg-red-500\\/10');

    const hasResult = await resultBox.count() > 0;
    const hasError = await errorBox.count() > 0;

    console.log(`Has result: ${hasResult}, Has error: ${hasError}`);

    if (hasResult) {
      // Check for Apply button
      const applyButton = page.locator('button:has-text("Apply")');
      await expect(applyButton).toBeVisible();
      console.log('Apply button visible - expansion successful!');
    }
  });

  test('Counter increments and decrements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const textarea = page.locator('textarea#prompt');
    await textarea.fill('A {test} prompt');
    await page.waitForTimeout(500);

    // Find counter value (should be 3 by default)
    const counterValue = page.locator('.font-mono.w-4.text-center');
    await expect(counterValue).toHaveText('3');

    // Click increment (ChevronUp)
    const incrementBtn = page.locator('button:has(svg.lucide-chevron-up)').first();
    await incrementBtn.click();
    await page.waitForTimeout(200);
    await expect(counterValue).toHaveText('4');
    console.log('Increment works: 3 -> 4');

    // Click increment again
    await incrementBtn.click();
    await page.waitForTimeout(200);
    await expect(counterValue).toHaveText('5');
    console.log('Increment works: 4 -> 5');

    // Should not go above 5
    await incrementBtn.click();
    await page.waitForTimeout(200);
    await expect(counterValue).toHaveText('5');
    console.log('Max limit works: stays at 5');

    // Click decrement
    const decrementBtn = page.locator('button:has(svg.lucide-chevron-down)').first();
    await decrementBtn.click();
    await page.waitForTimeout(200);
    await expect(counterValue).toHaveText('4');
    console.log('Decrement works: 5 -> 4');

    await page.screenshot({ path: 'tests/screenshots/slot-machine-counter.png', fullPage: true });
  });

});
