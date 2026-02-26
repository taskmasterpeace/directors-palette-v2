import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import sharp from 'sharp'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

const STORAGE_BUCKET = 'directors-palette'

// Grid split is FREE (no API call, just server-side image processing)
const GRID_SPLIT_COST_POINTS = 0

// Create Supabase client on demand
function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Grid Split Tool API
 *
 * Takes a 3x3 grid image and splits it into 9 separate images.
 * Uploads each cell to Supabase storage and returns array of URLs.
 *
 * Cost: 0 points (server-side processing only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth
    const supabase = getSupabaseClient()

    const body = await request.json()
    const { imageUrl, rows = 3, cols = 3 } = body

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    logger.api.info('Grid Split: Starting', { rows: rows, cols: cols, detail: imageUrl })

    // Fetch the grid image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: 400 }
      )
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Get image dimensions
    const metadata = await sharp(imageBuffer).metadata()
    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Could not determine image dimensions' },
        { status: 400 }
      )
    }

    const cellWidth = Math.floor(metadata.width / cols)
    const cellHeight = Math.floor(metadata.height / rows)

    logger.api.info('Grid Split: Image', { width: metadata.width, height: metadata.height, cellWidth, cellHeight })

    // Split into cells and upload each
    const imageUrls: string[] = []
    const batchId = generateId()

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellIndex = row * cols + col

        // Extract cell using sharp
        const cellBuffer = await sharp(imageBuffer)
          .extract({
            left: col * cellWidth,
            top: row * cellHeight,
            width: cellWidth,
            height: cellHeight,
          })
          .png()
          .toBuffer()

        // Upload to Supabase storage
        const cellId = `${batchId}_cell_${row}_${col}`
        const storagePath = `generations/${user.id}/grid-split/${cellId}.png`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, cellBuffer, {
            contentType: 'image/png',
            upsert: true,
          })

        if (uploadError) {
          logger.api.error('Grid Split: Upload error for cell', { row: row, col: col, error: uploadError instanceof Error ? uploadError.message : String(uploadError) })
          return NextResponse.json(
            { error: `Failed to upload cell ${cellIndex + 1}` },
            { status: 500 }
          )
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath)

        imageUrls.push(publicUrl)
        logger.api.info('Grid Split: Uploaded cell', { row: row, col: col, publicUrl: publicUrl })
      }
    }

    logger.api.info('Grid Split: Successfully split into', { imageUrls: imageUrls.length })

    return NextResponse.json({
      success: true,
      imageUrls, // Array of 9 URLs (for multi-output)
      imageUrl: imageUrls[0], // First image for backward compat
      cellCount: imageUrls.length,
      rows,
      cols,
      creditsUsed: GRID_SPLIT_COST_POINTS,
    })

  } catch (error) {
    logger.api.error('Grid Split: Error', { error: error instanceof Error ? error.message : String(error) })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    lognog.error('tool_grid_split_failed', {
      error: errorMessage,
      tool: 'grid-split',
    })
    return NextResponse.json(
      {
        error: 'Failed to split grid',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
