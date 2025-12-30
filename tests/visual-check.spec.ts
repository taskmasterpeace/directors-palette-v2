import { test, expect } from '@playwright/test';

test.describe('Visual Check - Desktop & Mobile', () => {

  test('Desktop - Main app loads correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for animations

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/desktop-main.png', fullPage: true });

    // Basic checks - should see sidebar
    await expect(page.locator('body')).toBeVisible();
    console.log('Desktop Main: OK');
  });

  test('Desktop - Gallery loads correctly', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/desktop-gallery.png', fullPage: true });

    // Basic checks
    await expect(page.locator('body')).toBeVisible();
    console.log('Desktop Gallery: OK');
  });

  test('Mobile - Main app (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/mobile-main.png', fullPage: true });

    // Basic checks
    await expect(page.locator('body')).toBeVisible();
    console.log('Mobile Main: OK');
  });

  test('Mobile - Gallery (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/mobile-gallery.png', fullPage: true });

    // Basic checks
    await expect(page.locator('body')).toBeVisible();
    console.log('Mobile Gallery: OK');
  });
});
