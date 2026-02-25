import { create } from 'zustand'
import { GalleryService } from '../services/gallery.service'
import { FolderService } from '@/lib/services/folder.service'
import type { FolderWithCount, CreateFolderInput, UpdateFolderInput } from '../types/folder.types'

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface GeneratedImage {
  id: string
  url: string // Now stores permanent Supabase Storage URL
  prompt: string
  source: 'shot-creator' | 'shot-animator' | 'layout-annotation' | 'adhub' | 'storybook' | 'storyboard'
  originalImage?: string // For edited images, store the original
  editInstructions?: string // For edited images, store the instructions used
  model: string
  reference?: string // NEW: @reference tag for easier referencing (e.g. "@hero", "@villain")
  folderId?: string | null // NEW: Folder organization
  folderName?: string // NEW: Folder name for display
  recipeId?: string // Recipe used to generate this image
  recipeName?: string // Recipe name for display
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
    error?: string // Error message if generation failed
    isGrid?: boolean // True if this is a 3x3 grid image (for extraction)
    gridType?: 'angles' | 'broll' // Type of grid for context
  }
  createdAt?: string
  timestamp: number // NEW: Timestamp for compatibility with GalleryImage
  tags: string[]
  width?: number
  height?: number

  // Generation status for showing loading/error states
  status: GenerationStatus

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

