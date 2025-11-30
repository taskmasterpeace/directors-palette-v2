import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STORAGE_BUCKET = 'directors-palette'

interface SaveFrameRequest {
  imageData: string // base64 data URL
  metadata: {
    parentId?: string // ID of the parent composite image
    row: number
    col: number
    aspectRatio: string
    width: number
    height: number
  }
}

// Generate a simple unique ID without uuid dependency
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body: SaveFrameRequest = await request.json()
    const { imageData, metadata } = body

    if (!imageData || !imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image data' },
        { status: 400 }
      )
    }

    // Extract base64 data from data URL
    const [header, base64Data] = imageData.split(',')
    const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/png'
    const extension = mimeType.split('/')[1] || 'png'

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64')

    // Generate unique ID for this frame
    const frameId = generateId()
    const predictionId = `frame_${frameId}`

    // Get user ID from auth context
    const userId = auth.user.id

    // Upload to Supabase Storage
    const storagePath = `generations/${userId}/${predictionId}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    // Create gallery entry
    const galleryMetadata = {
      source: 'frame_extractor',
      parentId: metadata.parentId,
      framePosition: { row: metadata.row, col: metadata.col },
      aspectRatio: metadata.aspectRatio,
      extractedAt: new Date().toISOString(),
    }

    const { data: galleryEntry, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: userId,
        prediction_id: predictionId,
        status: 'completed',
        generation_type: 'image',
        public_url: publicUrl,
        storage_path: storagePath,
        file_size: buffer.byteLength,
        mime_type: mimeType,
        metadata: galleryMetadata,
      })
      .select()
      .single()

    if (galleryError) {
      console.error('Gallery insert error:', galleryError)
      // Try to clean up the uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create gallery entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      galleryId: galleryEntry.id,
      publicUrl,
    })

  } catch (error) {
    console.error('Save frame error:', error)
    return NextResponse.json(
      { error: 'Failed to save frame' },
      { status: 500 }
    )
  }
}
