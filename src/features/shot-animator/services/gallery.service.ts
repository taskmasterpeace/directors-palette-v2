/**
 * Video Gallery Service
 * Feature-specific wrapper around the unified GalleryService
 */

import { GalleryService } from '@/lib/services/gallery.service'
import type { GalleryRow } from '@/lib/db/types'
import type { GeneratedVideo } from '../types'
import { logger } from '@/lib/logger'

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
