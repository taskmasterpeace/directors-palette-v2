import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiV2')

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0

    const supabase = getSupabase()

    const { data, error, count } = await supabase
      .from('recipes')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${auth.userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      log.error('Failed to list recipes', { error: error.message })
      return errors.internal('Failed to fetch recipes')
    }

    const recipes = (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      stages: Array.isArray(r.stages) ? r.stages.length : 0,
      fields: r.fields || [],
      suggested_model: r.suggested_model || 'nano-banana-2',
      suggested_aspect_ratio: r.suggested_aspect_ratio || '16:9',
    }))

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/v2/recipes',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({ recipes, total: count || 0, limit, offset })
  } catch (err) {
    log.error('GET /v2/recipes error', { error: err instanceof Error ? err.message : String(err) })
    return errors.internal()
  }
}
