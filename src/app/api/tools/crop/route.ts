import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { StorageService } from '@/features/generation/services/storage.service'
import { logger } from '@/lib/logger'

/**
 * POST /api/tools/crop
 *
 * User-driven crop tool: uploads a canvas-cropped image to Supabase and
 * creates a new gallery row. Free — the user already paid when the original
 * was generated, and cropping is pure re-framing.
 *
 * Body:
 *   - imageDataUrl: string (required) — the cropped image as a data URL (image/png or image/jpeg)
 *   - galleryId: string (required) — the original gallery row ID (inherits folder + prompt metadata)
 *   - cropAspect: string (optional) — aspect label like "16:9" for the prompt prefix
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth

    const body = await request.json()
    const { imageDataUrl, galleryId, cropAspect } = body as {
      imageDataUrl?: string
      galleryId?: string
      cropAspect?: string
    }

    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUrl required (data:image/...)' }, { status: 400 })
    }
    if (!galleryId) {
      return NextResponse.json({ error: 'galleryId required' }, { status: 400 })
    }

    // Decode data URL → buffer + mime type
    const match = imageDataUrl.match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Unsupported image format (png/jpeg/webp only)' }, { status: 400 })
    }
    const mimeType = match[1]
    const ext = match[2] === 'jpeg' ? 'jpg' : match[2]
    const base64 = match[3]
    const buffer = Buffer.from(base64, 'base64')

    // Reject oversized payloads (10MB buffer cap for cropped images — plenty)
    if (buffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Cropped image too large (10MB max)' }, { status: 413 })
    }

    // Look up the original for folder + metadata inheritance
    const { data: originalEntry } = await supabase
      .from('gallery')
      .select('metadata, folder_id')
      .eq('id', galleryId)
      .eq('user_id', user.id) // ensure user owns the source row
      .single()

    if (!originalEntry) {
      return NextResponse.json({ error: 'Original gallery entry not found' }, { status: 404 })
    }

    // Upload to Supabase Storage — reuse predictionId slot with a crop- prefix
    const cropPredictionId = `crop-${Date.now()}-${galleryId.slice(0, 8)}`
    const { publicUrl, storagePath, fileSize } = await StorageService.uploadToStorage(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
      user.id,
      cropPredictionId,
      ext,
      mimeType
    )

    const originalMetadata = (originalEntry.metadata as Record<string, unknown>) || {}
    const originalPrompt = (originalMetadata.prompt as string) || 'Unknown'
    const aspectLabel = cropAspect ? ` ${cropAspect}` : ''

    const { data: newEntry, error: insertError } = await supabase
      .from('gallery')
      .insert({
        user_id: user.id,
        prediction_id: cropPredictionId,
        generation_type: 'image',
        status: 'completed',
        public_url: publicUrl,
        storage_path: storagePath,
        file_size: fileSize,
        mime_type: mimeType,
        folder_id: originalEntry.folder_id || null,
        metadata: {
          ...originalMetadata,
          originalImage: galleryId,
          tool: 'crop',
          cropAspect: cropAspect || null,
          prompt: `[Cropped${aspectLabel}] ${originalPrompt}`,
        },
      })
      .select()
      .single()

    if (insertError) {
      logger.api.error('Crop: failed to insert gallery row', { error: insertError.message })
      return NextResponse.json({ error: 'Failed to save cropped image to gallery' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      galleryId: newEntry?.id,
      imageUrl: publicUrl,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    logger.api.error('Crop tool error', { error: errMsg })
    return NextResponse.json(
      { error: 'Failed to crop image', message: errMsg },
      { status: 500 }
    )
  }
}