export type GridSize = 'small' | 'medium' | 'large'

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
  totalDatabaseCount: number

  // Infinite scroll state
  offset: number
  hasMore: boolean
  isLoadingMore: boolean
  infiniteScrollPage: number

  // UI Preferences
  gridSize: GridSize
  isSidebarCollapsed: boolean
  useNativeAspectRatio: boolean
  searchQuery: string // NEW: Server-side search query
  sourceFilter: GeneratedImage['source'] | null // NEW: Filter by source module

  // Folder state
  folders: FolderWithCount[]
  currentFolderId: string | null // null = all images, 'uncategorized' = uncategorized
  isFoldersLoading: boolean

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
  setTotalDatabaseCount: (count: number) => void
  removeImage: (imageIdOrUrl: string) => Promise<boolean>
  setFullscreenImage: (image: GeneratedImage | null) => void
  updateImageReference: (imageId: string, reference: string) => Promise<void>
  setGridSize: (size: GridSize) => void
  setIsSidebarCollapsed: (collapsed: boolean) => void
  setUseNativeAspectRatio: (value: boolean) => void
  setSearchQuery: (query: string) => void
  setSourceFilter: (source: GeneratedImage['source'] | null) => void

  // Infinite scroll actions
  appendImages: (images: GeneratedImage[], hasMore: boolean) => void
  loadMoreImages: () => Promise<void>
  resetInfiniteScroll: () => void
  refreshGallery: () => Promise<void>

  // Folder actions
  loadFolders: () => Promise<void>
  createFolder: (input: CreateFolderInput) => Promise<{ success: boolean; error?: string }>
  updateFolder: (id: string, input: UpdateFolderInput) => Promise<{ success: boolean; error?: string }>
  deleteFolder: (id: string) => Promise<{ success: boolean; error?: string }>
  setCurrentFolder: (folderId: string | null) => void
  moveImagesToFolder: (imageIds: string[], folderId: string | null) => Promise<{ success: boolean; error?: string }>
  getUncategorizedCount: () => number

  // Filtering
  getAllReferences: () => string[]
  getImagesByReferences: (references: string[]) => GeneratedImage[]

  // Utilities
  getTotalImages: () => number
  getTotalCreditsUsed: () => number

  // Pending placeholder management
  addPendingPlaceholder: (galleryId: string, prompt: string, model: string, aspectRatio?: string) => void
  updatePendingImage: (galleryId: string, updates: Partial<GeneratedImage>) => void
  removePendingByGalleryId: (galleryId: string) => void

  // Hydration (for SSR compatibility)
  hydrateFromStorage: () => void
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
  pageSize: 50,
  totalDatabaseCount: 0,

  // Infinite scroll state
  offset: 0,
  hasMore: true,
  isLoadingMore: false,
  infiniteScrollPage: 1,

  // UI Preferences - use defaults for SSR, hydrate from localStorage after mount
  gridSize: 'medium',
  isSidebarCollapsed: true, // Default to collapsed
  useNativeAspectRatio: false,
  searchQuery: '',
  sourceFilter: null, // null = all sources

  // Folder state
  folders: [],
  currentFolderId: null,
  isFoldersLoading: false,

  addImage: (imageData) => {
    const newImage: GeneratedImage = {
      ...imageData,
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        creditsUsed: imageData.creditsUsed,
        error: imageData.error
      },
      timestamp: Date.now(), // NEW: Add timestamp for GalleryImage compatibility
      status: imageData.isPermanent ? 'completed' : 'pending', // Set status based on whether image is ready
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
    // Deduplicate images by ID to prevent React key errors
    const uniqueImages = images.filter((image, index, self) =>
      index === self.findIndex(img => img.id === image.id)
    )

    set({
      images: uniqueImages,
      recentImages: uniqueImages.slice(0, 10),
      totalItems: total,
      totalPages: totalPages,
      // Set offset to the number of loaded images for infinite scroll
      offset: uniqueImages.length,
      // hasMore if we loaded less than the total 
      hasMore: uniqueImages.length < total
    })
  },

  setCurrentPage: (page) => {
    set({ currentPage: page })
  },

  setTotalDatabaseCount: (count) => {
    set({ totalDatabaseCount: count })
  },

  removeImage: async (imageIdOrUrl) => {
    // Find the image to get its ID
    const state = useUnifiedGalleryStore.getState()
    const image = state.images.find(img => img.id === imageIdOrUrl || img.url === imageIdOrUrl)

    if (!image) {
      console.warn('Image not found in local state:', imageIdOrUrl)
      return false
    }

    // Always remove from local state immediately (optimistic deletion)
    // This prevents the "deleted image reappears" bug — even if DB delete fails,
    // the user's intent was to remove it and it shouldn't come back
    set((state) => ({
      images: state.images.filter(img =>
        img.id !== imageIdOrUrl && img.url !== imageIdOrUrl
      ),
      selectedImage: state.selectedImage === imageIdOrUrl ? null : state.selectedImage,
      fullscreenImage: (state.fullscreenImage?.id === imageIdOrUrl || state.fullscreenImage?.url === imageIdOrUrl) ? null : state.fullscreenImage,
      recentImages: state.recentImages.filter(img => img.id !== imageIdOrUrl && img.url !== imageIdOrUrl)
    }))

    // Only try to delete from Supabase if the image has a valid database ID (not local-only)
    // and is not in a failed/pending state that was never persisted
    const isLocalOnly = image.id.startsWith('img_') && !image.persistence?.isPermanent

    if (!isLocalOnly) {
      // Delete from Supabase (database and storage)
      const result = await GalleryService.deleteImage(image.id)

      if (!result.success) {
        console.warn('Failed to delete image from Supabase (already removed locally):', result.error)
        // Image is already removed from local state — don't restore it
      }
    }

    return true
  },

  setFullscreenImage: (image) => {
    set({ fullscreenImage: image })
  },

  updateImageReference: async (imageId, reference) => {
    // Handle empty reference (clearing the tag)
    if (!reference || reference.trim() === '') {
      // Update in database to clear reference
      const result = await GalleryService.updateReference(imageId, '')

      if (!result.success) {
        console.error('Failed to clear reference in database:', result.error)
      }

      // Clear from local store AND fullscreen image
      set((state) => ({
        images: state.images.map(img =>
          img.id === imageId
            ? { ...img, reference: undefined }
            : img
        ),
        fullscreenImage: state.fullscreenImage?.id === imageId
          ? { ...state.fullscreenImage, reference: undefined }
          : state.fullscreenImage
      }))
      return
    }

    // Normalize reference (ensure @ prefix)
    const normalizedReference = reference.startsWith('@') ? reference : `@${reference}`

    // Update in database first
    const result = await GalleryService.updateReference(imageId, normalizedReference)

    if (!result.success) {
      console.error('Failed to persist reference to database:', result.error)
      // Continue with local update anyway
    }

    // Update in local store AND fullscreen image
    set((state) => ({
      images: state.images.map(img =>
        img.id === imageId
          ? { ...img, reference: normalizedReference }
          : img
      ),
      fullscreenImage: state.fullscreenImage?.id === imageId
        ? { ...state.fullscreenImage, reference: normalizedReference }
        : state.fullscreenImage
    }))
  },

  setGridSize: (size) => {
    set({ gridSize: size })
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('gallery-grid-size', size)
    }
  },

  setIsSidebarCollapsed: (collapsed) => {
    set({ isSidebarCollapsed: collapsed })
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('gallery-sidebar-collapsed', String(collapsed))
    }
  },

  setUseNativeAspectRatio: (value) => {
    set({ useNativeAspectRatio: value })
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('gallery-native-aspect-ratio', String(value))
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, currentPage: 1, offset: 0, images: [] }) // Reset list on search
    get().refreshGallery()
  },

  setSourceFilter: (source) => {
    set({ sourceFilter: source, currentPage: 1, offset: 0, images: [] }) // Reset list on filter change
    get().refreshGallery()
  },

  getAllReferences: () => {
    const refs = get().images
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

  // Folder actions
  loadFolders: async () => {
    set({ isFoldersLoading: true })
    try {
      const folders = await FolderService.getUserFolders()
      set({ folders, isFoldersLoading: false })
    } catch (error) {
      console.error('Failed to load folders:', error)
      set({ isFoldersLoading: false })
    }
  },

  createFolder: async (input) => {
    const result = await FolderService.createFolder(input)
    if (result.error || !result.data) {
      return { success: false, error: result.error || 'Failed to create folder' }
    }

    // Reload folders to get updated counts
    await get().loadFolders()
    return { success: true }
  },

  updateFolder: async (id, input) => {
    const result = await FolderService.updateFolder(id, input)
    if (result.error) {
      return { success: false, error: result.error }
    }

    // Reload folders to get updated data
    await get().loadFolders()
    return { success: true }
  },

  deleteFolder: async (id) => {
    const result = await FolderService.deleteFolder(id)
    if (result.error) {
      return { success: false, error: result.error }
    }

    // If currently viewing the deleted folder, switch to all images
    const currentFolderId = get().currentFolderId
    if (currentFolderId === id) {
      set({ currentFolderId: null })
    }

    // Reload folders
    await get().loadFolders()
    return { success: true }
  },

  setCurrentFolder: (folderId) => {
    // Reset infinite scroll when changing folders
    get().resetInfiniteScroll()
    set({ currentFolderId: folderId, currentPage: 1 })
  },

  moveImagesToFolder: async (imageIds, folderId) => {
    const result = await FolderService.bulkMoveToFolder(imageIds, folderId)
    if (result.error) {
      return { success: false, error: result.error }
    }

    // Update images in store
    set((state) => ({
      images: state.images.map((img) =>
        imageIds.includes(img.id)
          ? { ...img, folderId, folderName: folderId ? state.folders.find(f => f.id === folderId)?.name : undefined }
          : img
      ),
    }))

    // Reload folders to update counts
    await get().loadFolders()
    return { success: true }
  },

  getUncategorizedCount: () => {
    return get().images.filter((img) => !img.folderId).length
  },

  getTotalImages: () => {
    return get().images.length
  },

  getTotalCreditsUsed: () => {
    return get().images.reduce((total, img) => total + img.metadata.creditsUsed, 0)
  },

  // Infinite scroll actions
  appendImages: (newImages, hasMore) => {
    set((state) => {
      // Get existing IDs for O(1) lookup
      const existingIds = new Set(state.images.map(img => img.id))
      // Only add images that don't already exist
      const uniqueNewImages = newImages.filter(img => !existingIds.has(img.id))

      return {
        images: [...state.images, ...uniqueNewImages],
        // Use newImages.length (not uniqueNewImages) to progress pagination correctly
        offset: state.offset + newImages.length,
        hasMore,
        isLoadingMore: false
      }
    })
  },

  loadMoreImages: async () => {
    const state = get()
    if (state.isLoadingMore || !state.hasMore) return

    set({ isLoadingMore: true })

    try {
      // Import GalleryService dynamically to avoid circular dependency
      const { GalleryService } = await import('../services/gallery.service')

      // Use infiniteScrollPage + 1 for the next page (infiniteScrollPage starts at 1 from initial load)
      const nextPage = state.infiniteScrollPage + 1

      const result = await GalleryService.loadUserGalleryPaginated(
        nextPage,
        state.pageSize,
        state.currentFolderId,
        { searchQuery: state.searchQuery || undefined, sourceFilter: state.sourceFilter || undefined }
      )

      if (result.images.length > 0) {
        // Update infiniteScrollPage for future loads
        set({ infiniteScrollPage: nextPage })

        // Check if there are more images by comparing total loaded vs total in database
        const newOffset = state.offset + result.images.length
        const hasMore = newOffset < state.totalDatabaseCount
        get().appendImages(result.images, hasMore)
      } else {
        set({ hasMore: false, isLoadingMore: false })
      }
    } catch (error) {
      console.error('Failed to load more images:', error)
      set({ isLoadingMore: false })
    }
  },

  resetInfiniteScroll: () => {
    set({
      images: [],
      offset: 0,
      hasMore: true,
      isLoadingMore: false,
      infiniteScrollPage: 1
    })
  },

  refreshGallery: async () => {
    const state = get()

    try {
      // Import GalleryService dynamically to avoid circular dependency
      const { GalleryService } = await import('../services/gallery.service')

      // Preserve pending/processing placeholders — these only exist in local state
      // and would be lost if we replace the array with DB data
      const pendingImages = state.images.filter(
        img => img.status === 'pending' || img.status === 'processing'
      )

      // Fetch fresh data for the current page/folder with optional search query and source filter
      const result = await GalleryService.loadUserGalleryPaginated(
        1, // Always load first page on refresh
        state.pageSize,
        state.currentFolderId,
        { searchQuery: state.searchQuery || undefined, sourceFilter: state.sourceFilter || undefined }
      )

      // Deduplicate images by ID before setting
      const uniqueDbImages = result.images.filter((image, index, self) =>
        index === self.findIndex(img => img.id === image.id)
      )

      // Merge: pending placeholders first, then DB images (excluding any that share an ID with pending)
      const pendingIds = new Set(pendingImages.map(img => img.id))
      const merged = [
        ...pendingImages,
        ...uniqueDbImages.filter(img => !pendingIds.has(img.id))
      ]

      // Update store with fresh data
      set({
        images: merged,
        totalItems: result.total,
        totalPages: result.totalPages,
        offset: uniqueDbImages.length,
        hasMore: uniqueDbImages.length < result.total,
        infiniteScrollPage: 1
      })
    } catch (error) {
      console.error('Failed to refresh gallery:', error)
    }
  },

  // Pending placeholder management
  addPendingPlaceholder: (galleryId, prompt, model, aspectRatio = '16:9') => {
    const pendingImage: GeneratedImage = {
      id: galleryId, // Use the gallery ID so we can update it later
      url: '', // No URL yet
      prompt,
      source: 'shot-creator',
      model,
      settings: {
        aspectRatio,
        resolution: '1024x1024',
        aspect_ratio: aspectRatio,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        creditsUsed: 1,
      },
      timestamp: Date.now(),
      tags: [],
      status: 'pending',
      persistence: {
        isPermanent: false,
      },
    }

    set((state) => ({
      images: [pendingImage, ...state.images],
      recentImages: [pendingImage, ...state.recentImages.slice(0, 9)]
    }))

    console.log('⏳ Gallery: Added pending placeholder', { galleryId, prompt: prompt.slice(0, 50) })
  },

  updatePendingImage: (galleryId, updates) => {
    set((state) => ({
      images: state.images.map(img =>
        img.id === galleryId
          ? { ...img, ...updates }
          : img
      ),
      recentImages: state.recentImages.map(img =>
        img.id === galleryId
          ? { ...img, ...updates }
          : img
      )
    }))
  },

  removePendingByGalleryId: (galleryId) => {
    set((state) => ({
      images: state.images.filter(img => img.id !== galleryId),
      recentImages: state.recentImages.filter(img => img.id !== galleryId)
    }))
  },

  // Hydrate UI preferences from localStorage (call after mount to avoid SSR mismatch)
  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return

    const savedGridSize = localStorage.getItem('gallery-grid-size')
    const savedSidebarCollapsed = localStorage.getItem('gallery-sidebar-collapsed')
    const savedNativeAspectRatio = localStorage.getItem('gallery-native-aspect-ratio')

    set({
      gridSize: (savedGridSize === 'small' || savedGridSize === 'medium' || savedGridSize === 'large')
        ? savedGridSize
        : 'medium',
      isSidebarCollapsed: savedSidebarCollapsed === 'true',
      useNativeAspectRatio: savedNativeAspectRatio === 'true'
    })
  }
}))