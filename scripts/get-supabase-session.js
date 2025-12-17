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
        console.log('Current URL:', page.url());

        // Get ALL localStorage
        const allStorage = await page.evaluate(() => {
          const data = {};
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            data[key] = window.localStorage.getItem(key);
          }
          return data;
        });

        console.log('\n=== ALL LocalStorage ===');
        console.log(JSON.stringify(allStorage, null, 2));

        // Get ALL sessionStorage
        const sessionStorage = await page.evaluate(() => {
          const data = {};
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            data[key] = window.sessionStorage.getItem(key);
          }
          return data;
        });

        console.log('\n=== ALL SessionStorage ===');
        console.log(JSON.stringify(sessionStorage, null, 2));

        // Check for Supabase client
        const supabaseCheck = await page.evaluate(() => {
          // Check if there's a supabase auth session
          const keys = Object.keys(localStorage).filter(k =>
            k.includes('supabase') || k.includes('sb-')
          );
          return keys;
        });

        console.log('\n=== Supabase Keys ===');
        console.log(supabaseCheck);

        // Try to get cookies directly from document
        const docCookies = await page.evaluate(() => document.cookie);
        console.log('\n=== Document Cookies ===');
        console.log(docCookies || '(none)');

        // Get all cookies from context
        const allCookies = await context.cookies();
        console.log('\n=== All Context Cookies ===');
        console.log(JSON.stringify(allCookies, null, 2));
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
