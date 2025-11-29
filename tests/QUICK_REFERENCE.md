# Gallery Folder Tests - Quick Reference Card

## 🚀 Getting Started

```bash
# First time setup
npx playwright install

# Run all tests
npm test

# Run with UI (recommended for development)
npm run test:ui
```

## 📝 Common Commands

```bash
# Run all folder tests
npm run test:folders

# Run specific test
npx playwright test -g "should create a new folder"

# Run in headed mode (see browser)
npm run test:headed

# Debug mode
npm run test:debug

# View HTML report
npm run test:report

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project="Mobile Chrome"
```

## 🔍 Test Categories

| Category | Tests | Command |
|----------|-------|---------|
| **Folder Creation** | 6 | `npx playwright test -g "Folder Creation"` |
| **Desktop Navigation** | 5 | `npx playwright test -g "Folder Navigation - Desktop"` |
| **Mobile Navigation** | 3 | `npx playwright test -g "Folder Navigation - Mobile"` |
| **Move Images** | 4 | `npx playwright test -g "Move Images to Folder"` |
| **Folder Rename** | 4 | `npx playwright test -g "Folder Rename"` |
| **Folder Delete** | 4 | `npx playwright test -g "Folder Delete"` |
| **Folder Color** | 3 | `npx playwright test -g "Folder Color"` |
| **Responsive Design** | 3 | `npx playwright test -g "Responsive Design"` |
| **Empty States** | 2 | `npx playwright test -g "Empty States"` |
| **Integration** | 2 | `npx playwright test -g "Integration Tests"` |

## 📊 Test Coverage

```
✅ 40+ Tests Total
✅ 972 Lines of Test Code
✅ Page Object Pattern
✅ Multi-browser Testing
✅ Mobile + Desktop
✅ Auto Cleanup
```

## 🎯 What Gets Tested

### ✅ Folder Operations
- Create with name/color
- Rename folder
- Delete folder
- Change color
- Validation (min/max length, reserved names, duplicates)

### ✅ Navigation
- Desktop sidebar
- Mobile hamburger menu
- All Images filter
- Uncategorized filter
- User folder filtering
- Pagination reset

### ✅ Image Management
- Move single image
- Move multiple images (bulk)
- Image count updates
- Images in correct folder
- Move to uncategorized

### ✅ Responsive Design
- Desktop sidebar visible
- Mobile sidebar hidden
- Hamburger menu on mobile
- Collapse/expand sidebar

### ✅ Edge Cases
- Empty folder state
- No folders state
- Validation errors
- Confirmation dialogs

## 🛠️ Debugging Tips

### Quick Debug Flow
1. Run in UI mode: `npm run test:ui`
2. Click failing test
3. Step through execution
4. Inspect elements
5. Fix issue
6. Re-run test

### Common Issues

**Element not found?**
```bash
# Run in headed mode to see what's happening
npm run test:headed
```

**Test timeout?**
```bash
# Check if waiting for network
# Add explicit waits in test
```

**Flaky test?**
```bash
# Enable retries in playwright.config.ts
retries: 2
```

## 📁 File Structure

```
tests/
├── gallery-folders.spec.ts    # Main test suite (972 lines)
├── helpers/
│   └── test-data.ts           # Test data utilities
├── README.md                  # Full documentation
├── TESTING_GUIDE.md           # Step-by-step guide
├── TEST_SUMMARY.md            # Comprehensive summary
└── QUICK_REFERENCE.md         # This file
```

## 🎨 Test Data Constants

```typescript
// Folder Names
TEST_FOLDER_NAME = 'Test Folder'
UPDATED_FOLDER_NAME = 'Updated Test Folder'

// Colors
TEST_FOLDER_COLOR = '#EF4444'    // Red
UPDATED_FOLDER_COLOR = '#10B981' // Green

// Validation
MAX_NAME_LENGTH = 50
MIN_NAME_LENGTH = 1
MAX_FOLDERS_PER_USER = 100
RESERVED_NAMES = ['All', 'Uncategorized', 'All Images']
```

## 📱 Viewports

```typescript
// Desktop
{ width: 1280, height: 720 }

// Mobile
{ width: 375, height: 667 }
```

## ✨ Page Object Methods

```typescript
const galleryPage = new GalleryFolderPage(page)

// Folder Operations
await galleryPage.clickNewFolder()
await galleryPage.fillFolderName('Test')
await galleryPage.selectFolderColor('#EF4444')
await galleryPage.clickCreateFolder()

// Navigation
await galleryPage.clickAllImages()
await galleryPage.clickUncategorized()
await galleryPage.clickFolder('Test Folder')

// Mobile
await galleryPage.openMobileMenu()
await galleryPage.selectFolderFromMobileMenu('Test')

// Image Operations
await galleryPage.openImageActionMenu(0)
await galleryPage.moveImageToFolder('Test Folder')
await galleryPage.selectAllImages()

// Utilities
await galleryPage.getFolderCount('Test Folder')
await galleryPage.isFolderActive('Test Folder')
await galleryPage.getImageCount()
```

## 🎬 Example Test

```typescript
test('should create a new folder', async ({ page }) => {
  const galleryPage = new GalleryFolderPage(page)

  // Create folder
  await galleryPage.clickNewFolder()
  await galleryPage.fillFolderName('My Folder')
  await galleryPage.selectFolderColor('#EF4444')
  await galleryPage.clickCreateFolder()

  // Verify
  await expect(page.locator('text=Folder created successfully')).toBeVisible()
  await expect(page.getByRole('button', { name: /My Folder/ })).toBeVisible()

  // Check count
  const count = await galleryPage.getFolderCount('My Folder')
  expect(count).toBe(0)
})
```

## 🚨 Pre-Push Checklist

```bash
# Before pushing code, run:
npm test                # All tests pass?
npm run lint            # No lint errors?
npm run build           # Build succeeds?
```

## 📚 Resources

| Resource | Link |
|----------|------|
| **Full Docs** | `tests/README.md` |
| **Guide** | `tests/TESTING_GUIDE.md` |
| **Summary** | `tests/TEST_SUMMARY.md` |
| **Playwright Docs** | https://playwright.dev/ |
| **Best Practices** | https://playwright.dev/docs/best-practices |

## ⚡ Pro Tips

1. **Always use UI mode** during development: `npm run test:ui`
2. **Use descriptive test names** - they're self-documenting
3. **Wait for visual feedback** - don't assume operations complete
4. **Test both success and error paths**
5. **Clean up test data** in `afterEach`
6. **Use Page Object Pattern** for reusability
7. **Run tests before committing** code

## 🎯 Coverage Summary

```
Total Tests:     40+
Desktop Tests:   25+
Mobile Tests:    10+
Integration:     5+
Validation:      10+

Browsers:        Chromium, Firefox, WebKit
Mobile Devices:  Pixel 5, iPhone 12
```

## 🔄 CI/CD Integration

Tests are ready for CI/CD:
- Auto-retry on failure (2x)
- Screenshot/video on failure
- JUnit XML reports
- HTML reports with artifacts

## 💡 Need Help?

1. Check `tests/README.md` for detailed docs
2. Check `tests/TESTING_GUIDE.md` for step-by-step help
3. Run `npm run test:ui` to debug visually
4. Check Playwright docs: https://playwright.dev/

---

**Happy Testing! 🎉**
