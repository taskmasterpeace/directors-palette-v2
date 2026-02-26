import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3002';

async function main() {
  const authPath = path.join(process.cwd(), 'tests', '.auth', 'user.json');
  const storageState = JSON.parse(fs.readFileSync(authPath, 'utf-8'));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  console.log('1. Navigating to test page...');
  await page.goto(`${BASE_URL}/test-clapperboard`);
  await page.waitForLoadState('networkidle');

  // Wait for initial render + at least one interval tick (500ms)
  console.log('2. Waiting for first tick...');
  await page.waitForTimeout(1500);

  // Read SVG text to verify updates
  let texts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('svg text')).map(t => t.textContent);
  });
  console.log('   SVG text after 1.5s:', texts.join(', '));
  await page.screenshot({ path: 'test-spinner-1s.png', fullPage: true });

  // Wait for 5s mark - Z-Image Turbo (2s) should be in overtime
  console.log('3. Waiting to 5s mark...');
  await page.waitForTimeout(3500);
  texts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('svg text')).map(t => t.textContent);
  });
  console.log('   SVG text after 5s:', texts.join(', '));
  await page.screenshot({ path: 'test-spinner-5s.png', fullPage: true });

  // Wait for 12s mark - check Nano Banana progress (~50%)
  console.log('4. Waiting to 12s mark...');
  await page.waitForTimeout(7000);
  texts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('svg text')).map(t => t.textContent);
  });
  console.log('   SVG text after 12s:', texts.join(', '));
  await page.screenshot({ path: 'test-spinner-12s.png', fullPage: true });

  // Screenshot closeup of first card (should be in overtime)
  const firstCard = page.locator('.rounded-lg.border').first();
  if (await firstCard.isVisible()) {
    await firstCard.screenshot({ path: 'test-spinner-turbo-overtime.png' });
    console.log('5. Captured Z-Image Turbo closeup (overtime)');
  }

  // Screenshot closeup of second card (Nano Banana in progress)
  const secondCard = page.locator('.rounded-lg.border').nth(1);
  if (await secondCard.isVisible()) {
    await secondCard.screenshot({ path: 'test-spinner-banana-progress.png' });
    console.log('6. Captured Nano Banana closeup (in progress)');
  }

  console.log('Done! Closing in 3s...');
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch(console.error);
