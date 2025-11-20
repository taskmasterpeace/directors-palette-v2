import { create } from 'zustand'
import { GalleryService } from '../services/gallery.service'

export interface GeneratedImage {
  id: string
  url: string // Now stores permanent Supabase Storage URL
  prompt: string
  source: 'shot-creator' | 'shot-animator' | 'layout-annotation'
  originalImage?: string // For edited images, store the original
  editInstructions?: string // For edited images, store the instructions used
  model: string
  reference?: string // NEW: @reference tag for easier referencing (e.g. "@hero", "@villain")
  settings: {
    aspectRatio: string
    resolution: string
    seed?: number
    custom_width?: number
    custom_height?: number
    aspect_ratio?: string
  }
  metadata: {
    createdAt: string
    creditsUsed: number
    processingTime?: number
  }
  createdAt?: string
  timestamp: number // NEW: Timestamp for compatibility with GalleryImage
  tags: string[]
  width?: number
  height?: number

  // NEW: Persistence metadata
  persistence: {
    isPermanent: boolean // True if stored in Supabase Storage
    temporaryUrl?: string // Original Replicate URL for reference
    storagePath?: string // Supabase Storage path
    fileSize?: number // File size in bytes
    downloadedAt?: string // When image was downloaded and saved
    error?: string // Any persistence errors
  }
}

interface UnifiedGalleryState {
  images: GeneratedImage[]
  recentImages: GeneratedImage[]
  selectedImage: string | null
  fullscreenImage: GeneratedImage | null

  // Pagination state
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number

  // Actions
  addImage: (image: Omit<GeneratedImage, 'id' | 'metadata'> & {
    creditsUsed: number
    isPermanent?: boolean
    temporaryUrl?: string
    storagePath?: string
    fileSize?: number
    error?: string
  }) => void
  loadImages: (images: GeneratedImage[]) => void
  loadImagesPaginated: (images: GeneratedImage[], total: number, totalPages: number) => void
  setCurrentPage: (page: number) => void
  removeImage: (imageIdOrUrl: string) => Promise<boolean>
  setFullscreenImage: (image: GeneratedImage | null) => void
  updateImageReference: (imageId: string, reference: string) => Promise<void>

  // Filtering
  getAllReferences: () => string[]
  getImagesByReferences: (references: string[]) => GeneratedImage[]

  // Utilities
  getTotalImages: () => number
  getTotalCreditsUsed: () => number
}

export const useUnifiedGalleryStore = create<UnifiedGalleryState>()((set, get) => ({
  images: [],
  recentImages: [],
  selectedImage: null,
  fullscreenImage: null,

  // Pagination state
  currentPage: 1,
  totalPages: 0,
  totalItems: 0,
  pageSize: 12,

  addImage: (imageData) => {
    const newImage: GeneratedImage = {
      ...imageData,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        creditsUsed: imageData.creditsUsed
      },
      timestamp: Date.now(), // NEW: Add timestamp for GalleryImage compatibility
      persistence: {
        isPermanent: imageData.isPermanent ?? false,
        temporaryUrl: imageData.temporaryUrl,
        storagePath: imageData.storagePath,
        fileSize: imageData.fileSize,
        downloadedAt: imageData.isPermanent ? new Date().toISOString() : undefined,
        error: imageData.error
      }
    }

    set((state) => ({
      images: [newImage, ...state.images],
      recentImages: [newImage, ...state.recentImages.slice(0, 9)]
    }))

    // Log persistence status for monitoring
    if (newImage.persistence.isPermanent) {
      console.log('✅ Gallery: Added permanently stored image', {
        id: newImage.id,
        url: newImage.url,
        size: newImage.persistence.fileSize
      });
    } else {
      console.warn('⚠️ Gallery: Added temporary image (will expire)', {
        id: newImage.id,
        temporaryUrl: newImage.url,
        error: newImage.persistence.error
      });
    }
  },

  loadImages: (images) => {
    set({
      images: images,
      recentImages: images.slice(0, 10)
    })
  },

  loadImagesPaginated: (images, total, totalPages) => {
    set({
      images: images,
      recentImages: images.slice(0, 10),
      totalItems: total,
      totalPages: totalPages
    })
  },

  setCurrentPage: (page) => {
    set({ currentPage: page })
  },

  removeImage: async (imageIdOrUrl) => {
    // Find the image to get its ID
    const state = useUnifiedGalleryStore.getState()
    const image = state.images.find(img => img.id === imageIdOrUrl || img.url === imageIdOrUrl)

    if (image) {
      // Delete from Supabase (database and storage)
      const result = await GalleryService.deleteImage(image.id)

      if (!result.success) {
        console.error('Failed to delete image:', result.error)
        return false
      }
    }

    // Remove from store
    set((state) => ({
      images: state.images.filter(img =>
        img.id !== imageIdOrUrl && img.url !== imageIdOrUrl
      ),
      selectedImage: state.selectedImage === imageIdOrUrl ? null : state.selectedImage,
      fullscreenImage: (state.fullscreenImage?.id === imageIdOrUrl || state.fullscreenImage?.url === imageIdOrUrl) ? null : state.fullscreenImage,
      recentImages: state.recentImages.filter(img => img.id !== imageIdOrUrl && img.url !== imageIdOrUrl)
    }))

    return true
  },

  setFullscreenImage: (image) => {
    set({ fullscreenImage: image })
  },

  updateImageReference: async (imageId, reference) => {
    const normalizedRef = reference.startsWith('@') ? reference : `@${reference}`

    // Update database first
    const result = await GalleryService.updateReference(imageId, normalizedRef)

    if (!result.success) {
      console.error('Failed to update reference in database:', result.error)
      return
    }

    // Update local state
    set((state) => ({
      images: state.images.map(img =>
        img.id === imageId
          ? { ...img, reference: normalizedRef }
          : img
      ),
      // Also update fullscreenImage if it's the same image
      fullscreenImage: state.fullscreenImage?.id === imageId
        ? { ...state.fullscreenImage, reference: normalizedRef }
        : state.fullscreenImage
    }))
  },

  getAllReferences: () => {
    const images = get().images
    console.log('🔍 getAllReferences called:', {
      totalImages: images.length,
      imagesWithReferences: images.filter(img => img.reference).length,
      sampleImages: images.slice(0, 3).map(img => ({ id: img.id, reference: img.reference }))
    })
    const refs = images
      .filter(img => img.reference)
      .map(img => img.reference!)
    return [...new Set(refs)] // Return unique references
  },

  getImagesByReferences: (references) => {
    if (!references || references.length === 0) {
      return []
    }

    // Normalize references to lowercase for case-insensitive matching
    const normalizedRefs = references.map(ref => ref.toLowerCase())

    // Find images whose reference matches any of the provided references
    return get().images.filter(img => {
      if (!img.reference) return false
      const normalizedImgRef = img.reference.toLowerCase()
      return normalizedRefs.includes(normalizedImgRef)
    })
  },

  getTotalImages: () => {
    return get().images.length
  },

  getTotalCreditsUsed: () => {
    return get().images.reduce((total, img) => total + img.metadata.creditsUsed, 0)
  }
}))