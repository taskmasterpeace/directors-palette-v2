/**
 * Reference Selection Service
 * Handles random selection from reference library categories
 */

import { getClient } from '@/lib/db/client'
import type { ReferenceCategory } from '../types/autocomplete.types'
import type { GeneratedImage } from '../store/unified-gallery-store'
import { logger } from '@/lib/logger'

/**
 * Get a random image from a specific category in the reference library
 */
export async function getRandomFromCategory(
  category: ReferenceCategory
): Promise<GeneratedImage | null> {
  try {
    const supabase = await getClient()
    if (!supabase) {
      logger.shotCreator.error('Supabase client not available')
      return null
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.shotCreator.error('User not authenticated')
      return null
    }

    // Query reference library for items in this category
    // Join with gallery table to get the full image data
    const { data, error } = await supabase
      .from('reference')
      .select(`
        id,
        gallery_id,
        category,
        tags,
        gallery:gallery_id (
          id,
          public_url,
          metadata,
          storage_path,
          file_size,
          created_at
        )
      `)
      .eq('category', category)
      .not('gallery.public_url', 'is', null) // Only items with completed images

    if (error) {
      logger.shotCreator.error('Error fetching from category', { error: error })
      return null
    }

    if (!data || data.length === 0) {
      logger.shotCreator.warn('No images found in category', { category })
      return null
    }

    // Pick random item
    const randomIndex = Math.floor(Math.random() * data.length)
    const randomItem = data[randomIndex]

    // Extract gallery data
    const galleryData = randomItem.gallery as Record<string, unknown> | null
    if (!galleryData) {
      logger.shotCreator.error('No gallery data found for reference')
      return null
    }

    // Transform to GeneratedImage format
    const metadata = (galleryData.metadata as Record<string, unknown>) || {}
    const reference = (metadata.reference as string) || undefined

    const image: GeneratedImage = {
      id: galleryData.id as string,
      url: galleryData.public_url as string,
      prompt: (metadata.prompt as string) || '',
      source: 'shot-creator',
      model: (metadata.model as string) || 'nano-banana',
      reference,
      settings: {
        aspectRatio: '16:9',
        resolution: '1024x1024'
      },
      metadata: {
        createdAt: galleryData.created_at as string,
        creditsUsed: 1
      },
      createdAt: galleryData.created_at as string,
      timestamp: new Date(galleryData.created_at as string).getTime(),
      tags: randomItem.tags || [],
      status: 'completed',
      persistence: {
        isPermanent: true,
        storagePath: galleryData.storage_path as string | undefined,
        fileSize: galleryData.file_size as number | undefined,
        downloadedAt: galleryData.created_at as string
      }
    }

    logger.shotCreator.info('🎲 Random selection from [category]', { category, detail: reference || image.id })
    return image
  } catch (error) {
    logger.shotCreator.error('Error in getRandomFromCategory', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * Get multiple random images from a category (without duplicates)
 */
export async function getRandomReferences(
  count: number,
  category?: ReferenceCategory
): Promise<GeneratedImage[]> {
  try {
    const supabase = await getClient()
    if (!supabase) {
      return []
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return []
    }

    // Build query
    let query = supabase
      .from('reference')
      .select(`
        id,
        gallery_id,
        category,
        tags,
        gallery:gallery_id (
          id,
          public_url,
          metadata,
          storage_path,
          file_size,
          created_at
        )
      `)
      .not('gallery.public_url', 'is', null)
      .limit(count * 2) // Get more than needed for randomization

    // Filter by category if specified
    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) {
      return []
    }

    // Shuffle and take requested count
    const shuffled = data.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, data.length))

    // Transform to GeneratedImage format
    const images = selected
      .map(item => {
        const galleryData = item.gallery as Record<string, unknown> | null
        if (!galleryData) return null

        const metadata = (galleryData.metadata as Record<string, unknown>) || {}
        const reference = (metadata.reference as string) || undefined

        return {
          id: galleryData.id as string,
          url: galleryData.public_url as string,
          prompt: (metadata.prompt as string) || '',
          source: 'shot-creator' as const,
          model: (metadata.model as string) || 'nano-banana',
          reference,
          settings: {
            aspectRatio: '16:9',
            resolution: '1024x1024'
          },
          metadata: {
            createdAt: galleryData.created_at as string,
            creditsUsed: 1
          },
          createdAt: galleryData.created_at as string,
          timestamp: new Date(galleryData.created_at as string).getTime(),
          tags: item.tags || [],
          persistence: {
            isPermanent: true,
            storagePath: galleryData.storage_path as string | undefined,
            fileSize: galleryData.file_size as number | undefined,
            downloadedAt: galleryData.created_at as string
          }
        }
      })
      .filter(img => img !== null) as GeneratedImage[]

    return images
  } catch (error) {
    logger.shotCreator.error('Error in getRandomReferences', { error: error instanceof Error ? error.message : String(error) })
    return []
  }
}

/**
 * Get count of images in each category
 */
export async function getCategoryCounts(): Promise<Record<ReferenceCategory, number>> {
  try {
    const supabase = await getClient()
    if (!supabase) {
      return { people: 0, places: 0, props: 0, layouts: 0 }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { people: 0, places: 0, props: 0, layouts: 0 }
    }

    const counts: Record<ReferenceCategory, number> = {
      people: 0,
      places: 0,
      props: 0,
      layouts: 0
    }

    // Get counts for each category
    const categories: ReferenceCategory[] = ['people', 'places', 'props', 'layouts']

    await Promise.all(
      categories.map(async (category) => {
        const { count } = await supabase
          .from('reference')
          .select('*', { count: 'exact', head: true })
          .eq('category', category)

        counts[category] = count || 0
      })
    )

    return counts
  } catch (error) {
    logger.shotCreator.error('Error getting category counts', { error: error instanceof Error ? error.message : String(error) })
    return { people: 0, places: 0, props: 0, layouts: 0 }
  }
}
