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

        const logs = [];

        // Listen to console messages
        page.on('console', msg => {
          const type = msg.type();
          const text = msg.text();
          if (type === 'error' || type === 'warning' ||
              text.toLowerCase().includes('gallery') ||
              text.toLowerCase().includes('error') ||
              text.toLowerCase().includes('supabase') ||
              text.toLowerCase().includes('database') ||
              text.toLowerCase().includes('failed')) {
            const entry = `[${type.toUpperCase()}] ${text}`;
            logs.push(entry);
            console.log(entry);
          }
        });

        // Listen to network requests/responses
        page.on('response', async response => {
          const url = response.url();
          const status = response.status();

          // Log all Supabase and API requests
          if (url.includes('supabase') || url.includes('/api/')) {
            const entry = `[NETWORK] ${status} ${url.substring(0, 150)}`;
            logs.push(entry);
            console.log(entry);

            if (status >= 400) {
              try {
                const body = await response.text();
                const bodyEntry = `[RESPONSE BODY] ${body.substring(0, 500)}`;
                logs.push(bodyEntry);
                console.log(bodyEntry);
              } catch {}
            }
          }
        });

        // Listen for request failures
        page.on('requestfailed', request => {
          const entry = `[FAILED] ${request.url()}: ${request.failure()?.errorText}`;
          logs.push(entry);
          console.log(entry);
        });

        console.log('Current URL:', page.url());

        // Make sure we're on the main app
        if (!page.url().includes('directorspal.com') || page.url().includes('signin')) {
          console.log('Navigating to main app...');
          await page.goto('https://directorspal.com/');
          await page.waitForLoadState('networkidle');
        }

        // Wait for page to settle
        await page.waitForTimeout(2000);

        console.log('\n=== Looking for Gallery tab... ===\n');

        // Find and click Gallery tab in sidebar
        // Look for any button/link that contains "Gallery" or has a gallery icon
        const galleryButton = await page.$('button:has-text("Gallery"), [aria-label*="Gallery"], [data-tab="gallery"]');

        if (galleryButton) {
          console.log('Found Gallery button, clicking...');
          await galleryButton.click();
        } else {
          // Try looking for sidebar items
          console.log('Looking for sidebar navigation...');

          // The sidebar might use different selectors
          const sidebarItems = await page.$$('nav button, aside button, [role="tablist"] button');
          console.log(`Found ${sidebarItems.length} sidebar items`);

          for (const item of sidebarItems) {
            const text = await item.textContent();
            const label = await item.getAttribute('aria-label');
            console.log(`  - Button: "${text}" label: "${label}"`);
            if (text?.toLowerCase().includes('gallery') || label?.toLowerCase().includes('gallery')) {
              console.log('Found gallery item, clicking...');
              await item.click();
              break;
            }
          }
        }

        console.log('\n=== Waiting for gallery to load... ===\n');
        await page.waitForTimeout(5000);

        // Print all captured logs
        console.log('\n=== All Captured Logs ===');
        logs.forEach(l => console.log(l));

        // Check for any error elements on page
        const pageInfo = await page.evaluate(() => {
          const errorEls = document.querySelectorAll('[class*="error"], [class*="Error"]');
          const errors = Array.from(errorEls).map(el => el.textContent?.substring(0, 200)).slice(0, 5);

          // Try to find gallery content
          const galleryContainer = document.querySelector('[class*="gallery"]');
          const imageCount = document.querySelectorAll('img[src*="supabase"], img[src*="replicate"]').length;

          return {
            errors,
            hasGallery: !!galleryContainer,
            imageCount,
            bodyText: document.body.textContent?.substring(0, 500)
          };
        });

        console.log('\n=== Page State ===');
        console.log('Has Gallery Container:', pageInfo.hasGallery);
        console.log('Image Count:', pageInfo.imageCount);
        if (pageInfo.errors.length > 0) {
          console.log('Error Elements:', pageInfo.errors);
        }

        console.log('\n=== Done ===');
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
})();
