import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/v2/gallery — List gallery images with optional filters
 *
 * Query params:
 *   limit (default 50, max 100)
 *   offset (default 0)
 *   reference — filter by @tag (e.g. "@sasha-foxworth")
 *   has_reference — "true" to only show tagged images
 *   type — "image" or "video"
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0
    const referenceFilter = searchParams.get('reference')
    const hasReference = searchParams.get('has_reference') === 'true'
    const typeFilter = searchParams.get('type')

    const supabase = getSupabase()

    let query = supabase
      .from('gallery')
      .select('id, public_url, metadata, generation_type, created_at', { count: 'exact' })
      .eq('user_id', auth.userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (typeFilter) {
      query = query.eq('generation_type', typeFilter)
    }

    if (referenceFilter) {
      const normalizedRef = referenceFilter.startsWith('@') ? referenceFilter : `@${referenceFilter}`
      query = query.eq('metadata->>reference', normalizedRef)
    } else if (hasReference) {
      query = query.not('metadata->>reference', 'is', null)
        .neq('metadata->>reference', '')
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      return errors.internal('Failed to fetch gallery')
    }

    const images = (data || []).map(row => ({
      id: row.id,
      url: row.public_url,
      type: row.generation_type,
      reference: row.metadata?.reference || null,
      prompt: row.metadata?.prompt || null,
      model: row.metadata?.model || null,
      created_at: row.created_at,
    }))

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/v2/gallery',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({ images, total: count || 0, limit, offset })
  } catch (_err) {
    return errors.internal()
  }
}
