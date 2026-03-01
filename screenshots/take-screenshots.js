const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Navigate to test route (bypasses auth)
  console.log('Navigating to test-brand-studio...');
  await page.goto('http://localhost:3002/test-brand-studio', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(3000);

  console.log('URL:', page.url());
  await page.screenshot({ path: 'screenshots/01-brand-studio.png' });
  console.log('Saved 01-brand-studio.png');

  // Check for new brand button and click it
  const newBtn = await page.$('button:has-text("New")');
  if (newBtn) {
    await newBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/02-new-brand-dialog.png' });
    console.log('Saved 02-new-brand-dialog.png');

    // Close dialog
    const closeBtn = await page.$('button:has-text("Cancel")');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(500);
  }

  // Click through each tab
  const tabs = ['Library', 'Create', 'Campaigns'];
  for (const tab of tabs) {
    const tabBtn = await page.$('button:has-text("' + tab + '")');
    if (tabBtn) {
      await tabBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'screenshots/03-tab-' + tab.toLowerCase() + '.png' });
      console.log('Saved tab screenshot:', tab);
    }
  }

  // Go back to Brand tab
  const brandBtn = await page.$('button:has-text("Brand")');
  if (brandBtn) {
    await brandBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'screenshots/04-brand-tab.png' });
    console.log('Saved 04-brand-tab.png');
  }

  await browser.close();
  console.log('Done');
})();
