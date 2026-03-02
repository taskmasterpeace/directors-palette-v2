/**
 * Shared helper: persist a Replicate image to Supabase storage + reference library.
 * Downloads the image, uploads to our storage, creates a gallery row,
 * then creates a reference entry tagged with the artist name.
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

const STORAGE_BUCKET = 'directors-palette'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PersistResult {
  publicUrl: string
  galleryId: string
}

/**
 * Download an image from Replicate, upload to Supabase storage,
 * create a gallery entry, and add to the reference library.
 */
export async function persistToLibrary(opts: {
  imageUrl: string
  userId: string
  artistName: string
  type: 'character-sheet' | 'portrait' | 'photo-shoot'
  aspectRatio: string
  prompt?: string
  addToReferenceLibrary?: boolean
}): Promise<PersistResult | null> {
  const supabase = getSupabaseClient()

  try {
    // 1. Download image from Replicate
    const response = await fetch(opts.imageUrl)
    if (!response.ok) {
      logger.api.error('Failed to download image from Replicate', { status: response.status })
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    const extension = mimeType.includes('png') ? 'png' : 'jpg'

    // 2. Upload to Supabase storage
    const fileId = `${opts.type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const storagePath = `generations/${opts.userId}/${fileId}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true })

    if (uploadError) {
      logger.api.error('Storage upload error', { error: uploadError.message })
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    // 3. Create gallery entry
    const { data: galleryEntry, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: opts.userId,
        prediction_id: fileId,
        status: 'completed',
        generation_type: 'image',
        public_url: publicUrl,
        storage_path: storagePath,
        file_size: buffer.byteLength,
        mime_type: mimeType,
        metadata: {
          source: 'artist-dna',
          type: opts.type,
          artistName: opts.artistName,
          aspectRatio: opts.aspectRatio,
          prompt: opts.prompt,
          createdAt: new Date().toISOString(),
        },
      })
      .select('id')
      .single()

    if (galleryError) {
      logger.api.error('Gallery insert error', { error: galleryError.message })
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      return null
    }

    // 4. Optionally create reference entry — tagged with artist name so recipes can @ArtistName
    if (opts.addToReferenceLibrary !== false) {
      const tags = [
        opts.artistName.toLowerCase().replace(/\s+/g, '-'),
        opts.type,
        'identity',
      ]

      const { error: refError } = await supabase
        .from('reference')
        .insert({
          gallery_id: galleryEntry.id,
          category: 'people',
          tags,
        })

      if (refError) {
        logger.api.error('Reference insert error', { error: refError.message })
        // Non-fatal — gallery entry still exists
      }
    }

    return { publicUrl, galleryId: galleryEntry.id }
  } catch (error) {
    logger.api.error('persistToLibrary error', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
