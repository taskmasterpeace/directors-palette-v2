/**
 * Image Gallery Service
 * Feature-specific wrapper around the unified GalleryService
 */

import { GalleryService as UnifiedGalleryService } from '@/lib/services/gallery.service'
import type { GeneratedImage } from '../store/unified-gallery-store'
import { GalleryMetadata } from "@/features/generation/services/webhook.service"
import type { GalleryRow } from '@/lib/db/types'

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
                console.log(`📊 Found ${pendingCount} pending images (no public_url yet)`)
            }

            // Transform database records to GeneratedImage format
            const images: GeneratedImage[] = items.map(item => this.transformToGeneratedImage(item))

            return images
        } catch (error) {
            console.error('Failed to load gallery:', error)
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
     */
    static async loadUserGalleryPaginated(
        page: number,
        pageSize: number,
        folderId?: string | null
    ): Promise<{ images: GeneratedImage[]; total: number; totalPages: number }> {
        try {
            const result = await UnifiedGalleryService.loadUserGalleryPaginated('image', page, pageSize, folderId)

            // Filter out items with invalid URLs (null, empty, or not starting with http)
            const validItems = result.items.filter(item => {
                const url = item.public_url
                return url && typeof url === 'string' && url.startsWith('http')
            })

            // Log if we filtered any bad entries
            if (validItems.length < result.items.length) {
                console.warn(`[GalleryService] Filtered out ${result.items.length - validItems.length} items with invalid URLs`)
            }

            // Transform database records to GeneratedImage format
            const images: GeneratedImage[] = validItems.map(item => this.transformToGeneratedImage(item))

            return {
                images,
                total: result.total,
                totalPages: result.totalPages
            }
        } catch (error) {
            console.error('Failed to load gallery:', error)
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

        // Extract folder info (from database row, not metadata)
        const folderId = (item as GalleryRow & { folder_id?: string | null }).folder_id || undefined
        const folderName = undefined // We don't have folder name in the row, will be populated by store if needed

        return {
            id: item.id,
            url: item.public_url || '',
            prompt: metadata.prompt || '',
            source: 'shot-creator' as const,
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
            },
            createdAt: item.created_at,
            timestamp: new Date(item.created_at).getTime(),
            tags: [],
            persistence: {
                isPermanent: true,
                temporaryUrl: metadata.replicate_url,
                storagePath: item.storage_path || undefined,
                fileSize: item.file_size || undefined,
                downloadedAt: item.created_at,
            },
        }
    }
}
