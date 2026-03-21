/**
 * Screenshot all pages — uses Edge browser + real login + sidebar navigation
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3002';
const DOCS_DIR = 'D:/git/directors-palette-v2/docs/screenshots';

async function main() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // Step 1: Sign in
  console.log('Navigating to sign in...');
  await page.goto(BASE_URL + '/auth/signin', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const emailInput = await page.$('#email');
  if (emailInput) {
    await saveScreenshot(page, 'auth-signin', 'Sign In', '/auth/signin');
    await page.fill('#email', 'taskmasterpeace@gmail.com');
    await page.fill('#password', 'TA$K2004');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    console.log('Logged in, URL:', page.url());
  }

  // Step 2: Home page (Shot Creator — default tab)
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await saveScreenshot(page, 'home', 'Home — Shot Creator', '/');

  // Step 3: Navigate to each feature via sidebar clicks
  const sidebarPages = [
    { label: 'Canvas Editor', folder: 'canvas-editor' },
    { label: 'Shot Animator', folder: 'shot-animator' },
    { label: 'Node Workflow', folder: 'node-workflow' },
    { label: 'Figurine Studio', folder: 'figurine-studio' },
    { label: 'Merch Lab', folder: 'merch-lab' },
    { label: 'Storyboard', folder: 'storyboard' },
    { label: 'Storybook', folder: 'storybook' },
    { label: 'Brand Studio', folder: 'brand-studio' },
    { label: 'Community', folder: 'community' },
    { label: 'Help & Manual', folder: 'help' },
  ];

  for (const sp of sidebarPages) {
    console.log(`  Clicking sidebar: "${sp.label}"...`);
    try {
      // Click the sidebar item by its text
      const sidebarItem = page.locator(`text="${sp.label}"`).first();
      await sidebarItem.click({ timeout: 5000 });
      await page.waitForTimeout(3000);
      await saveScreenshot(page, sp.folder, sp.label, `sidebar:${sp.label}`);
    } catch (err) {
      console.log(`    ⚠️ Could not click "${sp.label}": ${err.message}`);
    }
  }

  // Step 4: URL-based routes (separate pages, not sidebar tabs)
  const urlPages = [
    { route: '/gallery', folder: 'gallery', name: 'Gallery' },
    { route: '/admin', folder: 'admin', name: 'Admin Dashboard' },
    { route: '/music-lab', folder: 'music-lab', name: 'Music Lab' },
    { route: '/music-lab/artist-dna', folder: 'artist-dna', name: 'Artist DNA' },
    { route: '/node-workflow', folder: 'node-workflow-page', name: 'Node Workflow (page)' },
  ];

  for (const p of urlPages) {
    console.log(`  Navigating to ${p.route}...`);
    await page.goto(BASE_URL + p.route, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await saveScreenshot(page, p.folder, p.name, p.route);
  }

  // Step 5: Public pages (no auth)
  console.log('\n--- Public Pages (no auth) ---');
  const pubContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const pubPage = await pubContext.newPage();

  await pubPage.goto(BASE_URL + '/landing', { waitUntil: 'networkidle', timeout: 30000 });
  await pubPage.waitForTimeout(3000);
  await saveScreenshot(pubPage, 'landing', 'Landing Page', '/landing');

  await pubPage.goto(BASE_URL + '/auth/signup', { waitUntil: 'networkidle', timeout: 30000 });
  await pubPage.waitForTimeout(3000);
  await saveScreenshot(pubPage, 'auth-signup', 'Sign Up', '/auth/signup');

  await pubContext.close();
  await context.close();
  await browser.close();

  console.log('\n✅ All screenshots saved to docs/screenshots/');
}

async function saveScreenshot(page, folder, name, route) {
  const dir = path.join(DOCS_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`  📸 ${name} (${route})...`);

  await page.screenshot({ path: path.join(dir, 'viewport.png') });
  await page.screenshot({ path: path.join(dir, 'full-page.png'), fullPage: true });

  const title = await page.title();
  console.log(`    ✅ Done (title: ${title})`);
}

main().catch(console.error);
