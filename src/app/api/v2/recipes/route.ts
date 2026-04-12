import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { createLogger } from '@/lib/logger'
import { parseStageTemplate } from '@/features/shot-creator/types/recipe.types'

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
    const includePublic = searchParams.get('include_public') === 'true'

    const supabase = getSupabase()

    let query = supabase
      .from('user_recipes')
      .select('*', { count: 'exact' })

    if (includePublic) {
      // Return user's own recipes + all system recipes
      query = query.or(`user_id.eq.${auth.userId},is_system.eq.true`)
    } else {
      query = query.eq('user_id', auth.userId)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      log.error('Failed to list recipes', { error: error.message })
      return errors.internal('Failed to fetch recipes')
    }

    const recipes = (data || []).map((r) => {
      const stages = Array.isArray(r.stages) ? r.stages : []

      // Parse fields from stage templates (DB fields array is usually empty)
      const seenNames = new Set<string>()
      const parsedFields: Array<Record<string, unknown>> = []

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i]
        if (!stage?.template) continue
        const fields = parseStageTemplate(stage.template, i)
        for (const f of fields) {
          if (seenNames.has(f.name)) continue
          seenNames.add(f.name)
          parsedFields.push({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            ...(f.type === 'select' && f.options ? { options: f.options } : {}),
            ...(f.type === 'wildcard' && f.wildcardName ? { wildcard: f.wildcardName } : {}),
          })
        }
      }

      return {
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category_id || null,
        source: r.source || (r.is_system ? 'system' : 'created'),
        stages: stages.length,
        fields: parsedFields,
        suggested_model: r.suggested_model || 'nano-banana-2',
        suggested_aspect_ratio: r.suggested_aspect_ratio || '16:9',
        recipe_note: r.recipe_note || null,
      }
    })

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
