import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

const STORAGE_BUCKET = 'directors-palette'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VALID_CATEGORIES = ['people', 'places', 'props', 'layouts', 'styles'] as const

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/v2/images/upload — Upload an image to gallery, optionally tag as @reference
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string) || undefined
    const referenceTag = formData.get('reference_tag') as string | null
    const referenceCategory = (formData.get('reference_category') as string) || 'people'

    // Validate file exists
    if (!file) {
      return errors.validation('file is required')
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errors.validation(`Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP`)
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errors.validation(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 50MB`)
    }

    // Validate category if reference_tag provided
    if (referenceTag && !VALID_CATEGORIES.includes(referenceCategory as typeof VALID_CATEGORIES[number])) {
      return errors.validation(`reference_category must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Detect dimensions using minimal header parsing
    const dimensions = getImageDimensions(buffer, file.type)
    if (dimensions) {
      if (dimensions.width < 256 || dimensions.height < 256) {
        return errors.validation(`Image too small (${dimensions.width}x${dimensions.height}). Minimum: 256x256`)
      }
    }

    // Determine extension
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const ext = extMap[file.type] || 'jpg'

    const uploadId = randomUUID()
    const storagePath = `generations/${auth.userId}/upload_${uploadId}.${ext}`
    const supabase = getSupabase()

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: 'public, max-age=31536000, immutable',
      })

    if (uploadError) {
      return errors.internal(`Storage upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    // Insert into gallery
    const galleryId = randomUUID()
    const displayName = name || file.name || `upload_${uploadId}`
    const width = dimensions?.width || null
    const height = dimensions?.height || null
    const aspectRatio = width && height ? detectAspectRatio(width, height) : null

    const metadata: Record<string, unknown> = {
      source: 'upload',
      original_filename: file.name,
      ...(width && { width }),
      ...(height && { height }),
      ...(aspectRatio && { aspect_ratio: aspectRatio }),
    }

    // Apply reference tag to metadata if provided
    let normalizedRef: string | null = null
    if (referenceTag) {
      normalizedRef = referenceTag.startsWith('@') ? referenceTag : `@${referenceTag}`
      metadata.reference = normalizedRef
    }

    const { error: insertError } = await supabase.from('gallery').insert({
      id: galleryId,
      user_id: auth.userId,
      prediction_id: `upload_${uploadId}`,
      generation_type: 'image',
      status: 'completed',
      public_url: publicUrl,
      mime_type: file.type,
      metadata,
    })

    if (insertError) {
      return errors.internal(`Gallery insert failed: ${insertError.message}`)
    }

    // If reference tag provided, also insert into reference table
    if (normalizedRef) {
      const tagName = normalizedRef.replace(/^@/, '')
      await supabase.from('reference').insert({
        id: randomUUID(),
        gallery_id: galleryId,
        category: referenceCategory,
        tags: [tagName],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/v2/images/upload',
      method: 'POST',
      statusCode: 201,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({
      id: galleryId,
      url: publicUrl,
      name: displayName,
      type: 'image',
      source: 'upload',
      reference: normalizedRef,
      reference_category: normalizedRef ? referenceCategory : null,
      width,
      height,
      aspect_ratio: aspectRatio,
      file_size_bytes: file.size,
      created_at: new Date().toISOString(),
    }, 201)
  } catch (_err) {
    return errors.internal()
  }
}

/**
 * Parse image dimensions from buffer headers (JPEG, PNG, WebP)
 */
function getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  try {
    if (mimeType === 'image/png' && buffer.length >= 24) {
      // PNG: width at offset 16, height at offset 20 (big-endian uint32)
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    }

    if (mimeType === 'image/webp' && buffer.length >= 30) {
      // WebP VP8: check for RIFF header
      const riff = buffer.toString('ascii', 0, 4)
      if (riff === 'RIFF') {
        const webpType = buffer.toString('ascii', 8, 12)
        if (webpType === 'WEBP') {
          const chunkType = buffer.toString('ascii', 12, 16)
          if (chunkType === 'VP8 ' && buffer.length >= 30) {
            // Lossy VP8
            return {
              width: buffer.readUInt16LE(26) & 0x3FFF,
              height: buffer.readUInt16LE(28) & 0x3FFF,
            }
          }
          if (chunkType === 'VP8L' && buffer.length >= 25) {
            // Lossless VP8L
            const bits = buffer.readUInt32LE(21)
            return {
              width: (bits & 0x3FFF) + 1,
              height: ((bits >> 14) & 0x3FFF) + 1,
            }
          }
        }
      }
    }

    if (mimeType === 'image/jpeg' && buffer.length >= 2) {
      // JPEG: scan markers by reading segment lengths to skip payloads
      let offset = 2
      while (offset + 1 < buffer.length) {
        // Skip any padding 0xFF bytes
        while (offset < buffer.length && buffer[offset] === 0xFF) offset++
        if (offset >= buffer.length) break

        const marker = buffer[offset]
        offset++ // move past marker byte

        // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF (excludes C4=DHT, C8=JPG, CC=DAC)
        if (
          (marker >= 0xC0 && marker <= 0xC3) ||
          (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) ||
          (marker >= 0xCD && marker <= 0xCF)
        ) {
          if (offset + 7 < buffer.length) {
            const h = buffer.readUInt16BE(offset + 3)
            const w = buffer.readUInt16BE(offset + 5)
            // Sanity check: real images are within reasonable bounds
            if (w > 0 && w <= 65535 && h > 0 && h <= 65535) {
              return { width: w, height: h }
            }
          }
          break
        }

        // SOS (0xDA) — start of scan, no more structured markers
        if (marker === 0xDA) break
        // Standalone markers (no payload): RST0-RST7, SOI, EOI, TEM
        if ((marker >= 0xD0 && marker <= 0xD9) || marker === 0x01) continue

        // All other markers have a 2-byte length field — skip the segment
        if (offset + 1 < buffer.length) {
          const segLen = buffer.readUInt16BE(offset)
          offset += segLen
        } else {
          break
        }
      }
    }
  } catch {
    // Dimension detection is best-effort
  }
  return null
}

/**
 * Detect common aspect ratio from width/height
 */
function detectAspectRatio(w: number, h: number): string {
  const ratio = w / h
  const ratios: [number, string][] = [
    [1, '1:1'],
    [16 / 9, '16:9'],
    [9 / 16, '9:16'],
    [4 / 3, '4:3'],
    [3 / 4, '3:4'],
    [3 / 2, '3:2'],
    [2 / 3, '2:3'],
    [21 / 9, '21:9'],
  ]
  let closest = '1:1'
  let minDiff = Infinity
  for (const [target, label] of ratios) {
    const diff = Math.abs(ratio - target)
    if (diff < minDiff) {
      minDiff = diff
      closest = label
    }
  }
  // Only return a named ratio if it's within 5% tolerance
  if (minDiff / (w / h) > 0.05) {
    return `${w}:${h}`
  }
  return closest
}
