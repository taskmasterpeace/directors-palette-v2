# Bulk Download Feature - Usage Guide

This document explains how to use the newly implemented bulk download features.

## Overview

Three components have been created to support metadata display and bulk download functionality:

1. **MetadataBar** - Displays aspect ratio and resolution on image cards
2. **BulkDownloadService** - Service for downloading multiple images as a ZIP file
3. **BulkDownloadModal** - Modal UI for showing download progress

## Component Locations

```
src/features/shot-creator/
├── components/unified-gallery/
│   ├── MetadataBar.tsx              (NEW)
│   ├── BulkDownloadModal.tsx        (NEW)
│   └── ImageCard.tsx                (UPDATED)
└── services/
    └── bulk-download.service.ts     (NEW)
```

## 1. MetadataBar Component

### Already Integrated

The MetadataBar is already integrated into the ImageCard component and will automatically display aspect ratio and resolution for all images in the gallery.

### What it displays:
- Format: `{aspectRatio} • {resolution}` (e.g., "16:9 • 1024x1024")
- Position: Bottom of image card
- Always visible (not hover-only)
- Dark gradient background similar to PromptTooltip

## 2. BulkDownloadService

### Usage Example

```typescript
import { BulkDownloadService, DownloadProgress } from '@/features/shot-creator/services/bulk-download.service'

// Example: Download selected images
const selectedImages = [
  { url: 'https://...', id: 'img_1' },
  { url: 'https://...', id: 'img_2' },
  // ... more images
]

// With progress tracking
await BulkDownloadService.downloadAsZip(
  selectedImages,
  'my-gallery-export.zip', // Optional custom name
  (progress: DownloadProgress) => {
    console.log(`Status: ${progress.status}`)
    console.log(`Progress: ${progress.current}/${progress.total}`)
  }
)
```

### API Reference

**Method:** `BulkDownloadService.downloadAsZip(images, zipName?, onProgress?)`

**Parameters:**
- `images`: Array of objects with `{ url: string, id: string }`
- `zipName` (optional): Custom ZIP filename. Default: `gallery-export-YYYY-MM-DD.zip`
- `onProgress` (optional): Callback function receiving `DownloadProgress` updates

**DownloadProgress Type:**
```typescript
interface DownloadProgress {
  current: number          // Current image being processed
  total: number           // Total number of images
  status: 'downloading' | 'zipping' | 'complete' | 'error'
  error?: string          // Error message if status is 'error'
}
```

### Features
- Graceful error handling (skips failed images, doesn't abort)
- Automatic filename extraction from URLs
- Fallback to sanitized image IDs
- DEFLATE compression (level 6)
- Automatic cleanup of temporary URLs

## 3. BulkDownloadModal Component

### Usage Example

```typescript
import { useState } from 'react'
import { BulkDownloadModal } from '@/features/shot-creator/components/unified-gallery/BulkDownloadModal'
import { BulkDownloadService, DownloadProgress } from '@/features/shot-creator/services/bulk-download.service'

function MyComponent() {
  const [downloadModal, setDownloadModal] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    current: 0,
    total: 0,
    status: 'downloading'
  })

  const handleBulkDownload = async (selectedImages) => {
    setDownloadModal(true)

    try {
      await BulkDownloadService.downloadAsZip(
        selectedImages,
        undefined, // Use default name
        (progress) => setDownloadProgress(progress)
      )
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <>
      <button onClick={() => handleBulkDownload(images)}>
        Download Selected
      </button>

      <BulkDownloadModal
        open={downloadModal}
        onOpenChange={setDownloadModal}
        imageCount={downloadProgress.total}
        current={downloadProgress.current}
        status={downloadProgress.status}
        error={downloadProgress.error}
      />
    </>
  )
}
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Controls modal visibility |
| `onOpenChange` | (open: boolean) => void | Callback when modal should open/close |
| `imageCount` | number | Total number of images to download |
| `current` | number | Current image being processed |
| `status` | string | Download status: 'downloading', 'zipping', 'complete', 'error' |
| `error` | string (optional) | Error message if status is 'error' |

### Features
- Animated progress bar
- Status-based icons (Download, Success, Error)
- Auto-closes 2 seconds after completion
- Prevents closing during active download
- Cancel button during download
- Error message display
- Responsive design

## Integration with Gallery

To add bulk download to the GalleryHeader component, follow this pattern:

### Step 1: Update GalleryHeader Props

```typescript
// In GalleryHeader.tsx
interface GalleryHeaderProps {
  // ... existing props
  onBulkDownload?: () => void  // Add this
}
```

### Step 2: Add Download Button

Add this button next to the existing bulk action buttons:

```typescript
{selectedCount > 0 && (
  <>
    {/* Existing buttons... */}

    {/* New download button */}
    <Button
      variant="outline"
      size="sm"
      onClick={onBulkDownload}
    >
      <Download className="w-4 h-4 mr-2" />
      Download
    </Button>
  </>
)}
```

### Step 3: Implement in UnifiedImageGallery

```typescript
// In UnifiedImageGallery.tsx
import { BulkDownloadModal } from './BulkDownloadModal'
import { BulkDownloadService, DownloadProgress } from '../../services/bulk-download.service'

function UnifiedImageGallery() {
  const [downloadModal, setDownloadModal] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    current: 0,
    total: 0,
    status: 'downloading'
  })

  const handleBulkDownload = async () => {
    if (selectedImages.length === 0) return

    // Get full image objects for selected IDs
    const imagesToDownload = images
      .filter(img => selectedImages.includes(img.url))
      .map(img => ({ url: img.url, id: img.id }))

    setDownloadModal(true)

    try {
      await BulkDownloadService.downloadAsZip(
        imagesToDownload,
        `gallery-export-${new Date().toISOString().split('T')[0]}.zip`,
        (progress) => setDownloadProgress(progress)
      )
    } catch (error) {
      console.error('Bulk download failed:', error)
    }
  }

  return (
    <>
      <GalleryHeader
        // ... existing props
        onBulkDownload={handleBulkDownload}
      />

      <BulkDownloadModal
        open={downloadModal}
        onOpenChange={setDownloadModal}
        imageCount={downloadProgress.total}
        current={downloadProgress.current}
        status={downloadProgress.status}
        error={downloadProgress.error}
      />
    </>
  )
}
```

## Dependencies

The `jszip` package has been added to `package.json`:

```json
{
  "dependencies": {
    "jszip": "^3.10.1"
  }
}
```

Run `npm install` to install the dependency if not already installed.

## Testing

To test the bulk download feature:

1. Navigate to the Unified Gallery
2. Select multiple images using the checkboxes
3. Click the "Download" button (once integrated)
4. Observe the download progress modal
5. ZIP file should download automatically
6. Modal should close after success

## Error Handling

The service handles errors gracefully:
- Failed image downloads are logged and skipped
- Download continues with remaining images
- Error status is shown in modal
- User can cancel at any time

## Browser Compatibility

The bulk download feature uses:
- Fetch API (supported in all modern browsers)
- Blob URLs (supported in all modern browsers)
- Download attribute on anchor tags (supported in all modern browsers)

No polyfills should be required for modern browsers.
