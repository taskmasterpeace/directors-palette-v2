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
          const text = msg.text();
          if (type === 'error' || type === 'warning' ||
              text.toLowerCase().includes('gallery') ||
              text.toLowerCase().includes('error') ||
              text.toLowerCase().includes('supabase') ||
              text.toLowerCase().includes('database')) {
            console.log(`[${type.toUpperCase()}]`, text);
          }
        });

        // Listen to network requests/responses
        page.on('response', async response => {
          const url = response.url();
          const status = response.status();

          // Log all Supabase and API requests
          if (url.includes('supabase') || url.includes('/api/')) {
            console.log(`[NETWORK] ${status} ${url.substring(0, 120)}`);
            if (status >= 400) {
              try {
                const body = await response.text();
                console.log(`[RESPONSE BODY] ${body.substring(0, 500)}`);
              } catch {}
            }
          }
        });

        // Listen for request failures
        page.on('requestfailed', request => {
          console.log(`[FAILED] ${request.url()}: ${request.failure()?.errorText}`);
        });

        console.log('Current URL:', page.url());
        console.log('Navigating to Shot Creator...');

        // Navigate to Shot Creator where gallery loads
        await page.goto('https://directorspal.com/shot-creator');
        await page.waitForLoadState('networkidle');

        console.log('\n=== Page loaded, waiting for gallery requests... ===\n');

        // Wait for gallery to load
        await page.waitForTimeout(5000);

        // Check for any error elements on page
        const errors = await page.evaluate(() => {
          const errorEls = document.querySelectorAll('[class*="error"], [class*="Error"]');
          return Array.from(errorEls).map(el => el.textContent?.substring(0, 200)).slice(0, 5);
        });

        if (errors.length > 0) {
          console.log('\n=== Page Error Elements ===');
          errors.forEach(e => console.log(e));
        }

        // Check gallery state in React/Zustand
        const galleryState = await page.evaluate(() => {
          // Try to access any global state
          if (window.__ZUSTAND_DEVTOOLS_GLOBAL__) {
            return JSON.stringify(window.__ZUSTAND_DEVTOOLS_GLOBAL__, null, 2);
          }
          return null;
        });

        if (galleryState) {
          console.log('\n=== Gallery State ===');
          console.log(galleryState);
        }

        console.log('\n=== Done monitoring ===');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
