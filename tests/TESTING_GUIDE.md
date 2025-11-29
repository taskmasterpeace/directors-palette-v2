# Gallery Folder System - Testing Guide

## Quick Start

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all tests
npm test

# Run tests with UI (recommended for development)
npm run test:ui

# Run tests in headed mode (see browser)
npm run test:headed

# Debug a specific test
npm run test:debug
```

## Test Structure

The test suite is organized into 10 main test groups:

1. **Folder Creation** - Creating folders with validation
2. **Folder Navigation (Desktop)** - Desktop sidebar interactions
3. **Folder Navigation (Mobile)** - Mobile menu interactions
4. **Move Images to Folder** - Single and bulk image moves
5. **Folder Rename** - Renaming folders with validation
6. **Folder Delete** - Deleting folders and image cleanup
7. **Folder Color** - Color badge functionality
8. **Responsive Design** - Desktop/mobile layouts
9. **Empty States** - Empty folder and no folder states
10. **Integration Tests** - Complete workflows

## Common Test Scenarios

### Scenario 1: Test Folder Creation Flow

```bash
# Run only folder creation tests
npx playwright test -g "Folder Creation"

# Or run a specific test
npx playwright test -g "should create a new folder with name and color"
```

**What it tests:**
- Creating a folder with a name and color
- Folder appears in sidebar
- Count shows 0 images
- Color badge displays correctly

### Scenario 2: Test Move Images to Folder

```bash
npx playwright test -g "Move Images to Folder"
```

**What it tests:**
- Single image move via action menu
- Bulk image move via selection
- Image count updates
- Images appear in correct folder

### Scenario 3: Test Mobile Responsiveness

```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

**What it tests:**
- Hamburger menu appears on mobile
- Sidebar hidden on mobile
- Folder selection from mobile menu
- Menu closes after selection

### Scenario 4: Test Complete Workflow

```bash
npx playwright test -g "should handle complete folder workflow"
```

**What it tests:**
- Create folder
- Move image to folder
- Rename folder
- Verify image still there
- Delete folder
- Verify image moved to uncategorized

## Debugging Failed Tests

### 1. Use UI Mode (Best Option)

```bash
npm run test:ui
```

Benefits:
- Step through test execution
- See what the browser is doing
- Pause and inspect elements
- Time-travel debugging

### 2. Run in Headed Mode

```bash
npm run test:headed
```

See the browser while tests run.

### 3. Use Debug Mode

```bash
npm run test:debug
```

Opens Playwright Inspector for step-by-step debugging.

### 4. View Screenshots and Videos

After a test fails:

```bash
# View HTML report with screenshots/videos
npm run test:report
```

## Adding New Tests

### Template for New Test

```typescript
test('should do something specific', async ({ page }) => {
  const galleryPage = new GalleryFolderPage(page)

  // Arrange - Set up test conditions
  await galleryPage.clickNewFolder()
  await galleryPage.fillFolderName('Test Folder')

  // Act - Perform the action
  await galleryPage.clickCreateFolder()

  // Assert - Verify the result
  await expect(page.locator('text=Folder created successfully')).toBeVisible()
  await expect(page.getByRole('button', { name: /Test Folder/ })).toBeVisible()
})
```

### Page Object Pattern

Use the `GalleryFolderPage` helper class for cleaner tests:

```typescript
// Good - Using page object
const galleryPage = new GalleryFolderPage(page)
await galleryPage.clickNewFolder()
await galleryPage.fillFolderName('Test')
await galleryPage.selectFolderColor('#EF4444')
await galleryPage.clickCreateFolder()

// Avoid - Direct page interactions
await page.getByRole('button', { name: 'New Folder' }).click()
await page.getByLabel('Folder Name *').fill('Test')
await page.locator('button[style*="background-color: #EF4444"]').click()
await page.getByRole('button', { name: 'Create Folder' }).click()
```

## Best Practices

### 1. Always Wait for Visual Feedback

```typescript
// Good
await galleryPage.clickCreateFolder()
await expect(page.locator('text=Folder created successfully')).toBeVisible()

// Bad - No verification
await galleryPage.clickCreateFolder()
```

### 2. Use Semantic Selectors

```typescript
// Good
await page.getByRole('button', { name: 'New Folder' }).click()
await page.getByLabel('Folder Name').fill('Test')

// Avoid
await page.locator('.new-folder-btn').click()
await page.locator('#folder-name-input').fill('Test')
```

