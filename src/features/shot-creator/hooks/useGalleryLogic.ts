'use client'

import { useState, useMemo, useCallback } from 'react'
import { useUnifiedGalleryStore } from '../store/unified-gallery-store'
import type { GalleryImage } from '../types'
import { useToast } from '@/hooks/use-toast'
import { clipboardManager } from '@/utils/clipboard-manager'

export interface ChainData {
  chainId: string
  images: GalleryImage[]
  totalCredits: number
  startTime: number
  endTime: number
}

export type ViewMode = 'grid'

export interface GalleryFilters {
  searchQuery: string
  currentPage: number
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
    currentPage: storeCurrentPage,
    setCurrentPage: storeSetCurrentPage
  } = useUnifiedGalleryStore()

  // State
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [filters, setFilters] = useState<GalleryFilters>({
    searchQuery: '',
    currentPage: storeCurrentPage,
    viewMode: 'grid'
  })

  // Filter logic (no local pagination)
  const filteredImages = useMemo(() => {
    // If search query is empty, return all images
    if (filters.searchQuery.trim() === '') {
      return images
    }

    // Filter by search query
    return images.filter((image: GalleryImage) =>
      image.prompt.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      image.model?.toLowerCase().includes(filters.searchQuery.toLowerCase())
    )
  }, [images, filters.searchQuery])

  // Use images directly from store (already paginated by server)
  const paginatedImages = images
  const totalPages = storeTotalPages

  // Handlers
  const handleImageSelect = useCallback((imageUrl: string) => {
    if (onImageSelect) {
      onImageSelect(imageUrl)
    } else {
      setSelectedImages(prev =>
        prev.includes(imageUrl)
          ? prev.filter(url => url !== imageUrl)
          : [...prev, imageUrl]
      )
    }
  }, [onImageSelect])

  const handleClearSelection = () => {
    setSelectedImages([])
  }

  const handleSelectAll = () => {
    setSelectedImages(paginatedImages.map(img => img.url))
  }

  const handleDeleteSelected = () => {
    selectedImages.forEach(url => removeImage(url))
    setSelectedImages([])
    toast({
      title: "Images Deleted",
      description: `${selectedImages.length} images removed from gallery`
    })
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
      console.error("Copy failed", error)
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
      console.error("Download failed", err)
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
      setSelectedImages(prev => prev.filter(url => url !== imageUrl))
      toast({
        title: "Image Deleted",
        description: "Image removed from gallery"
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
    setFilters(prev => ({ ...prev, searchQuery: query, currentPage: 1 }))
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setFilters(prev => ({ ...prev, viewMode: mode, currentPage: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, currentPage: page }))
    storeSetCurrentPage(page)
  }

  return {
    // Data
    images,
    filteredImages,
    paginatedImages,
    totalPages,
    selectedImages,
    filters,
    fullscreenImage,

    // Stats
    totalImages: getTotalImages(),
    totalCredits: getTotalCreditsUsed(),

    // Handlers
    handleImageSelect,
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
    updateImageReference
  }
}