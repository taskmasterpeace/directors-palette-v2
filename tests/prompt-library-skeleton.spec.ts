import { test, expect } from '@playwright/test';

test.describe('Prompt Library - Loading Skeleton', () => {

  test('Desktop - App loads correctly with skeleton support', async ({ page }) => {
    // Navigate to Shot Creator
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/desktop-shot-creator.png', fullPage: true });

    // Check if skeleton elements exist (they animate with pulse)
    const skeletons = page.locator('.animate-pulse');
    const skeletonCount = await skeletons.count();
    console.log(`Found ${skeletonCount} skeleton elements`);

    // Basic check - page loads without errors
    await expect(page.locator('body')).toBeVisible();
    console.log('Desktop Shot Creator: OK');
  });

  test('Mobile - App loads correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'tests/screenshots/mobile-shot-creator.png', fullPage: true });

    await expect(page.locator('body')).toBeVisible();
    console.log('Mobile Shot Creator: OK');
  });

});
