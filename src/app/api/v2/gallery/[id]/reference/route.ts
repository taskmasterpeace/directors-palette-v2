import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../../_lib/middleware'
import { successResponse, errors } from '../../../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_CATEGORIES = ['people', 'places', 'props', 'layouts', 'styles'] as const

/**
 * PATCH /api/v2/gallery/:id/reference — Tag a gallery image with a @reference
 *
 * Body:
 *   reference: string — tag like "@sasha-foxworth" (with or without @)
 *   category?: string — "people"|"places"|"props"|"layouts"|"styles" (default: "people")
 *
 * This does two things:
 *   1. Sets metadata.reference on the gallery row
 *   2. Creates/updates a reference table entry so it's in the library
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const { id } = await params
    const body = await request.json()

    let reference = body.reference as string
    const category = body.category || 'people'

    if (!reference || typeof reference !== 'string') {
      return errors.validation('reference is required (e.g. "@sasha-foxworth")')
    }

    // Normalize: ensure @ prefix
    if (!reference.startsWith('@')) {
      reference = `@${reference}`
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return errors.validation(`category must be one of: ${VALID_CATEGORIES.join(', ')}`)
    }

    const supabase = getSupabase()

    // Verify the image exists and belongs to this user
    const { data: galleryRow, error: fetchErr } = await supabase
      .from('gallery')
      .select('id, metadata, user_id')
      .eq('id', id)
      .single()

    if (fetchErr || !galleryRow) {
      return errors.notFound('Gallery image not found')
    }

    if (galleryRow.user_id !== auth.userId) {
      return errors.forbidden('You do not own this image')
    }

    // 1. Update gallery metadata.reference
    const updatedMetadata = { ...(galleryRow.metadata || {}), reference }
    const { error: updateErr } = await supabase
      .from('gallery')
      .update({ metadata: updatedMetadata })
      .eq('id', id)

    if (updateErr) {
      return errors.internal('Failed to update reference tag')
    }

    // 2. Upsert into reference table (for library)
    const tagName = reference.replace(/^@/, '')

    // Check if reference entry already exists for this gallery image
    const { data: existingRef } = await supabase
      .from('reference')
      .select('id')
      .eq('gallery_id', id)
      .maybeSingle()

    if (existingRef) {
      // Update existing
      await supabase
        .from('reference')
        .update({ category, tags: [tagName], updated_at: new Date().toISOString() })
        .eq('id', existingRef.id)
    } else {
      // Create new
      await supabase
        .from('reference')
        .insert({
          id: crypto.randomUUID(),
          gallery_id: id,
          category,
          tags: [tagName],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: `/v2/gallery/${id}/reference`,
      method: 'PATCH',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({
      id,
      reference,
      category,
      message: `Tagged as ${reference} and added to ${category} library`,
    })
  } catch (_err) {
    return errors.internal()
  }
}

/**
 * DELETE /api/v2/gallery/:id/reference — Remove reference tag from an image
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const { id } = await params
    const supabase = getSupabase()

    // Verify ownership
    const { data: galleryRow } = await supabase
      .from('gallery')
      .select('id, metadata, user_id')
      .eq('id', id)
      .single()

    if (!galleryRow || galleryRow.user_id !== auth.userId) {
      return errors.notFound('Gallery image not found')
    }

    // Clear metadata.reference
    const updatedMetadata = { ...(galleryRow.metadata || {}) }
    delete updatedMetadata.reference
    await supabase.from('gallery').update({ metadata: updatedMetadata }).eq('id', id)

    // Remove from reference table
    await supabase.from('reference').delete().eq('gallery_id', id)

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: `/v2/gallery/${id}/reference`,
      method: 'DELETE',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({ id, message: 'Reference tag removed' })
  } catch (_err) {
    return errors.internal()
  }
}
