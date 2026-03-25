/**
 * Unified Gallery Service
 * Handles CRUD operations for all gallery items (images and videos)
 * Also includes feature-specific wrappers: ImageGalleryService, VideoGalleryService
 */

import { getClient } from '@/lib/db/client'
import { GalleryRepository } from '@/lib/db/repositories/gallery.repository'
import type { GalleryRow } from '@/lib/db/types'
import type { Json as _Json } from '@/lib/db/types'
import { logger } from '@/lib/logger'
import type { GalleryMetadata } from '@/features/generation/services/webhook.service'
import type { GeneratedImage, GenerationStatus } from '@/features/shot-creator/store/unified-gallery-store'
import type { GeneratedVideo } from '@/features/shot-animator/types'

export type GenerationType = 'image' | 'video'

interface DeleteResult {
  success: boolean
  error?: string
}

export class GalleryService {
  /**
   * Load gallery items for the current user
   */
  static async loadUserGallery(
    generationType: GenerationType,
    options?: {
      includeProcessing?: boolean
    }
  ): Promise<GalleryRow[]> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        logger.gallery.warn('User not authenticated, cannot load gallery')
        return []
      }

      const repository = new GalleryRepository(supabase)

      // Get items for the current user with specified generation_type
      const result = await repository.get({
        user_id: user.id,
        generation_type: generationType,
      })

      if (result.error) {
        logger.gallery.error(`Error fetching ${generationType} gallery`, { generationType, error: result.error })
        return []
      }

      // Filter by public_url if not including processing items
      let items = result.data
      if (!options?.includeProcessing) {
        items = items.filter(item => item.public_url !== null)
      }

      // Sort by created_at descending
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return items
    } catch (error) {
      logger.gallery.error(`Failed to load ${generationType} gallery`, { generationType, error: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  /**
   * Get total count of gallery items for the current user
   */
  static async getTotalImageCount(generationType: GenerationType): Promise<number> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        logger.gallery.warn('User not authenticated, cannot count gallery items')
        return 0
      }

      const { count, error } = await supabase
        .from('gallery')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generation_type', generationType)
        .not('public_url', 'is', null)

      if (error) {
        logger.gallery.error(`Error counting ${generationType} gallery items`, { generationType, error })
        return 0
      }

      return count || 0
    } catch (error) {
      logger.gallery.error(`Failed to count ${generationType} gallery items`, { generationType, error: error instanceof Error ? error.message : String(error) })
      return 0
    }
  }

  /**
   * Load gallery items with pagination and optional folder filtering
   */
  static async loadUserGalleryPaginated(
    generationType: GenerationType,
    page: number,
    pageSize: number,
    folderId?: string | null,
    options?: {
      includeProcessing?: boolean;
      searchQuery?: string;
      sourceFilter?: string;
      metadataTypeFilter?: string;
    }
  ): Promise<{ items: GalleryRow[]; total: number; totalPages: number }> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        logger.gallery.error('Authentication error', { authError: authError })
        throw new Error(`Authentication failed: ${authError.message}`)
      }
      if (!user) {
        logger.gallery.warn('User not authenticated, cannot load gallery')
        return { items: [], total: 0, totalPages: 0 }
      }

      const repository = new GalleryRepository(supabase)

      // Build filters
      const filters: Record<string, unknown> = {
        user_id: user.id,
        generation_type: generationType,
      }

      // Add folder filter if provided (and not searching, unless we want to search within folders)
      // Note: folderId can be null for uncategorized, string for specific folder, or undefined for all
      if (folderId !== undefined) {
        filters.folder_id = folderId
      }

      // If not including processing, we normally filter by public_url not null.
      // However, Supabase doesn't support 'not null' in the simple filters object easily for our repository pattern
      // without modifying it.
      // But we can filter post-fetch if needed, OR relies on the fact that pending items usually
      // don't have public_url.
      // For now, let's just get the data and if includeProcessing is false, we filter post-fetch
      // unless we improve the repository to handle specific "not null" conditions.

      const result = await repository.getPaginated(filters, {
        page,
        pageSize,
        orderBy: 'created_at',
        ascending: false,
        searchQuery: options?.searchQuery,
        sourceFilter: options?.sourceFilter,
        metadataTypeFilter: options?.metadataTypeFilter,
      })

      if (result.error) {
        logger.gallery.error(`Error fetching ${generationType} gallery`, { generationType, error: result.error })
        throw new Error(`Database query failed: ${result.error}`)
      }

      let items = result.data

      // If not including processing, filter out items without public_url
      // Note: This reduces the page size, which is not ideal for pagination,
      // but it's a safe fallback if we don't custom query.
      if (!options?.includeProcessing) {
        items = items.filter(item => item.public_url !== null)
      }

      return {
        items,
        total: result.total,
        totalPages: result.totalPages,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.gallery.error(`Failed to load ${generationType} gallery`, { generationType, errorMessage, error: error instanceof Error ? error.message : String(error) })
      if (errorMessage.includes('Failed to fetch')) {
        logger.gallery.error('Network error detected. Possible causes: Supabase credentials missing/invalid, network connectivity issues')
      }
      return { items: [], total: 0, totalPages: 0 }
    }
  }



  /**
   * Delete a gallery item (database entry and storage file)
   */
  static async deleteItem(itemId: string): Promise<DeleteResult> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      const repository = new GalleryRepository(supabase)

      // Get the gallery entry to verify ownership and get storage path
      const getResult = await repository.get({
        id: itemId,
        user_id: user.id,
      })

      if (getResult.error || getResult.data.length === 0) {
        throw new Error('Gallery item not found or access denied')
      }

      const galleryItem = getResult.data[0]

      // Delete associated references first to avoid foreign key constraints
      // We use the raw supabase client here for efficiency to delete all matches at once
      // instead of fetching and deleting one by one via repository
      const { error: refDeleteError } = await supabase
        .from('reference')
        .delete()
        .eq('gallery_id', itemId)

      if (refDeleteError) {
        logger.gallery.warn('Error deleting associated references', { refDeleteError: refDeleteError })
        // Proceed anyway, as they might not exist or it might be a non-blocking error
      }

      // Delete from storage if storage_path exists
      if (galleryItem.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('directors-palette')
          .remove([galleryItem.storage_path])

        if (storageError) {
          logger.gallery.error('Error deleting from storage', { storageError: storageError })
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Delete from database
      const deleteResult = await repository.delete(itemId)

      if (deleteResult.error) {
        throw new Error(deleteResult.error)
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete item'
      logger.gallery.error('Delete gallery item error', { error: error instanceof Error ? error.message : String(error) })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get a single gallery item by ID
   */
  static async getItemById(
    itemId: string,
    generationType?: GenerationType
  ): Promise<GalleryRow | null> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return null
      }

      const repository = new GalleryRepository(supabase)
      const filters: Record<string, unknown> = {
        id: itemId,
        user_id: user.id,
      }

      if (generationType) {
        filters.generation_type = generationType
      }

      const result = await repository.get(filters)

      if (result.error || result.data.length === 0) {
        return null
      }

      return result.data[0]
    } catch (error) {
      logger.gallery.error('Failed to get gallery item by ID', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Update reference tag for a gallery item
   * Also adds/updates the item in the reference library
   */
  static async updateReference(
    itemId: string,
    reference: string | null,
    options?: {
      category?: 'people' | 'places' | 'props' | 'layouts'
      addToLibrary?: boolean
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      const repository = new GalleryRepository(supabase)

      // Get the gallery entry to verify ownership
      const getResult = await repository.get({
        id: itemId,
        user_id: user.id,
      })

      if (getResult.error || getResult.data.length === 0) {
        throw new Error('Gallery item not found or access denied')
      }

      const galleryItem = getResult.data[0]
      const metadata = (galleryItem.metadata as Record<string, unknown>) || {}

      // Update metadata with reference
      const updatedMetadata = {
        ...metadata,
        reference: reference
      }

      // Update in database
      const updateResult = await repository.update(itemId, {
        metadata: updatedMetadata as unknown as Record<string, never>
      })

      if (updateResult.error) {
        throw new Error(updateResult.error)
      }

      // Add to reference library if reference is set and addToLibrary is true (default)
      const shouldAddToLibrary = options?.addToLibrary !== false
      if (reference && shouldAddToLibrary) {
        // Check if already in reference library
        const { data: existingRef } = await supabase
          .from('reference')
          .select('id')
          .eq('gallery_id', itemId)
          .maybeSingle()

        const category = options?.category || 'people' // Default to 'people' category
        const tags = [reference.replace('@', '')] // Use reference name as tag

        if (existingRef) {
          // Update existing reference entry
          await supabase
            .from('reference')
            .update({
              category,
              tags,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRef.id)
        } else {
          // Create new reference entry
          await supabase
            .from('reference')
            .insert({
              gallery_id: itemId,
              category,
              tags
            })
        }
      } else if (!reference) {
        // If reference is removed, optionally remove from library
        await supabase
          .from('reference')
          .delete()
          .eq('gallery_id', itemId)
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reference'
      logger.gallery.error('Update reference error', { error: error instanceof Error ? error.message : String(error) })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get count of pending items (no public_url yet)
   */
  static async getPendingCount(generationType: GenerationType): Promise<number> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        return 0
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return 0
      }

      const { data, error } = await supabase
        .from('gallery')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generation_type', generationType)
        .is('public_url', null)

      if (error) {
        logger.gallery.error('Error getting pending count', { error: error })
        return 0
      }

      return data?.length || 0
    } catch (error) {
      logger.gallery.error('Failed to get pending count', { error: error instanceof Error ? error.message : String(error) })
      return 0
    }
  }

}

/**
 * Image Gallery Service
 * Feature-specific wrapper around the unified GalleryService for shot-creator images
 */
export class ImageGalleryService {
  /**
   * Load all gallery images for the current user
   */
  static async loadUserGallery(): Promise<GeneratedImage[]> {
    try {
      const items = await GalleryService.loadUserGallery('image')

      // Check for pending items
      const pendingCount = await GalleryService.getPendingCount('image')
      if (pendingCount > 0) {
        logger.shotCreator.info('Found pending images', { count: pendingCount })
      }

      // Transform database records to GeneratedImage format
      const images: GeneratedImage[] = items.map(item => this.transformToGeneratedImage(item))

      return images
    } catch (error) {
      logger.shotCreator.error('Failed to load gallery', { error: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  /**
   * Get total count of images in database for current user
   */
  static async getTotalImageCount(): Promise<number> {
    return GalleryService.getTotalImageCount('image')
  }

  /**
   * Load gallery images with pagination and optional folder filtering
   * Now includes pending and failed items to show loading/error states
   */
  static async loadUserGalleryPaginated(
    page: number,
    pageSize: number,
    folderId?: string | null,
    options?: { includeProcessing?: boolean; searchQuery?: string; sourceFilter?: string; metadataTypeFilter?: string }
  ): Promise<{ images: GeneratedImage[]; total: number; totalPages: number }> {
    try {
      // Include processing items to show loading states
      const result = await GalleryService.loadUserGalleryPaginated(
        'image',
        page,
        pageSize,
        folderId,
        {
          includeProcessing: options?.includeProcessing ?? true,
          searchQuery: options?.searchQuery,
          sourceFilter: options?.sourceFilter,
          metadataTypeFilter: options?.metadataTypeFilter,
        }
      )

      // Filter items: show completed + recent pending, exclude failed.
      // Failed gallery records are now deleted by the webhook, but filter
      // here as a safety net for any legacy failed records still in the DB.
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000
      const validItems = result.items.filter(item => {
        // Always include completed items with valid URLs
        if (item.status === 'completed' && item.public_url) {
          return true
        }
        // Include pending/processing items that are recent
        if (item.status === 'pending' || item.status === 'processing') {
          const createdAt = new Date(item.created_at).getTime()
          return createdAt > tenMinutesAgo
        }
        // Exclude failed items — they have no image and clutter the gallery
        return false
      })

      // Transform database records to GeneratedImage format
      const images: GeneratedImage[] = validItems.map(item => this.transformToGeneratedImage(item))

      return {
        images,
        total: result.total,
        totalPages: result.totalPages
      }
    } catch (error) {
      logger.shotCreator.error('Failed to load gallery', { error: error instanceof Error ? error.message : String(error) })
      return { images: [], total: 0, totalPages: 0 }
    }
  }

  /**
   * Delete a gallery image (database entry and storage file)
   */
  static async deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    return GalleryService.deleteItem(imageId)
  }

  /**
   * Update reference tag for a gallery image
   * Also adds/updates the item in the reference library
   */
  static async updateReference(
    imageId: string,
    reference: string | null,
    options?: {
      category?: 'people' | 'places' | 'props' | 'layouts'
      addToLibrary?: boolean
    }
  ): Promise<{ success: boolean; error?: string }> {
    return GalleryService.updateReference(imageId, reference, options)
  }

  /**
   * Transform database row to GeneratedImage
   */
  static transformToGeneratedImage(item: GalleryRow): GeneratedImage {
    const metadata = item.metadata as GalleryMetadata || {}
    const modelSettings = (metadata as { modelSettings?: Record<string, unknown> }).modelSettings || {}
    const model = (metadata.model as string) || 'nano-banana-2'
    const aspectRatio = (modelSettings.aspectRatio as string) ||
      (modelSettings.aspect_ratio as string) ||
      '16:9'
    const resolution = (modelSettings.resolution as string) ||
      (modelSettings.size as string) ||
      '1024x1024'
    const seed = (modelSettings.seed as number) || (metadata as { fal_seed?: number }).fal_seed || undefined
    const customWidth = (modelSettings.width as number) ||
      (modelSettings.custom_width as number) ||
      undefined
    const customHeight = (modelSettings.height as number) ||
      (modelSettings.custom_height as number) ||
      undefined

    // Extract reference from metadata if it exists
    const reference = (metadata as { reference?: string }).reference || undefined

    // Extract source from metadata, default to 'shot-creator'
    const validSources = ['shot-creator', 'shot-animator', 'layout-annotation', 'storybook', 'storyboard', 'artist-dna'] as const
    type ValidSource = typeof validSources[number]
    const rawSource = (metadata as { source?: string }).source
    const source: ValidSource = rawSource && validSources.includes(rawSource as ValidSource)
      ? (rawSource as ValidSource)
      : 'shot-creator'

    // Extract folder info (from database row, not metadata)
    const folderId = (item as GalleryRow & { folder_id?: string | null }).folder_id || undefined
    const folderName = undefined // We don't have folder name in the row, will be populated by store if needed

    // Map database status to GenerationStatus
    const dbStatus = item.status as string
    let status: GenerationStatus = 'completed'
    if (dbStatus === 'pending' || dbStatus === 'processing') {
      status = 'pending'
    } else if (dbStatus === 'failed') {
      status = 'failed'
    } else if (dbStatus === 'completed' && item.public_url) {
      status = 'completed'
    }

    // Extract error message from metadata if generation failed
    const errorMessage = (metadata as { error?: string }).error || undefined

    // Extract grid metadata for Extract Cells feature
    const isGrid = (metadata as { isGrid?: boolean }).isGrid || undefined
    const gridType = (metadata as { gridType?: 'angles' | 'broll' }).gridType || undefined

    // Extract LoRA metadata — build combined name+scale string for multi-LoRA display
    const loraScalesArr = modelSettings.loraScales as number[] | undefined
    const loraScale = (modelSettings.loraScale as number) || (loraScalesArr?.[0]) || undefined
    const rawLoraName = (modelSettings.loraName as string) || undefined
    // For multi-LoRA, embed individual scales into the name (e.g., "Nava 0.8x + Pixar 1.2x")
    let loraName = rawLoraName
    if (rawLoraName && loraScalesArr && loraScalesArr.length > 1 && rawLoraName.includes(' + ')) {
      const names = rawLoraName.split(' + ')
      loraName = names.map((n, i) => `${n} ${loraScalesArr[i] ?? 1.0}x`).join(' + ')
    }

    // Extract img2img strength
    const img2imgStrength = (modelSettings.img2imgStrength as number) || undefined

    return {
      id: item.id,
      url: item.public_url || '',
      prompt: metadata.prompt || '',
      source,
      model,
      reference,
      folderId,
      folderName,
      settings: {
        aspectRatio,
        resolution,
        seed,
        custom_width: customWidth,
        custom_height: customHeight,
        aspect_ratio: aspectRatio,
        loraName,
        loraScale,
        img2imgStrength,
      },
      metadata: {
        createdAt: item.created_at,
        creditsUsed: 1,
        error: errorMessage,
        isGrid,
        gridType,
      },
      createdAt: item.created_at,
      timestamp: new Date(item.created_at).getTime(),
      tags: [],
      status,
      persistence: {
        isPermanent: status === 'completed',
        temporaryUrl: metadata.replicate_url,
        storagePath: item.storage_path || undefined,
        fileSize: item.file_size || undefined,
        downloadedAt: item.created_at,
        error: errorMessage,
      },
    }
  }
}

/**
 * Video Gallery Service
 * Feature-specific wrapper around the unified GalleryService for shot-animator videos
 */
export class VideoGalleryService {
  /**
   * Load all video gallery items for the current user
   */
  static async loadUserVideos(): Promise<GeneratedVideo[]> {
    try {
      const items = await GalleryService.loadUserGallery('video')

      // Transform database records to GeneratedVideo format
      const videos: GeneratedVideo[] = items
        .map((item) => this.transformToGeneratedVideo(item))
        .filter((video): video is GeneratedVideo => video !== null)

      return videos
    } catch (error) {
      logger.shotCreator.error('Failed to load video gallery', { error: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  /**
   * Load video gallery items with pagination
   */
  static async loadUserVideosPaginated(
    page: number,
    pageSize: number
  ): Promise<{ videos: GeneratedVideo[]; total: number; totalPages: number }> {
    try {
      const result = await GalleryService.loadUserGalleryPaginated('video', page, pageSize)

      // Transform database records to GeneratedVideo format
      const videos: GeneratedVideo[] = result.items
        .map((item) => this.transformToGeneratedVideo(item))
        .filter((video): video is GeneratedVideo => video !== null)

      return {
        videos,
        total: result.total,
        totalPages: result.totalPages,
      }
    } catch (error) {
      logger.shotCreator.error('Failed to load paginated video gallery', { error: error instanceof Error ? error.message : String(error) })
      return { videos: [], total: 0, totalPages: 0 }
    }
  }

  /**
   * Load all image gallery items for the current user
   */
  static async loadUserImages() {
    try {
      const items = await GalleryService.loadUserGallery('image')
      return items
    } catch (error) {
      logger.shotCreator.error('Failed to load image gallery', { error: error instanceof Error ? error.message : String(error) })
      return []
    }
  }

  /**
   * Load image gallery items with pagination
   */
  static async loadUserImagesPaginated(
    page: number,
    pageSize: number
  ): Promise<{ items: GalleryRow[]; total: number; totalPages: number }> {
    try {
      return await GalleryService.loadUserGalleryPaginated('image', page, pageSize)
    } catch (error) {
      logger.shotCreator.error('Failed to load paginated image gallery', { error: error instanceof Error ? error.message : String(error) })
      return { items: [], total: 0, totalPages: 0 }
    }
  }

  /**
   * Delete a video from the gallery
   */
  static async deleteVideo(videoId: string): Promise<{ success: boolean; error?: string }> {
    return GalleryService.deleteItem(videoId)
  }

  /**
   * Transform database row to GeneratedVideo
   */
  private static transformToGeneratedVideo(item: GalleryRow): GeneratedVideo | null {
    try {
      const metadata = (item.metadata as Record<string, unknown>) || {}

      // Only return videos that have a public URL (completed)
      if (!item.public_url) {
        return null
      }

      return {
        id: item.id,
        videoUrl: item.public_url,
        thumbnailUrl: undefined, // Can be added later if thumbnails are generated
        shotName: (metadata.prompt as string) || 'Untitled Video',
        model: (metadata.model as string) || 'unknown',
        createdAt: new Date(item.created_at),
        status: item.status === 'completed' ? 'completed' :
          item.status === 'failed' ? 'failed' : 'processing',
        progress: undefined,
      }
    } catch (error) {
      logger.shotCreator.error('Error transforming gallery item', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Get a single video by ID
   */
  static async getVideoById(videoId: string): Promise<GeneratedVideo | null> {
    try {
      const item = await GalleryService.getItemById(videoId, 'video')

      if (!item) {
        return null
      }

      return this.transformToGeneratedVideo(item)
    } catch (error) {
      logger.shotCreator.error('Failed to get video by ID', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }
}
