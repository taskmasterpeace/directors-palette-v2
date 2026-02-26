'use client'

import { useState, useCallback, useMemo } from 'react'
import { useUnifiedGalleryStore } from '../store/unified-gallery-store'
import { useToast } from '@/hooks/use-toast'
import { clipboardManager } from '@/utils/clipboard-manager'
import { haptics } from '@/utils/haptics'
import { BulkDownloadService, DownloadProgress } from '../services/bulk-download.service'
import { useGallerySelection } from './useGallerySelection'
import { logger } from '@/lib/logger'

export type ViewMode = 'grid'

export interface GalleryFilters {
  searchQuery: string
  viewMode: ViewMode
}
export function useGalleryLogic(
  onSendToTab?: (imageUrl: string, targetTab: string) => void,
  onUseAsReference?: (imageUrl: string) => void,
  onSendToShotAnimator?: (imageUrl: string) => void,
  onSendToLayoutAnnotation?: (imageUrl: string) => void,
  onSendToLibrary?: (imageUrl: string, galleryId: string) => void,
  onImageSelect?: (imageUrl: string) => void
) {
  const { toast } = useToast()
  const {
    images,
    removeImage,
    setFullscreenImage,
    fullscreenImage,
    getTotalImages,
    getTotalCreditsUsed,
    updateImageReference,
    totalPages: storeTotalPages,
    setCurrentPage: storeSetCurrentPage,
    searchQuery,
    setSearchQuery
  } = useUnifiedGalleryStore()

  // Selection state using Set-based hook for efficient operations
  const {
    selectedIds,
    selectedCount,
    selectAll: selectAllIds,
    selectNone,
    toggleSelect,
    isSelected,
    handleSelectWithModifiers
  } = useGallerySelection()

  // Derive selectedImages array from selectedIds Set for backward compatibility
  // The selection uses image URLs for consistency with existing handlers
  const selectedImages = useMemo(() => Array.from(selectedIds), [selectedIds])

  // We only keep viewMode locally as it's UI preference
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)

  // Use images directly from store (server-side filtered)
  const paginatedImages = images
  const totalPages = storeTotalPages

  // Handlers
  const handleImageSelect = useCallback((imageUrl: string) => {
    if (onImageSelect) {
      onImageSelect(imageUrl)
    } else {
      toggleSelect(imageUrl)
    }
  }, [onImageSelect, toggleSelect])

  /**
   * Handle selection with modifier keys (Shift+click for range, Ctrl/Cmd+click for toggle).
   * Pass the ordered images array for range selection to work correctly.
   */
  const handleImageSelectWithModifiers = useCallback((
    imageUrl: string,
    event: React.MouseEvent
  ) => {
    if (onImageSelect) {
      // If custom handler provided, just call it (no modifier key support)
      onImageSelect(imageUrl)
    } else {
      // Use the ordered images from the paginated view for range selection
      handleSelectWithModifiers(imageUrl, paginatedImages.map(img => img.url), event)
    }
  }, [onImageSelect, handleSelectWithModifiers, paginatedImages])

  const handleClearSelection = useCallback(() => {
    selectNone()
  }, [selectNone])

  const handleSelectAll = useCallback(() => {
    selectAllIds(paginatedImages.map(img => img.url))
  }, [selectAllIds, paginatedImages])

  const handleDeleteSelected = async () => {
    let successCount = 0
    let failedCount = 0

    // Delete images in parallel, but await all results
    const results = await Promise.all(
      selectedImages.map(async (url) => {
        const success = await removeImage(url)
        return success
      })
    )

    results.forEach(success => {
      if (success) {
        successCount++
      } else {
        failedCount++
      }
    })

    selectNone()

    if (failedCount === 0) {
      toast({
        title: "Images Deleted Permanently",
        description: `${successCount} images removed from database and storage`
      })
    } else if (successCount === 0) {
      toast({
        title: "Delete Failed",
        description: `Failed to delete ${failedCount} images. Please try again.`,
        variant: "destructive"
      })
    } else {
      toast({
        title: "Partial Delete",
        description: `Deleted ${successCount} images, but ${failedCount} failed.`,
        variant: "destructive"
      })
    }
  }

  const handleCopyImage = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()

      // Convert image to PNG for clipboard compatibility
      if (blob.type !== 'image/png') {
        // Create an image element to convert the format
        const img = new Image()
        const objectUrl = URL.createObjectURL(blob)

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = objectUrl
        })

        // Create a canvas and draw the image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')

        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(objectUrl)

        // Convert canvas to PNG data URL
        const dataURL = canvas.toDataURL('image/png')

        // Copy using clipboardManager
        await clipboardManager.writeImage(dataURL)
      } else {
        // Convert blob to data URL for clipboardManager
        const reader = new FileReader()
        const dataURL = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        await clipboardManager.writeImage(dataURL)
      }

      toast({
        title: "Copied",
        description: "Image copied to clipboard"
      })
    } catch (error) {
      logger.shotCreator.error('Copy failed', { error: error instanceof Error ? error.message : String(error) })
      // Fallback: try to copy URL instead
      try {
        await clipboardManager.writeText(url)
        toast({
          title: "Copied URL",
          description: "Image URL copied to clipboard (image format not supported)"
        })
      } catch {
        toast({
          title: "Copy Failed",
          description: "Unable to copy to clipboard",
          variant: "destructive"
        })
      }
    }
  }

  const handleDownloadImage = async (url: string) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(url, { mode: "cors" })
      const blob = await response.blob()

      // Create a local object URL for the blob
      const objectUrl = URL.createObjectURL(blob)

      // Create a hidden <a> tag and click it
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = `image_${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Cleanup the object URL
      URL.revokeObjectURL(objectUrl)

      toast({
        title: "Download started",
        description: "Your image is downloading"
      })
    } catch (err) {
      logger.shotCreator.error('Download failed', { error: err instanceof Error ? err.message : String(err) })
      toast({
        title: "Download failed",
        description: "Could not download image",
        variant: "destructive"
      })
    }
  }

  const handleDeleteImage = async (imageUrl: string) => {
    const success = await removeImage(imageUrl)
    if (success) {
      // Remove from selection if it was selected
      if (isSelected(imageUrl)) {
        toggleSelect(imageUrl)
      }
      toast({
        title: "Image Deleted Permanently",
        description: "Removed from database and storage"
      })
    } else {
      toast({
        title: "Deletion Failed",
        description: "Could not delete image",
        variant: "destructive"
      })
    }
  }

  const handleSendTo = (imageUrl: string, target: string) => {
    if ((target === 'reference' || target === 'shot-creator') && onUseAsReference) {
      onUseAsReference(imageUrl)
      return
    } else if (target === 'shot-animator' && onSendToShotAnimator) {
      onSendToShotAnimator(imageUrl)
      return
    } else if (target === 'layout-annotation' && onSendToLayoutAnnotation) {
      onSendToLayoutAnnotation(imageUrl)
      return
    } else if (onSendToTab) {
      onSendToTab(imageUrl, target)
    } else if (target === 'library' && onSendToLibrary) {
      // Find the image to get its gallery ID
      const image = images.find(img => img.url === imageUrl)
      if (image) {
        onSendToLibrary(imageUrl, image.id)
      } else {
        toast({
          title: "Error",
          description: "Could not find image in gallery",
          variant: "destructive"
        })
        return
      }
    }

    toast({
      title: "Image Sent",
      description: `Image sent to ${target}`
    })
  }
  const handleSearchChange = (query: string) => {
    // Debouncing could be added here or in the UI component
    setSearchQuery(query)
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
  }

  const handlePageChange = (page: number) => {
    storeSetCurrentPage(page)
  }

  const handleUpdateImageReference = async (imageId: string, reference: string) => {
    try {
      await updateImageReference(imageId, reference)
      // Haptic feedback for mobile
      haptics.success()
      toast({
        title: "Reference Updated",
        description: `Image reference set to ${reference.startsWith('@') ? reference : `@${reference}`}`
      })
    } catch (error) {
      logger.shotCreator.error('Failed to update reference', { error: error instanceof Error ? error.message : String(error) })
      // Error haptic for mobile
      haptics.error()
      toast({
        title: "Update Failed",
        description: "Could not update image reference",
        variant: "destructive"
      })
    }
  }

  const handleBulkDownload = async () => {
    if (selectedImages.length === 0) return

    setDownloadModalOpen(true)

    const imagesToDownload = images
      .filter(img => selectedImages.includes(img.url))
      .map(img => ({ url: img.url, id: img.id }))

    try {
      await BulkDownloadService.downloadAsZip(
        imagesToDownload,
        undefined, // use default name
        (progress) => setDownloadProgress(progress)
      )
    } catch (error) {
      logger.shotCreator.error('Bulk download failed', { error: error instanceof Error ? error.message : String(error) })
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download images',
        variant: 'destructive'
      })
    }
  }

  return {
    // Data
    images,
    filteredImages: images, // Logic is now server-side, so images ARE the filtered images
    paginatedImages,
    totalPages,
    selectedImages,
    selectedCount, // Number of selected images (from useGallerySelection)
    isSelected, // Check if a specific image is selected
    filters: {
      searchQuery: searchQuery,
      viewMode: viewMode
    },
    fullscreenImage,

    // Stats
    totalImages: getTotalImages(),
    totalCredits: getTotalCreditsUsed(),

    // Handlers
    handleImageSelect,
    handleImageSelectWithModifiers, // Selection with Shift/Ctrl modifier key support
    handleSelectAll,
    handleClearSelection,
    handleDeleteSelected,
    handleCopyImage,
    handleDownloadImage,
    handleDeleteImage,
    handleSendTo,
    handleSearchChange,
    handleViewModeChange,
    handlePageChange,
    setFullscreenImage,
    updateImageReference: handleUpdateImageReference,

    // Bulk Download
    downloadModalOpen,
    downloadProgress,
    handleBulkDownload,
    setDownloadModalOpen
  }
}