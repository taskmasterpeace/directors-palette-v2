const { chromium } = require('playwright');

async function saveAuth() {
  // Connect to the existing browser
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();

  if (contexts.length > 0) {
    const context = contexts[0];

    // Save storage state (cookies + localStorage)
    await context.storageState({ path: 'playwright-auth.json' });
    console.log('Auth state saved to playwright-auth.json');

    // Also log current URL
    const pages = context.pages();
    if (pages.length > 0) {
      console.log('Current URL:', pages[0].url());
    }
  } else {
    console.log('No browser contexts found');
  }

  await browser.close();
}

saveAuth().catch(console.error);
