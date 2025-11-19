/**
 * Unified Gallery Service
 * Handles CRUD operations for all gallery items (images and videos)
 */

import { getClient } from '@/lib/db/client'
import { GalleryRepository } from '@/lib/db/repositories/gallery.repository'
import type { GalleryRow } from '@/lib/db/types'

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
        console.warn('User not authenticated, cannot load gallery')
        return []
      }

      const repository = new GalleryRepository(supabase)

      // Get items for the current user with specified generation_type
      const result = await repository.get({
        user_id: user.id,
        generation_type: generationType,
      })

      if (result.error) {
        console.error(`Error fetching ${generationType} gallery:`, result.error)
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
      console.error(`Failed to load ${generationType} gallery:`, error)
      return []
    }
  }

  /**
   * Load gallery items with pagination
   */
  static async loadUserGalleryPaginated(
    generationType: GenerationType,
    page: number,
    pageSize: number,
    options?: {
      includeProcessing?: boolean
    }
  ): Promise<{ items: GalleryRow[]; total: number; totalPages: number }> {
    try {
      const supabase = await getClient()
      if (!supabase) {
        throw new Error('Supabase client not available')
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Authentication error:', authError)
        throw new Error(`Authentication failed: ${authError.message}`)
      }
      if (!user) {
        console.warn('User not authenticated, cannot load gallery')
        return { items: [], total: 0, totalPages: 0 }
      }

      const repository = new GalleryRepository(supabase)

      // Build filters
      const filters: Record<string, unknown> = {
        user_id: user.id,
        generation_type: generationType,
      }

      // If not including processing, filter by public_url not null
      if (!options?.includeProcessing) {
        // Note: Supabase doesn't support 'not null' in filters object
        // We'll handle this with a custom query
        const result = await repository.getPaginated(filters, {
          page,
          pageSize,
          orderBy: 'created_at',
          ascending: false,
        })

        if (result.error) {
          console.error(`Error fetching ${generationType} gallery:`, result.error)
          throw new Error(`Database query failed: ${result.error}`)
        }

        // Filter out items without public_url
        const filteredItems = result.data.filter(item => item.public_url !== null)

        return {
          items: filteredItems,
          total: result.total,
          totalPages: result.totalPages,
        }
      }

      const result = await repository.getPaginated(filters, {
        page,
        pageSize,
        orderBy: 'created_at',
        ascending: false,
      })

      if (result.error) {
        console.error(`Error fetching ${generationType} gallery:`, result.error)
        throw new Error(`Database query failed: ${result.error}`)
      }

      return {
        items: result.data,
        total: result.total,
        totalPages: result.totalPages,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to load ${generationType} gallery:`, errorMessage, error)
      if (errorMessage.includes('Failed to fetch')) {
        console.error('Network error detected. Possible causes:')
        console.error('1. Supabase credentials missing or invalid')
        console.error('2. Network connectivity issues')
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
        console.warn('Error deleting associated references:', refDeleteError)
        // Proceed anyway, as they might not exist or it might be a non-blocking error
      }

      // Delete from storage if storage_path exists
      if (galleryItem.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('directors-palette')
          .remove([galleryItem.storage_path])

        if (storageError) {
          console.error('Error deleting from storage:', storageError)
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
      console.error('Delete gallery item error:', error)
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
      console.error('Failed to get gallery item by ID:', error)
      return null
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
        console.error('Error getting pending count:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Failed to get pending count:', error)
      return 0
    }
  }

  /**
   * Update the reference tag for a gallery item
   */
  static async updateReference(
    itemId: string,
    reference: string
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

      // Get the current gallery item to read its metadata
      const getResult = await repository.get({
        id: itemId,
        user_id: user.id,
      })

      if (getResult.error || getResult.data.length === 0) {
        throw new Error('Gallery item not found or access denied')
      }

      const galleryItem = getResult.data[0]
      const currentMetadata = (galleryItem.metadata as Record<string, unknown>) || {}

      // Update metadata with the new reference
      const updatedMetadata = {
        ...currentMetadata,
        reference: reference.startsWith('@') ? reference : `@${reference}`
      }

      // Update the gallery item
      const updateResult = await repository.update(itemId, {
        metadata: updatedMetadata as unknown as Json
      })

      if (updateResult.error) {
        throw new Error(updateResult.error)
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update reference'
      console.error('Update reference error:', error)
      return { success: false, error: errorMessage }
    }
  }
}