### 3. Test Both Happy and Error Paths

```typescript
// Happy path
test('should create folder successfully', async ({ page }) => {
  // ... success case
})

// Error path
test('should reject duplicate folder name', async ({ page }) => {
  // ... error case
})
```

### 4. Clean Up Test Data

```typescript
test.afterEach(async ({ page }) => {
  // Clean up test folders
  // The suite already has cleanup logic
})
```

### 5. Use Descriptive Test Names

```typescript
// Good
test('should create a new folder with name and color', ...)

// Bad
test('test folder creation', ...)
```

## Troubleshooting

### Problem: Tests are flaky (pass/fail randomly)

**Solutions:**
1. Add explicit waits for state changes
2. Use `toBeVisible()` instead of checking existence
3. Enable retries in `playwright.config.ts`
4. Avoid hard-coded `setTimeout`

```typescript
// Good
await expect(page.locator('text=Success')).toBeVisible()

// Bad
await page.waitForTimeout(1000) // Hard-coded wait
```

### Problem: Element not found

**Solutions:**
1. Verify element is in viewport
2. Check if element is behind a modal
3. Use `.or()` for fallback selectors
4. Add explicit waits

```typescript
// Fallback selector
const images = page.locator('[data-testid="image-card"]').or(
  page.locator('[class*="grid"] > div')
)
```

### Problem: Tests timeout

**Solutions:**
1. Increase timeout in config
2. Add `networkidle` wait
3. Check if API calls are slow

```typescript
// Wait for network to settle
await page.waitForLoadState('networkidle')
```

### Problem: Authentication issues

**Solutions:**
1. Set up proper auth in `beforeEach`
2. Store auth state and reuse
3. Use API to create test data

```typescript
test.beforeEach(async ({ page }) => {
  // Option 1: Login via UI
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')

  // Option 2: Use stored auth
  await page.context().storageState({ path: 'auth.json' })
})
```

## CI/CD Integration

### Running Tests in CI

Tests are configured to run in CI environments:

- **Retries**: 2 retries on failure
- **Workers**: 1 worker (no parallel tests)
- **Screenshots**: Captured on failure
- **Videos**: Recorded on failure
- **Traces**: Available for debugging

### GitHub Actions Example

Add to `.github/workflows/test.yml`:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Tips

### 1. Run Tests in Parallel

Tests run in parallel by default. Adjust in `playwright.config.ts`:

```typescript
workers: process.env.CI ? 1 : 4 // 4 workers locally
```

### 2. Use Fast Selectors

```typescript
// Fast
await page.getByTestId('folder-sidebar')

// Slower
await page.locator('.sidebar-component')
```

### 3. Reuse Auth State

```typescript
// Setup auth once
test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await page.goto('/login')
  // ... login
  await page.context().storageState({ path: 'auth.json' })
})

// Use in all tests
test.use({ storageState: 'auth.json' })
```

## Test Data Management

### Creating Test Folders

The test suite automatically creates and cleans up test folders:

```typescript
const TEST_FOLDER_NAME = 'Test Folder'
const TEST_FOLDER_COLOR = '#EF4444'
```

### Cleaning Up

The `afterEach` hook handles cleanup:

```typescript
test.afterEach(async ({ page }) => {
  // Automatically deletes test folders
})
```

## Advanced Topics

### Custom Assertions

```typescript
// Custom assertion for folder count
async function expectFolderCount(page: Page, folderName: string, count: number) {
  const galleryPage = new GalleryFolderPage(page)
  const actual = await galleryPage.getFolderCount(folderName)
  expect(actual).toBe(count)
}
```

### API Testing

Combine UI tests with API tests:

```typescript
test('should create folder via UI and verify via API', async ({ page, request }) => {
  // Create via UI
  const galleryPage = new GalleryFolderPage(page)
  await galleryPage.clickNewFolder()
  await galleryPage.fillFolderName('Test Folder')
  await galleryPage.clickCreateFolder()

  // Verify via API
  const response = await request.get('/api/folders')
  const folders = await response.json()
  expect(folders.some(f => f.name === 'Test Folder')).toBe(true)
})
```

### Visual Regression Testing

```typescript
test('should match folder sidebar screenshot', async ({ page }) => {
  const galleryPage = new GalleryFolderPage(page)
  await galleryPage.goto()

  await expect(page.locator('[data-testid="folder-sidebar"]')).toHaveScreenshot()
})
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI Integration](https://playwright.dev/docs/ci)
