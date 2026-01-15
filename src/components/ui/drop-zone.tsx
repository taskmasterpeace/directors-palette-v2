'use client'

import * as React from 'react'
import { useDropzone, type Accept, type FileRejection, type DropzoneOptions } from 'react-dropzone'
import { cva, type VariantProps } from 'class-variance-authority'
import { Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

import { cn } from '@/utils/utils'

/**
 * Generates a human-readable string of accepted file types from the accept prop
 */
function formatAcceptedTypes(accept?: Accept): string | undefined {
  if (!accept) return undefined

  const extensions: string[] = []
  const mimeDescriptions: string[] = []

  for (const [mimeType, exts] of Object.entries(accept)) {
    // Add file extensions
    if (exts && exts.length > 0) {
      extensions.push(...exts.map((ext) => ext.toUpperCase().replace('.', '')))
    } else {
      // Handle wildcard MIME types like 'image/*'
      if (mimeType.endsWith('/*')) {
        const type = mimeType.replace('/*', '')
        mimeDescriptions.push(type.charAt(0).toUpperCase() + type.slice(1) + ' files')
      } else {
        // Handle specific MIME types
        const typePart = mimeType.split('/')[1]
        if (typePart) {
          extensions.push(typePart.toUpperCase())
        }
      }
    }
  }

  const uniqueExtensions = [...new Set(extensions)]
  const parts: string[] = []

  if (uniqueExtensions.length > 0) {
    parts.push(uniqueExtensions.join(', '))
  }
  if (mimeDescriptions.length > 0) {
    parts.push(...mimeDescriptions)
  }

  return parts.length > 0 ? parts.join(' • ') : undefined
}

const dropZoneVariants = cva(
  'relative rounded-lg border-2 border-dashed transition-all cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border-muted-foreground/25 hover:border-primary/50 bg-background',
        ghost: 'border-transparent hover:border-muted-foreground/25 bg-transparent',
      },
      size: {
        // Compact: Horizontal layout for inline use (e.g., within form fields)
        compact: 'flex flex-row items-center gap-3 p-3 min-h-[56px]',
        // Default: Vertical centered layout
        default: 'flex flex-col items-center justify-center p-6 min-h-[120px]',
        // Large: Full-area layout with more prominent spacing
        large: 'flex flex-col items-center justify-center p-8 min-h-[200px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

/**
 * State object passed to children render function
 */
export interface DropZoneRenderState {
  /** Whether files are being dragged over the zone */
  isDragActive: boolean
  /** Whether dragged files match accepted types */
  isDragAccept: boolean
  /** Whether dragged files don't match accepted types */
  isDragReject: boolean
  /** Whether the zone is focused (keyboard navigation) */
  isFocused: boolean
  /** Whether files are currently uploading */
  isUploading: boolean
  /** Whether the zone is disabled */
  disabled: boolean
  /** Whether there's a recent rejection error */
  hasError: boolean
  /** The current error message if any */
  errorMessage: string | null
  /** Open the file picker programmatically */
  open: () => void
}

/**
 * Ref handle for imperative control of the DropZone
 */
export interface DropZoneRef {
  /** Open the file picker programmatically */
  open: () => void
  /** Clear any current error state */
  clearError: () => void
}

export interface DropZoneProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop' | 'children'>,
    VariantProps<typeof dropZoneVariants> {
  /**
   * Accepted file types. Use MIME types or file extensions.
   * @example { 'image/*': ['.png', '.jpg', '.jpeg'] }
   */
  accept?: Accept
  /**
   * Maximum number of files to accept
   */
  maxFiles?: number
  /**
   * Maximum file size in bytes
   */
  maxSize?: number
  /**
   * Minimum file size in bytes
   */
  minSize?: number
  /**
   * Whether the dropzone is disabled
   */
  disabled?: boolean
  /**
   * Whether to accept multiple files
   */
  multiple?: boolean
  /**
   * Callback when files are dropped (both accepted and rejected)
   */
  onDrop?: (acceptedFiles: File[], fileRejections: FileRejection[]) => void
  /**
   * Callback when files are accepted
   */
  onDropAccepted?: (files: File[]) => void
  /**
   * Callback when files are rejected
   */
  onDropRejected?: (fileRejections: FileRejection[]) => void
  /**
   * Callback when drag enters the zone
   */
  onDragEnter?: () => void
  /**
   * Callback when drag leaves the zone
   */
  onDragLeave?: () => void
  /**
   * Text to display when idle
   */
  idleText?: string
  /**
   * Text to display when dragging over
   */
  dragText?: string
  /**
   * Text for accepted file types hint
   */
  acceptText?: string
  /**
   * Whether to show the default icon
   */
  showIcon?: boolean
  /**
   * Custom icon to display
   */
  icon?: React.ReactNode
  /**
   * Custom children to render inside the dropzone.
   * Can be a ReactNode or a render function that receives state.
   */
  children?: React.ReactNode | ((state: DropZoneRenderState) => React.ReactNode)
  /**
   * Whether the dropzone is currently uploading files
   */
  isUploading?: boolean
  /**
   * Text to display when uploading
   */
  uploadingText?: string
  /**
   * Text to display when drag is rejected (invalid file type)
   */
  rejectText?: string
  /**
   * Controlled drag active state. When provided, overrides internal drag state.
   * Useful for showing drop zone feedback when dragging over parent elements.
   */
  isDragActiveControlled?: boolean
  /**
   * Callback when drag state changes (for controlled mode coordination)
   */
  onDragActiveChange?: (isDragActive: boolean) => void
  /**
   * Whether to prevent the file picker from opening on click.
   * Useful when you want to handle click separately or use as overlay only.
   */
  noClick?: boolean
  /**
   * Whether to prevent the file picker from opening on keyboard navigation.
   */
  noKeyboard?: boolean
  /**
   * Additional dropzone options
   */
  dropzoneOptions?: Omit<
    DropzoneOptions,
    'accept' | 'maxFiles' | 'maxSize' | 'minSize' | 'disabled' | 'multiple' | 'onDrop' | 'onDropAccepted' | 'onDropRejected' | 'onDragEnter' | 'onDragLeave'
  >
}

const DropZone = React.forwardRef<DropZoneRef, DropZoneProps>(
  (
    {
      className,
      variant,
      size,
      accept,
      maxFiles = 0,
      maxSize,
      minSize,
      disabled = false,
      multiple = true,
      onDrop,
      onDropAccepted,
      onDropRejected,
      onDragEnter,
      onDragLeave,
      idleText = 'Drag & drop files here, or click to select',
      dragText = 'Drop files here...',
      acceptText,
      showIcon = true,
      icon,
      children,
      isUploading = false,
      uploadingText = 'Uploading...',
      rejectText = 'Invalid file type',
      isDragActiveControlled,
      onDragActiveChange,
      noClick = false,
      noKeyboard = false,
      dropzoneOptions,
      'aria-label': ariaLabelProp,
      ...props
    },
    ref
  ) => {
    // Internal ref for the DOM element
    const internalRef = React.useRef<HTMLDivElement>(null)
    // Auto-generate accepted file types text if not provided (used in useDropzone callback)
    const displayAcceptTextForCallback = acceptText ?? formatAcceptedTypes(accept)

    // Handle rejected drops to show persistent error
    const handleDropRejected = React.useCallback(
      (fileRejections: FileRejection[]) => {
        if (fileRejections.length > 0) {
          // Get the first error message
          const firstRejection = fileRejections[0]
          const firstError = firstRejection?.errors?.[0]

          let errorMessage = rejectText
          if (firstError) {
            switch (firstError.code) {
              case 'file-invalid-type':
                errorMessage = displayAcceptTextForCallback
                  ? `Invalid type. Accepts: ${displayAcceptTextForCallback}`
                  : rejectText
                break
              case 'file-too-large':
                errorMessage = 'File is too large'
                break
              case 'file-too-small':
                errorMessage = 'File is too small'
                break
              case 'too-many-files':
                errorMessage = `Too many files. Max: ${maxFiles}`
                break
              default:
                errorMessage = firstError.message || rejectText
            }
          }

          setLastRejection({
            message: errorMessage,
            timestamp: Date.now(),
          })
        }

        // Call the original handler
        onDropRejected?.(fileRejections)
      },
      [onDropRejected, rejectText, displayAcceptTextForCallback, maxFiles]
    )

    // Wrap drag callbacks to report state changes
    const handleDragEnter = React.useCallback(() => {
      onDragActiveChange?.(true)
      onDragEnter?.()
    }, [onDragActiveChange, onDragEnter])

    const handleDragLeave = React.useCallback(() => {
      onDragActiveChange?.(false)
      onDragLeave?.()
    }, [onDragActiveChange, onDragLeave])

    const handleDropWrapper = React.useCallback(
      (acceptedFiles: File[], fileRejections: FileRejection[]) => {
        onDragActiveChange?.(false)
        onDrop?.(acceptedFiles, fileRejections)
      },
      [onDragActiveChange, onDrop]
    )

    const {
      getRootProps,
      getInputProps,
      isDragActive: isDragActiveInternal,
      isDragAccept,
      isDragReject,
      isFocused,
      open,
    } = useDropzone({
      accept,
      maxFiles: maxFiles > 0 ? maxFiles : undefined,
      maxSize,
      minSize,
      disabled,
      multiple: maxFiles === 1 ? false : multiple,
      onDrop: handleDropWrapper,
      onDropAccepted,
      onDropRejected: handleDropRejected,
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      noClick,
      noKeyboard,
      ...dropzoneOptions,
    })

    // Use controlled state if provided, otherwise use internal state
    const isDragActive = isDragActiveControlled ?? isDragActiveInternal

    const rootProps = getRootProps()
    const inputProps = getInputProps()

    // Track shake animation for reject state
    const [showShake, setShowShake] = React.useState(false)

    // Track temporary error state after rejected drop
    const [lastRejection, setLastRejection] = React.useState<{
      message: string
      timestamp: number
    } | null>(null)

    // Expose imperative methods via ref
    React.useImperativeHandle(ref, () => ({
      open,
      clearError: () => setLastRejection(null),
    }), [open])

    // Auto-generate accepted file types text if not provided (for UI display)
    const displayAcceptText = acceptText ?? formatAcceptedTypes(accept)

    // Track previous state for screen reader announcements
    const [announcement, setAnnouncement] = React.useState<string | null>(null)
    const prevStateRef = React.useRef<{
      isDragActive: boolean
      isAccepting: boolean
      isRejecting: boolean
      isUploading: boolean
      hasError: boolean
    } | null>(null)

    // Trigger shake animation when rejection starts
    React.useEffect(() => {
      if (isDragReject) {
        setShowShake(true)
        const timer = setTimeout(() => setShowShake(false), 500)
        return () => clearTimeout(timer)
      }
    }, [isDragReject])

    // Clear rejection message after timeout
    React.useEffect(() => {
      if (lastRejection) {
        const timer = setTimeout(() => setLastRejection(null), 3000)
        return () => clearTimeout(timer)
      }
    }, [lastRejection])

    // Determine state for styling
    // Show error state when we have a recent rejection (within 3 seconds)
    const hasRecentRejection = lastRejection !== null
    // When using controlled mode, we only know isDragActive, not accept/reject specifics
    // So we use internal accept/reject states alongside controlled active state
    const isActive = isDragActive
    const isAccepting = isDragActive && isDragAccept
    const isRejecting = isDragActive && isDragReject

    // Screen reader announcements for state changes
    React.useEffect(() => {
      const prevState = prevStateRef.current
      const currentState = {
        isDragActive: isActive,
        isAccepting,
        isRejecting,
        isUploading,
        hasError: hasRecentRejection,
      }

      // Only announce if we have a previous state to compare
      if (prevState) {
        // Announce drag enter
        if (!prevState.isDragActive && currentState.isDragActive) {
          if (currentState.isAccepting) {
            setAnnouncement('Valid file detected. Release to upload.')
          } else if (currentState.isRejecting) {
            setAnnouncement('Invalid file type. This file cannot be uploaded here.')
          } else {
            setAnnouncement('File detected. Release to upload.')
          }
        }
        // Announce accept/reject changes during drag
        else if (currentState.isDragActive && prevState.isAccepting !== currentState.isAccepting) {
          if (currentState.isAccepting) {
            setAnnouncement('Valid file type.')
          }
        }
        else if (currentState.isDragActive && prevState.isRejecting !== currentState.isRejecting) {
          if (currentState.isRejecting) {
            setAnnouncement('Invalid file type.')
          }
        }
        // Announce upload start
        else if (!prevState.isUploading && currentState.isUploading) {
          setAnnouncement('Upload started.')
        }
        // Announce upload complete
        else if (prevState.isUploading && !currentState.isUploading) {
          if (currentState.hasError) {
            setAnnouncement('Upload failed. ' + (lastRejection?.message || 'An error occurred.'))
          } else {
            setAnnouncement('Upload complete.')
          }
        }
        // Announce error after drop
        else if (!prevState.hasError && currentState.hasError && !currentState.isUploading) {
          setAnnouncement(lastRejection?.message || 'File upload error.')
        }
        // Announce drag leave
        else if (prevState.isDragActive && !currentState.isDragActive && !currentState.isUploading && !currentState.hasError) {
          setAnnouncement('Drop cancelled.')
        }
      }

      prevStateRef.current = currentState

      // Clear announcement after a short delay so the same message can be announced again
      if (announcement) {
        const timer = setTimeout(() => setAnnouncement(null), 1000)
        return () => clearTimeout(timer)
      }
    }, [isActive, isAccepting, isRejecting, isUploading, hasRecentRejection, lastRejection?.message, announcement])

    // Determine which icon to show based on state
    const getIcon = () => {
      if (isUploading) {
        return <Loader2 className="h-6 w-6 animate-spin" />
      }
      if (isRejecting || hasRecentRejection) {
        return <AlertCircle className="h-6 w-6" />
      }
      if (isAccepting) {
        return <CheckCircle2 className="h-6 w-6" />
      }
      return icon || <Upload className="h-6 w-6" />
    }

    // Determine text to display based on state
    const getText = () => {
      if (isUploading) {
        return uploadingText
      }
      // Show persistent error message after a rejected drop
      if (hasRecentRejection && !isActive) {
        return lastRejection.message
      }
      if (isRejecting) {
        return rejectText
      }
      if (isActive) {
        return dragText
      }
      return idleText
    }

    // Determine if we should show accepted types hint
    // Show during: idle state and during drag rejection (to guide user)
    // Don't show during post-rejection since the error message already includes accept info
    const shouldShowAcceptHint = displayAcceptText && !isUploading && (
      (!isActive && !hasRecentRejection) || // Idle state
      isRejecting // Drag rejection state
    )

    // Create render state object for render function children
    const renderState: DropZoneRenderState = {
      isDragActive: isActive,
      isDragAccept: isAccepting,
      isDragReject: isRejecting,
      isFocused,
      isUploading,
      disabled,
      hasError: hasRecentRejection,
      errorMessage: lastRejection?.message ?? null,
      open,
    }

    // Generate aria-label for the drop zone
    const getAriaLabel = (): string => {
      // Use custom aria-label if provided
      if (ariaLabelProp) return ariaLabelProp

      // Build contextual aria-label based on state
      const fileTypeHint = displayAcceptText ? ` Accepts ${displayAcceptText}.` : ''
      const multipleHint = maxFiles === 1 ? ' Single file.' : multiple ? ' Multiple files allowed.' : ''

      if (disabled) {
        return `File upload disabled.${fileTypeHint}`
      }
      if (isUploading) {
        return `Uploading files. Please wait.`
      }
      if (hasRecentRejection) {
        return `Upload error: ${lastRejection?.message || 'Invalid file'}.${fileTypeHint}`
      }
      if (isRejecting) {
        return `Invalid file type.${fileTypeHint}`
      }
      if (isAccepting) {
        return `Valid file. Release to upload.`
      }
      if (isActive) {
        return `Drop file here to upload.`
      }

      return `Upload files. Drag and drop or press Enter to browse.${fileTypeHint}${multipleHint}`
    }

    // Render children - supports both ReactNode and render function patterns
    const renderChildren = () => {
      if (typeof children === 'function') {
        return children(renderState)
      }
      return children
    }

    // Determine if using compact layout (horizontal)
    const isCompact = size === 'compact'

    return (
      <div
        ref={internalRef}
        {...rootProps}
        {...props}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={getAriaLabel()}
        aria-disabled={disabled || undefined}
        aria-busy={isUploading || undefined}
        data-drop-zone="true"
        data-slot="drop-zone"
        data-drag-active={isActive || undefined}
        data-drag-accept={isAccepting || undefined}
        data-drag-reject={isRejecting || undefined}
        data-focused={isFocused || undefined}
        data-disabled={disabled || undefined}
        data-uploading={isUploading || undefined}
        className={cn(
          dropZoneVariants({ variant, size }),
          // Keyboard focus ring (using focus-visible for keyboard-only focus)
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Idle state - dashed border (default from variants)
          // Uploading state
          isUploading && 'border-muted-foreground/50 bg-muted/50 cursor-wait',
          // Drag accept state - pulsing primary border with scale animation
          isAccepting && !isUploading && [
            'border-primary bg-primary/10 border-solid',
            'animate-dropzone-pulse animate-dropzone-scale',
            'shadow-lg shadow-primary/20',
          ],
          // Drag reject state - red border with shake
          isRejecting && [
            'border-destructive bg-destructive/10 border-solid',
            showShake && 'animate-dropzone-shake',
          ],
          // Post-rejection error state (after drop) - softer error styling
          hasRecentRejection && !isActive && !isUploading && [
            'border-destructive/70 bg-destructive/5',
          ],
          // Active drag (generic) - fallback if neither accept nor reject
          isActive && !isAccepting && !isRejecting && !isUploading && 'border-primary/70 bg-primary/5',
          // Disabled state
          (disabled || isUploading) && 'pointer-events-none',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {/* Screen reader live region for state announcements */}
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </span>
        <input {...inputProps} />

        {children ? (
          renderChildren()
        ) : (
          <div className={cn(
            'flex gap-2',
            // Compact: horizontal layout, Default/Large: vertical centered layout
            isCompact ? 'flex-row items-center text-left' : 'flex-col items-center text-center'
          )}>
            {showIcon && (
              <div className={cn(
                'rounded-full transition-all duration-200 shrink-0',
                // Icon padding varies by size
                isCompact ? 'p-2' : 'p-3',
                // Uploading state
                isUploading && 'bg-muted text-muted-foreground',
                // Accepting state
                isAccepting && !isUploading && 'bg-primary/15 text-primary scale-110',
                // Rejecting state (during drag)
                isRejecting && 'bg-destructive/15 text-destructive',
                // Post-rejection error state (after drop)
                hasRecentRejection && !isActive && !isUploading && 'bg-destructive/10 text-destructive',
                // Active but not accepting/rejecting
                isActive && !isAccepting && !isRejecting && !isUploading && 'bg-primary/10 text-primary',
                // Idle state
                !isActive && !isUploading && !hasRecentRejection && 'bg-muted text-muted-foreground'
              )}>
                {getIcon()}
              </div>
            )}

            <div className={cn(
              isCompact ? 'flex flex-row items-center gap-2 min-w-0' : 'space-y-1'
            )}>
              <p className={cn(
                'text-sm font-medium transition-colors duration-200',
                isCompact && 'truncate',
                // Uploading state
                isUploading && 'text-muted-foreground',
                // Accepting state
                isAccepting && !isUploading && 'text-primary',
                // Rejecting state (during drag)
                isRejecting && 'text-destructive',
                // Post-rejection error state (after drop)
                hasRecentRejection && !isActive && !isUploading && 'text-destructive',
                // Active but not accepting/rejecting
                isActive && !isAccepting && !isRejecting && !isUploading && 'text-primary',
                // Idle state
                !isActive && !isUploading && !hasRecentRejection && 'text-foreground'
              )}>
                {getText()}
              </p>

              {/* Show accepted file types:
                  - In idle state as a hint
                  - During rejection as guidance for what's allowed */}
              {shouldShowAcceptHint && (
                <p className={cn(
                  'text-xs transition-colors duration-200',
                  isCompact && 'shrink-0',
                  isRejecting ? 'text-destructive/80' : 'text-muted-foreground'
                )}>
                  {isCompact && '• '}
                  {isRejecting ? `Accepts: ${displayAcceptText}` : displayAcceptText}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
)

DropZone.displayName = 'DropZone'

export { DropZone, dropZoneVariants }
