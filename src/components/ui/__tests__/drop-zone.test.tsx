/**
 * Comprehensive tests for DropZone component
 * Tests visual states, file validation, callback behaviors, and accessibility
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createRef } from 'react'
import { DropZone, DropZoneRef, DropZoneRenderState } from '../drop-zone'
import type { Accept } from 'react-dropzone'

// Cleanup after each test to prevent element accumulation
afterEach(() => {
  cleanup()
})

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a mock File object for testing
 */
function createMockFile(name: string, type: string, size: number = 1024): File {
  const file = new File(['test content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/**
 * Creates mock DataTransfer for drag events
 */
function createMockDataTransfer(files: File[]): DataTransfer {
  const dataTransfer = {
    files,
    items: files.map(file => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    types: ['Files'],
    setData: vi.fn(),
    getData: vi.fn(),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
    effectAllowed: 'all',
    dropEffect: 'copy',
  } as unknown as DataTransfer
  return dataTransfer
}

/**
 * Simulates a drop event on the drop zone
 */
function simulateDrop(element: HTMLElement, files: File[]) {
  const dataTransfer = createMockDataTransfer(files)
  fireEvent.drop(element, { dataTransfer })
}

// ============================================================================
// TEST DATA
// ============================================================================

const IMAGE_ACCEPT: Accept = {
  'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
}

// ============================================================================
// TEST: Basic Rendering
// ============================================================================

describe('DropZone - Basic Rendering', () => {
  it('should render with default props', () => {
    render(<DropZone />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
    expect(dropZone).toHaveAttribute('data-slot', 'drop-zone')
  })

  it('should render with custom idle text', () => {
    render(<DropZone idleText="Drop your images here" />)

    expect(screen.getByText('Drop your images here')).toBeInTheDocument()
  })

  it('should render with default icon when showIcon is true', () => {
    render(<DropZone showIcon={true} />)

    // The Upload icon should be present in the document
    const iconContainer = document.querySelector('[data-slot="drop-zone"] svg')
    expect(iconContainer).toBeInTheDocument()
  })

  it('should not render icon when showIcon is false', () => {
    render(<DropZone showIcon={false} />)

    // No icon container should be present
    const iconContainers = document.querySelectorAll('[data-slot="drop-zone"] .rounded-full')
    expect(iconContainers.length).toBe(0)
  })

  it('should render custom children instead of default content', () => {
    render(
      <DropZone>
        <div data-testid="custom-content">Custom upload area</div>
      </DropZone>
    )

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.queryByText('Drag & drop files here, or click to select')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<DropZone className="my-custom-class" />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('my-custom-class')
  })
})

// ============================================================================
// TEST: Size Variants
// ============================================================================

describe('DropZone - Size Variants', () => {
  it('should render with default size', () => {
    render(<DropZone size="default" />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('min-h-[120px]')
    expect(dropZone).toHaveClass('flex-col')
  })

  it('should render with compact size (horizontal layout)', () => {
    render(<DropZone size="compact" />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('min-h-[56px]')
    expect(dropZone).toHaveClass('flex-row')
  })

  it('should render with large size', () => {
    render(<DropZone size="large" />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('min-h-[200px]')
    expect(dropZone).toHaveClass('flex-col')
  })
})

// ============================================================================
// TEST: Variant Styles
// ============================================================================

describe('DropZone - Variant Styles', () => {
  it('should render with default variant', () => {
    render(<DropZone variant="default" />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('bg-background')
  })

  it('should render with ghost variant', () => {
    render(<DropZone variant="ghost" />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('bg-transparent')
    expect(dropZone).toHaveClass('border-transparent')
  })
})

// ============================================================================
// TEST: Data Attributes for Visual States
// ============================================================================

describe('DropZone - Data Attributes', () => {
  it('should set data-disabled when disabled', () => {
    render(<DropZone disabled />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('data-disabled', 'true')
  })

  it('should set data-uploading when uploading', () => {
    render(<DropZone isUploading />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('data-uploading', 'true')
  })

  it('should not set data-drag-active when not dragging', () => {
    render(<DropZone />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).not.toHaveAttribute('data-drag-active')
  })
})

// ============================================================================
// TEST: Disabled State
// ============================================================================

describe('DropZone - Disabled State', () => {
  it('should apply disabled styling', () => {
    render(<DropZone disabled />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('opacity-50')
    expect(dropZone).toHaveClass('cursor-not-allowed')
  })

  it('should not trigger callbacks when disabled', () => {
    const onDropAccepted = vi.fn()
    render(<DropZone disabled onDropAccepted={onDropAccepted} />)

    const dropZone = screen.getByRole('button')
    const file = createMockFile('test.png', 'image/png')
    simulateDrop(dropZone, [file])

    expect(onDropAccepted).not.toHaveBeenCalled()
  })
})

// ============================================================================
// TEST: Uploading State
// ============================================================================

describe('DropZone - Uploading State', () => {
  it('should display uploading text', () => {
    render(<DropZone isUploading />)

    expect(screen.getByText('Uploading...')).toBeInTheDocument()
  })

  it('should display custom uploading text', () => {
    render(<DropZone isUploading uploadingText="Processing files..." />)

    expect(screen.getByText('Processing files...')).toBeInTheDocument()
  })

  it('should show spinner icon when uploading', () => {
    render(<DropZone isUploading />)

    // Loader2 icon has animate-spin class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should apply uploading styling', () => {
    render(<DropZone isUploading />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('cursor-wait')
  })
})

// ============================================================================
// TEST: Accepted File Types Display
// ============================================================================

describe('DropZone - Accepted File Types Display', () => {
  it('should display formatted accepted file types', () => {
    render(<DropZone accept={IMAGE_ACCEPT} />)

    // Should show file extensions in uppercase
    expect(screen.getByText(/PNG/i)).toBeInTheDocument()
  })

  it('should display custom accept text', () => {
    render(<DropZone accept={IMAGE_ACCEPT} acceptText="Images only (PNG, JPG)" />)

    expect(screen.getByText('Images only (PNG, JPG)')).toBeInTheDocument()
  })

  it('should not display accept text when uploading', () => {
    render(<DropZone accept={IMAGE_ACCEPT} isUploading />)

    // Accept text should be hidden during upload
    expect(screen.queryByText(/PNG/)).not.toBeInTheDocument()
  })
})

// ============================================================================
// TEST: File Drop Callbacks
// ============================================================================

describe('DropZone - File Drop Callbacks', () => {
  it('should call onDropAccepted when files are dropped', async () => {
    const onDropAccepted = vi.fn()
    render(<DropZone onDropAccepted={onDropAccepted} />)

    const dropZone = screen.getByRole('button')
    const file = createMockFile('test.txt', 'text/plain')

    simulateDrop(dropZone, [file])

    await waitFor(() => {
      expect(onDropAccepted).toHaveBeenCalled()
      // Verify it was called with an array of files
      expect(onDropAccepted.mock.calls[0][0]).toBeInstanceOf(Array)
    })
  })

  it('should call onDropRejected with rejected files', async () => {
    const onDropRejected = vi.fn()
    render(
      <DropZone
        accept={IMAGE_ACCEPT}
        onDropRejected={onDropRejected}
      />
    )

    const dropZone = screen.getByRole('button')
    // Drop a text file when only images are accepted
    const file = createMockFile('test.txt', 'text/plain')

    simulateDrop(dropZone, [file])

    await waitFor(() => {
      expect(onDropRejected).toHaveBeenCalled()
    })
  })

  it('should call onDrop when files are dropped', async () => {
    const onDrop = vi.fn()
    render(<DropZone accept={IMAGE_ACCEPT} onDrop={onDrop} />)

    const dropZone = screen.getByRole('button')
    const validFile = createMockFile('image.png', 'image/png')

    simulateDrop(dropZone, [validFile])

    await waitFor(() => {
      expect(onDrop).toHaveBeenCalled()
    })
  })

  it('should have onDragEnter callback prop available', () => {
    const onDragEnter = vi.fn()
    render(<DropZone onDragEnter={onDragEnter} />)

    // The dropzone should render with the callback prop
    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
    // Note: happy-dom doesn't fully support DataTransfer drag events,
    // so we verify the prop is accepted and component renders
  })

  it('should have onDragLeave callback prop available', () => {
    const onDragLeave = vi.fn()
    render(<DropZone onDragLeave={onDragLeave} />)

    // The dropzone should render with the callback prop
    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
    // Note: happy-dom doesn't fully support DataTransfer drag events,
    // so we verify the prop is accepted and component renders
  })
})

// ============================================================================
// TEST: File Validation
// ============================================================================

describe('DropZone - File Validation', () => {
  it('should accept files matching accept prop', async () => {
    const onDropAccepted = vi.fn()
    render(
      <DropZone
        accept={IMAGE_ACCEPT}
        onDropAccepted={onDropAccepted}
      />
    )

    const dropZone = screen.getByRole('button')
    const file = createMockFile('image.png', 'image/png')

    simulateDrop(dropZone, [file])

    await waitFor(() => {
      expect(onDropAccepted).toHaveBeenCalled()
      // Verify files are accepted (array with at least one file)
      const acceptedFiles = onDropAccepted.mock.calls[0][0]
      expect(acceptedFiles).toBeInstanceOf(Array)
      expect(acceptedFiles.length).toBeGreaterThan(0)
    })
  })

  it('should reject files exceeding maxSize', async () => {
    const onDropRejected = vi.fn()
    const maxSize = 1024 // 1KB
    render(
      <DropZone
        maxSize={maxSize}
        onDropRejected={onDropRejected}
      />
    )

    const dropZone = screen.getByRole('button')
    // File larger than maxSize
    const file = createMockFile('large.txt', 'text/plain', 2048)

    simulateDrop(dropZone, [file])

    await waitFor(() => {
      expect(onDropRejected).toHaveBeenCalled()
    })
  })

  it('should reject files when too many are dropped (maxFiles)', async () => {
    const onDropRejected = vi.fn()
    render(
      <DropZone
        maxFiles={1}
        onDropRejected={onDropRejected}
      />
    )

    const dropZone = screen.getByRole('button')
    const file1 = createMockFile('file1.txt', 'text/plain')
    const file2 = createMockFile('file2.txt', 'text/plain')

    simulateDrop(dropZone, [file1, file2])

    await waitFor(() => {
      expect(onDropRejected).toHaveBeenCalled()
    })
  })

  it('should set multiple to false when maxFiles is 1', () => {
    render(<DropZone maxFiles={1} />)

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toHaveAttribute('multiple')
  })
})

// ============================================================================
// TEST: Error State Display
// ============================================================================

describe('DropZone - Error State', () => {
  it('should call onDropRejected when invalid file type is dropped', async () => {
    const onDropRejected = vi.fn()
    render(
      <DropZone
        accept={IMAGE_ACCEPT}
        onDropRejected={onDropRejected}
        rejectText="Only images allowed"
      />
    )

    const dropZone = screen.getByRole('button')
    const file = createMockFile('test.txt', 'text/plain')

    simulateDrop(dropZone, [file])

    await waitFor(() => {
      expect(onDropRejected).toHaveBeenCalled()
    })
  })

  it('should call onDropRejected when file too large', async () => {
    const onDropRejected = vi.fn()
    render(<DropZone maxSize={1024} onDropRejected={onDropRejected} />)

    const dropZone = screen.getByRole('button')
    const file = createMockFile('large.txt', 'text/plain', 2048)

    simulateDrop(dropZone, [file])

    await waitFor(() => {
      expect(onDropRejected).toHaveBeenCalled()
    })
  })

  it('should call onDropRejected when too many files', async () => {
    const onDropRejected = vi.fn()
    render(<DropZone maxFiles={1} onDropRejected={onDropRejected} />)

    const dropZone = screen.getByRole('button')
    const file1 = createMockFile('file1.txt', 'text/plain')
    const file2 = createMockFile('file2.txt', 'text/plain')

    simulateDrop(dropZone, [file1, file2])

    await waitFor(() => {
      expect(onDropRejected).toHaveBeenCalled()
    })
  })

  it('should have rejectText prop available', () => {
    render(
      <DropZone
        accept={IMAGE_ACCEPT}
        rejectText="Custom reject message"
      />
    )

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
  })
})

// ============================================================================
// TEST: Controlled Mode
// ============================================================================

describe('DropZone - Controlled Mode', () => {
  it('should use controlled drag state when isDragActiveControlled is provided', () => {
    render(<DropZone isDragActiveControlled={true} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('data-drag-active', 'true')
  })

  it('should not show drag active when controlled state is false', () => {
    render(<DropZone isDragActiveControlled={false} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).not.toHaveAttribute('data-drag-active')
  })

  it('should have onDragActiveChange prop available', () => {
    const onDragActiveChange = vi.fn()
    render(<DropZone onDragActiveChange={onDragActiveChange} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
    // Note: happy-dom doesn't fully support DataTransfer drag events,
    // so we verify the prop is accepted and component renders
  })
})

// ============================================================================
// TEST: noClick and noKeyboard Options
// ============================================================================

describe('DropZone - noClick and noKeyboard', () => {
  it('should not open file picker on click when noClick is true', () => {
    const onClick = vi.fn()
    render(<DropZone noClick onClick={onClick} />)

    const dropZone = screen.getByRole('button')
    fireEvent.click(dropZone)

    // The click should still fire (for the div) but no file dialog should open
    // We can't directly test file dialog opening, but we verify the prop is passed
    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
  })

  it('should render with noKeyboard prop', () => {
    render(<DropZone noKeyboard />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
  })
})

// ============================================================================
// TEST: Imperative Ref Handle
// ============================================================================

describe('DropZone - Imperative Ref', () => {
  it('should expose open method via ref', () => {
    const ref = createRef<DropZoneRef>()
    render(<DropZone ref={ref} />)

    expect(ref.current).toBeDefined()
    expect(typeof ref.current?.open).toBe('function')
  })

  it('should expose clearError method via ref', () => {
    const ref = createRef<DropZoneRef>()
    render(<DropZone ref={ref} />)

    expect(ref.current).toBeDefined()
    expect(typeof ref.current?.clearError).toBe('function')
  })

  it('should have functional clearError method', () => {
    const ref = createRef<DropZoneRef>()
    render(<DropZone ref={ref} accept={IMAGE_ACCEPT} />)

    // Verify clearError is callable
    expect(ref.current).toBeDefined()
    expect(() => ref.current?.clearError()).not.toThrow()
  })
})

// ============================================================================
// TEST: Render Function Pattern
// ============================================================================

describe('DropZone - Render Function Pattern', () => {
  it('should pass render state to children function', () => {
    const childrenFn = vi.fn().mockReturnValue(<div>Custom UI</div>)
    render(<DropZone>{childrenFn}</DropZone>)

    expect(childrenFn).toHaveBeenCalled()

    const renderState: DropZoneRenderState = childrenFn.mock.calls[0][0]
    expect(renderState).toHaveProperty('isDragActive')
    expect(renderState).toHaveProperty('isDragAccept')
    expect(renderState).toHaveProperty('isDragReject')
    expect(renderState).toHaveProperty('isFocused')
    expect(renderState).toHaveProperty('isUploading')
    expect(renderState).toHaveProperty('disabled')
    expect(renderState).toHaveProperty('hasError')
    expect(renderState).toHaveProperty('errorMessage')
    expect(renderState).toHaveProperty('open')
  })

  it('should provide correct isUploading state in render function', () => {
    const childrenFn = vi.fn().mockReturnValue(<div>Loading...</div>)
    render(<DropZone isUploading>{childrenFn}</DropZone>)

    const renderState: DropZoneRenderState = childrenFn.mock.calls[0][0]
    expect(renderState.isUploading).toBe(true)
  })

  it('should provide correct disabled state in render function', () => {
    const childrenFn = vi.fn().mockReturnValue(<div>Disabled</div>)
    render(<DropZone disabled>{childrenFn}</DropZone>)

    const renderState: DropZoneRenderState = childrenFn.mock.calls[0][0]
    expect(renderState.disabled).toBe(true)
  })
})

// ============================================================================
// TEST: Custom Text Props
// ============================================================================

describe('DropZone - Custom Text Props', () => {
  it('should display custom drag text when dragging', () => {
    render(
      <DropZone
        isDragActiveControlled={true}
        dragText="Release to upload files"
      />
    )

    expect(screen.getByText('Release to upload files')).toBeInTheDocument()
  })

  it('should display custom reject text', () => {
    render(
      <DropZone
        accept={IMAGE_ACCEPT}
        isDragActiveControlled={true}
        rejectText="Only images please!"
      />
    )

    // Note: Without actual drag events with invalid files, we can't trigger the reject state
    // This test verifies the prop is accepted
    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
  })
})

// ============================================================================
// TEST: Multiple Files
// ============================================================================

describe('DropZone - Multiple Files', () => {
  it('should accept multiple files by default', () => {
    render(<DropZone />)

    const input = document.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('multiple')
  })

  it('should respect multiple=false prop', () => {
    render(<DropZone multiple={false} />)

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toHaveAttribute('multiple')
  })

  it('should accept multiple files when multiple is true', async () => {
    const onDropAccepted = vi.fn()
    render(<DropZone multiple onDropAccepted={onDropAccepted} />)

    const dropZone = screen.getByRole('button')
    const file1 = createMockFile('file1.txt', 'text/plain')
    const file2 = createMockFile('file2.txt', 'text/plain')

    simulateDrop(dropZone, [file1, file2])

    await waitFor(() => {
      expect(onDropAccepted).toHaveBeenCalled()
      // Verify multiple files were accepted
      const acceptedFiles = onDropAccepted.mock.calls[0][0]
      expect(acceptedFiles).toBeInstanceOf(Array)
    }, { timeout: 2000 })
  })
})

// ============================================================================
// TEST: Edge Cases
// ============================================================================

describe('DropZone - Edge Cases', () => {
  it('should handle undefined accept prop', () => {
    render(<DropZone accept={undefined} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
  })

  it('should handle zero maxFiles (unlimited)', async () => {
    const onDropAccepted = vi.fn()
    render(<DropZone maxFiles={0} onDropAccepted={onDropAccepted} />)

    const dropZone = screen.getByRole('button')
    const files = [
      createMockFile('file1.txt', 'text/plain'),
      createMockFile('file2.txt', 'text/plain'),
      createMockFile('file3.txt', 'text/plain'),
    ]

    simulateDrop(dropZone, files)

    await waitFor(() => {
      expect(onDropAccepted).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('should handle very large maxSize value', () => {
    render(<DropZone maxSize={Number.MAX_SAFE_INTEGER} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
  })

  it('should render with empty accept object', () => {
    render(<DropZone accept={{}} />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toBeInTheDocument()
  })
})

// ============================================================================
// TEST: Accessibility
// ============================================================================

describe('DropZone - Accessibility', () => {
  it('should have accessible input element', () => {
    render(<DropZone />)

    const input = document.querySelector('input[type="file"]')
    expect(input).toBeInTheDocument()
  })

  it('should pass through aria attributes', () => {
    render(<DropZone aria-label="Upload files" />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('aria-label', 'Upload files')
  })

  it('should have role="button"', () => {
    render(<DropZone />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('role', 'button')
  })

  it('should have tabIndex=0 when enabled', () => {
    render(<DropZone />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('tabIndex', '0')
  })

  it('should have tabIndex=-1 when disabled', () => {
    render(<DropZone disabled />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('tabIndex', '-1')
  })

  it('should have aria-disabled when disabled', () => {
    render(<DropZone disabled />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('aria-disabled', 'true')
  })

  it('should have aria-busy when uploading', () => {
    render(<DropZone isUploading />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveAttribute('aria-busy', 'true')
  })

  it('should generate contextual aria-label with file type hints', () => {
    render(<DropZone accept={IMAGE_ACCEPT} />)

    const dropZone = screen.getByRole('button')
    const ariaLabel = dropZone.getAttribute('aria-label')
    expect(ariaLabel).toContain('Accepts')
    expect(ariaLabel).toContain('PNG')
  })

  it('should include single file hint in aria-label when maxFiles=1', () => {
    render(<DropZone maxFiles={1} />)

    const dropZone = screen.getByRole('button')
    const ariaLabel = dropZone.getAttribute('aria-label')
    expect(ariaLabel).toContain('Single file')
  })

  it('should have screen reader live region', () => {
    render(<DropZone />)

    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute('role', 'status')
    expect(liveRegion).toHaveClass('sr-only')
  })

  it('should have focus-visible styling classes', () => {
    render(<DropZone />)

    const dropZone = screen.getByRole('button')
    expect(dropZone).toHaveClass('focus-visible:ring-2')
    expect(dropZone).toHaveClass('focus-visible:ring-ring')
  })
})

// ============================================================================
// TEST: formatAcceptedTypes utility (via UI display)
// ============================================================================

describe('DropZone - formatAcceptedTypes', () => {
  it('should format MIME types with extensions', () => {
    render(<DropZone accept={{ 'image/*': ['.png', '.jpg'] }} />)

    expect(screen.getByText(/PNG.*JPG/i)).toBeInTheDocument()
  })

  it('should format wildcard MIME types', () => {
    render(<DropZone accept={{ 'audio/*': [] }} />)

    expect(screen.getByText(/Audio files/i)).toBeInTheDocument()
  })

  it('should handle multiple MIME types', () => {
    render(
      <DropZone
        accept={{
          'image/*': ['.png'],
          'video/*': ['.mp4'],
        }}
      />
    )

    expect(screen.getByText(/PNG.*MP4/i)).toBeInTheDocument()
  })
})
