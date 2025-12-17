const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();

    if (contexts.length > 0) {
      const context = contexts[0];
      const pages = context.pages();

      if (pages.length > 0) {
        const page = pages[0];

        // Listen to console messages
        page.on('console', msg => {
          const type = msg.type();
          if (type === 'error' || type === 'warning' || msg.text().includes('gallery') || msg.text().includes('Gallery')) {
            console.log(`[${type.toUpperCase()}]`, msg.text());
          }
        });

        // Listen to network requests/responses
        page.on('response', async response => {
          const url = response.url();
          if (url.includes('supabase') || url.includes('gallery') || url.includes('api')) {
            const status = response.status();
            console.log(`[NETWORK] ${status} ${url.substring(0, 100)}`);
            if (status >= 400) {
              try {
                const body = await response.text();
                console.log(`[RESPONSE] ${body.substring(0, 500)}`);
              } catch {}
            }
          }
        });

        // Listen for request failures
        page.on('requestfailed', request => {
          console.log(`[FAILED] ${request.url()}: ${request.failure()?.errorText}`);
        });

        console.log('Navigating to gallery...');

        // Click on Gallery in sidebar or navigate directly
        // First check current URL
        console.log('Current URL:', page.url());

        // Navigate to home page which should show the app
        if (!page.url().includes('directorspal.com')) {
          await page.goto('https://directorspal.com/');
          await page.waitForLoadState('networkidle');
        }

        // Wait a bit for any errors to appear
        console.log('Waiting for network activity...');
        await page.waitForTimeout(5000);

        // Check for any error elements on page
        const errors = await page.evaluate(() => {
          const errorEls = document.querySelectorAll('[class*="error"], [class*="Error"]');
          return Array.from(errorEls).map(el => el.textContent).slice(0, 5);
        });

        if (errors.length > 0) {
          console.log('\n=== Page Errors ===');
          errors.forEach(e => console.log(e));
        }

        console.log('\nDone monitoring. Press Ctrl+C to exit.');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
