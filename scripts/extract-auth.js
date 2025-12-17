const { chromium } = require('playwright');

(async () => {
  try {
    // Connect to the browser via CDP
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('Connected to browser');

    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} contexts`);

    if (contexts.length > 0) {
      const context = contexts[0];
      const pages = context.pages();

      console.log(`Found ${pages.length} pages`);

      if (pages.length > 0) {
        const page = pages[0];
        console.log('Current URL:', page.url());

        // Save storage state
        await context.storageState({ path: 'playwright-auth.json' });
        console.log('Auth saved to playwright-auth.json');

        // Get localStorage data
        const localStorage = await page.evaluate(() => {
          const data = {};
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            data[key] = window.localStorage.getItem(key);
          }
          return data;
        });

        console.log('\n=== LocalStorage Keys ===');
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase')) {
            console.log(`${key}: ${localStorage[key].substring(0, 100)}...`);
          }
        });

        // Get cookies
        const cookies = await context.cookies();
        console.log('\n=== Cookies ===');
        cookies.forEach(c => console.log(`${c.name}: ${c.value.substring(0, 50)}...`));
      }
    }

    // Don't close - leave browser open
    console.log('\nDone! Auth extracted.');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
