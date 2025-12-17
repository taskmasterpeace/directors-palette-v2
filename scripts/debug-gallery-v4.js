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

        // Listen to ALL console messages
        page.on('console', msg => {
          const type = msg.type();
          const text = msg.text();
          const entry = `[CONSOLE ${type.toUpperCase()}] ${text}`;
          if (type === 'error' || type === 'warn') {
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
            const entry = `[NETWORK ${status}] ${url}`;
            logs.push(entry);
            console.log(entry);

            if (status >= 400) {
              try {
                const body = await response.text();
                console.log(`[ERROR RESPONSE] ${body.substring(0, 1000)}`);
              } catch {}
            }
          }
        });

        console.log('Current URL:', page.url());
        console.log('Navigating to https://directorspal.com/ ...');

        // Force navigate to root
        await page.goto('https://directorspal.com/', { waitUntil: 'domcontentloaded' });
        console.log('Page loaded, waiting for network...');
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
          console.log('Network idle timeout - continuing anyway');
        });

        console.log('New URL:', page.url());

        // Wait for React to hydrate
        await page.waitForTimeout(3000);

        // Take a screenshot for debugging
        await page.screenshot({ path: 'debug-screenshot.png' });
        console.log('Screenshot saved to debug-screenshot.png');

        // Get page content summary
        const pageInfo = await page.evaluate(() => {
          return {
            title: document.title,
            bodyTextPreview: document.body.innerText.substring(0, 500),
            hasNav: !!document.querySelector('nav'),
            hasSidebar: !!document.querySelector('aside, [class*="sidebar"], [class*="Sidebar"]'),
            allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).slice(0, 20),
            url: window.location.href
          };
        });

        console.log('\n=== Page Info ===');
        console.log('Title:', pageInfo.title);
        console.log('URL:', pageInfo.url);
        console.log('Has Nav:', pageInfo.hasNav);
        console.log('Has Sidebar:', pageInfo.hasSidebar);
        console.log('Buttons found:', pageInfo.allButtons);
        console.log('\nBody preview:', pageInfo.bodyTextPreview.substring(0, 300));

        console.log('\n=== Captured Network/Console Logs ===');
        logs.forEach(l => console.log(l));

        console.log('\n=== Done ===');
      }
    }
  } catch (err) {
    console.error('Script Error:', err.message);
    console.error(err.stack);
  }
})();
