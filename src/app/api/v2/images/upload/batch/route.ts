import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { validateV2ApiKey, isAuthContext } from '../../../_lib/middleware'
import { successResponse, errors } from '../../../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

const STORAGE_BUCKET = 'directors-palette'
const MAX_FILE_SIZE = 50 * 1024 * 1024
const MAX_FILES = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VALID_CATEGORIES = ['people', 'places', 'props', 'layouts', 'styles'] as const

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/v2/images/upload/batch — Upload up to 10 images at once
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const formData = await request.formData()
    const files = formData.getAll('files[]') as File[]
    const referenceTag = formData.get('reference_tag') as string | null
    const referenceCategory = (formData.get('reference_category') as string) || 'people'
    const names = formData.getAll('names[]') as string[]

    if (!files.length) {
      return errors.validation('files[] is required (at least 1 file)')
    }

    if (files.length > MAX_FILES) {
      return errors.validation(`Maximum ${MAX_FILES} files per batch. Got: ${files.length}`)
    }

    if (referenceTag && !VALID_CATEGORIES.includes(referenceCategory as typeof VALID_CATEGORIES[number])) {
      return errors.validation(`reference_category must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    // Normalize reference tag once
    let normalizedRef: string | null = null
    if (referenceTag) {
      normalizedRef = referenceTag.startsWith('@') ? referenceTag : `@${referenceTag}`
    }

    const supabase = getSupabase()
    const results: Array<{
      id: string
      url: string
      name: string
      reference: string | null
      status: 'uploaded' | 'failed'
      error?: string
    }> = []
    let uploaded = 0
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const displayName = names[i] || file.name || `upload_${i}`

      // Validate each file
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({ id: '', url: '', name: displayName, reference: null, status: 'failed', error: `Invalid type: ${file.type}` })
        failed++
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        results.push({ id: '', url: '', name: displayName, reference: null, status: 'failed', error: 'File too large (max 50MB)' })
        failed++
        continue
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
        const ext = extMap[file.type] || 'jpg'
        const uploadId = randomUUID()
        const storagePath = `generations/${auth.userId}/upload_${uploadId}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: true,
            cacheControl: 'public, max-age=31536000, immutable',
          })

        if (uploadError) {
          results.push({ id: '', url: '', name: displayName, reference: null, status: 'failed', error: uploadError.message })
          failed++
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath)

        const galleryId = randomUUID()
        const metadata: Record<string, unknown> = {
          source: 'upload',
          original_filename: file.name,
        }

        if (normalizedRef) {
          metadata.reference = normalizedRef
        }

        await supabase.from('gallery').insert({
          id: galleryId,
          user_id: auth.userId,
          prediction_id: `upload_${uploadId}`,
          generation_type: 'image',
          status: 'completed',
          public_url: publicUrl,
          mime_type: file.type,
          metadata,
        })

        // Insert reference if tagged
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

        results.push({
          id: galleryId,
          url: publicUrl,
          name: displayName,
          reference: normalizedRef,
          status: 'uploaded',
        })
        uploaded++
      } catch {
        results.push({ id: '', url: '', name: displayName, reference: null, status: 'failed', error: 'Upload processing error' })
        failed++
      }
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/v2/images/upload/batch',
      method: 'POST',
      statusCode: 201,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({ uploaded, failed, results }, 201)
  } catch (_err) {
    return errors.internal()
  }
}
