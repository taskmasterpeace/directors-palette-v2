/**
 * Image Gallery Service
 * Feature-specific wrapper around the unified GalleryService
 */

import { GalleryService as UnifiedGalleryService } from '@/lib/services/gallery.service'
import type { GeneratedImage, GenerationStatus } from '../store/unified-gallery-store'
import { GalleryMetadata } from "@/features/generation/services/webhook.service"
import type { GalleryRow } from '@/lib/db/types'
import { logger } from '@/lib/logger'

export class GalleryService {
    /**
     * Load all gallery images for the current user
     */
    static async loadUserGallery(): Promise<GeneratedImage[]> {
        try {
            const items = await UnifiedGalleryService.loadUserGallery('image')

            // Check for pending items
            const pendingCount = await UnifiedGalleryService.getPendingCount('image')
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
        return UnifiedGalleryService.getTotalImageCount('image')
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
            const result = await UnifiedGalleryService.loadUserGalleryPaginated(
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
        return UnifiedGalleryService.deleteItem(imageId)
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
        return UnifiedGalleryService.updateReference(imageId, reference, options)
    }

    /**
     * Transform database row to GeneratedImage
     */
    private static transformToGeneratedImage(item: GalleryRow): GeneratedImage {
        const metadata = item.metadata as GalleryMetadata || {}
        const modelSettings = (metadata as { modelSettings?: Record<string, unknown> }).modelSettings || {}
        const model = (metadata.model as string) || 'nano-banana'
        const aspectRatio = (modelSettings.aspectRatio as string) ||
            (modelSettings.aspect_ratio as string) ||
            '16:9'
        const resolution = (modelSettings.resolution as string) ||
            (modelSettings.size as string) ||
            '1024x1024'
        const seed = (modelSettings.seed as number) || undefined
        const customWidth = (modelSettings.width as number) ||
            (modelSettings.custom_width as number) ||
            undefined
        const customHeight = (modelSettings.height as number) ||
            (modelSettings.custom_height as number) ||
            undefined

        // Extract reference from metadata if it exists
        const reference = (metadata as { reference?: string }).reference || undefined

        // Extract source from metadata, default to 'shot-creator'
        const validSources = ['shot-creator', 'shot-animator', 'layout-annotation', 'adhub', 'storybook', 'storyboard'] as const
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
