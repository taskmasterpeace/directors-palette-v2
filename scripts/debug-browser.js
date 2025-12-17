const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--remote-debugging-port=9222']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://directors-palette.vercel.app');

  console.log('Browser launched. Log in, then press Enter in the terminal to save auth...');

  // Wait for user input
  process.stdin.resume();
  process.stdin.once('data', async () => {
    // Save auth state
    await context.storageState({ path: 'playwright-auth.json' });
    console.log('Auth saved to playwright-auth.json');

    // Get current cookies
    const cookies = await context.cookies();
    console.log('Cookies:', JSON.stringify(cookies, null, 2));

    // Keep browser open for debugging
    console.log('Browser staying open. Press Ctrl+C to close.');
  });
})();
