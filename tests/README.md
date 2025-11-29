# Gallery Folder System - E2E Tests

Comprehensive end-to-end tests for the gallery folder organization system using Playwright.

## Test Coverage

### 1. Folder Creation Tests
- ✅ Create folder with name and color
- ✅ Validate minimum/maximum name length
- ✅ Reject reserved folder names
- ✅ Reject duplicate folder names
- ✅ Create folder without color

### 2. Folder Navigation Tests (Desktop)
- ✅ Show all images
- ✅ Show uncategorized images
- ✅ Filter by user folder
- ✅ Reset pagination when switching folders
- ✅ Update image counts correctly

### 3. Folder Navigation Tests (Mobile)
- ✅ Open hamburger menu
- ✅ Select folder from mobile menu
- ✅ Verify menu closes after selection
- ✅ Display correct images after selection

### 4. Move Images to Folder Tests
- ✅ Move single image via action menu
- ✅ Move multiple images via bulk selection
- ✅ Verify image appears in correct folder
- ✅ Move image back to uncategorized

### 5. Folder Rename Tests
- ✅ Rename folder
- ✅ Preserve images when renaming
- ✅ Reject empty name
- ✅ Reject duplicate name

### 6. Folder Delete Tests
- ✅ Show delete confirmation
- ✅ Delete folder and remove from sidebar
- ✅ Move images to uncategorized
- ✅ Cancel delete operation

### 7. Folder Color Tests
- ✅ Create with color badge
- ✅ Change folder color
- ✅ Remove folder color

### 8. Responsive Design Tests
- ✅ Show sidebar on desktop
- ✅ Hide sidebar on mobile
- ✅ Show hamburger menu on mobile
- ✅ Collapse/expand sidebar

### 9. Empty States Tests
- ✅ Show empty folder message
- ✅ Show create folder prompt

### 10. Integration Tests
- ✅ Complete folder workflow
- ✅ Maintain state across navigation

## Installation

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test tests/gallery-folders.spec.ts

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test by name
npx playwright test -g "should create a new folder"

# Run tests on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run mobile tests only
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## Debugging Tests

```bash
# Debug mode (step through tests)
npx playwright test --debug

# Debug specific test
npx playwright test tests/gallery-folders.spec.ts --debug

# Generate code for new tests
npx playwright codegen http://localhost:3000/gallery
```

## Viewing Test Results

```bash
# Show HTML report
npx playwright show-report

# The report includes:
# - Test results
# - Screenshots on failure
# - Videos on failure
# - Traces for debugging
```

## Test Configuration

The test suite is configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Retries**: 2 on CI, 0 locally
- **Parallel**: Yes
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## Best Practices

### 1. Use Page Object Pattern
The tests use a `GalleryFolderPage` class to encapsulate page interactions:

```typescript
const galleryPage = new GalleryFolderPage(page)
await galleryPage.clickNewFolder()
await galleryPage.fillFolderName('Test Folder')
```

### 2. Wait for State Changes
Always wait for visual feedback:

```typescript
await galleryPage.clickCreateFolder()
await expect(page.locator('text=Folder created successfully')).toBeVisible()
```

### 3. Clean Up After Tests
The `afterEach` hook cleans up test folders automatically.

### 4. Use Semantic Selectors
Prefer role-based selectors over CSS:

```typescript
// Good
await page.getByRole('button', { name: 'New Folder' }).click()

// Avoid
await page.locator('.new-folder-btn').click()
```

### 5. Test Mobile and Desktop
Use viewport configurations:

```typescript
test.use({ viewport: { width: 1280, height: 720 } }) // Desktop
test.use({ viewport: { width: 375, height: 667 } })  // Mobile
```

## Adding Test IDs to Components

For more stable tests, add `data-testid` attributes to components:

```tsx
// FolderSidebar.tsx
<div data-testid="folder-sidebar" className="...">
  {/* ... */}
</div>

// ImageCard.tsx
<div data-testid="image-card" className="...">
  {/* ... */}
</div>
```

Then in tests:

```typescript
const sidebar = page.getByTestId('folder-sidebar')
const images = page.getByTestId('image-card')
```

## Authentication Setup

If your app requires authentication, update the `beforeEach` hook:

```typescript
test.beforeEach(async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')
  await page.waitForURL('/gallery')

  // Or use stored auth state
  // await page.context().addCookies(authCookies)
})
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Add explicit waits: `await page.waitForLoadState('networkidle')`

### Element Not Found
- Check if element is in viewport
- Wait for element: `await page.waitForSelector('[data-testid="element"]')`
- Use `page.locator().or()` for fallback selectors

### Authentication Issues
- Store auth state and reuse: `await context.storageState({ path: 'auth.json' })`
- Use API to create test data instead of UI

### Flaky Tests
- Add explicit waits
- Use `toBeVisible()` instead of `toBeTruthy()`
- Avoid hard-coded timeouts
- Enable retries in config

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)
- [Debugging](https://playwright.dev/docs/debug)
