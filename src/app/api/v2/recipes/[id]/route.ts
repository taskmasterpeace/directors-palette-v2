import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
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

/**
 * GET /api/v2/recipes/{id}
 *
 * Fetch a single recipe by ID. Returns the same shape as each entry in
 * GET /api/v2/recipes, plus the full stages array (template + referenceImages)
 * so callers can inspect exactly what will be executed.
 *
 * Auth scope: caller must own the recipe OR the recipe must be a system recipe.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id } = await params

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    if (!id || typeof id !== 'string') {
      return errors.validation('recipe id is required')
    }

    const supabase = getSupabase()
    const { data: r, error } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      log.error('Failed to fetch recipe', { error: error.message, recipeId: id })
      return errors.internal('Failed to fetch recipe')
    }

    if (!r) {
      return errors.notFound(`Recipe ${id} not found`)
    }

    // Authorization: owner or system recipe only
    if (!r.is_system && r.user_id !== auth.userId) {
      return errors.notFound(`Recipe ${id} not found`)
    }

    const stages = Array.isArray(r.stages) ? r.stages : []

    // Parse fields from stage templates (mirrors list-recipes behavior)
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

    const recipe = {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category_id || null,
      source: r.source || (r.is_system ? 'system' : 'created'),
      fields: parsedFields,
      suggested_model: r.suggested_model || 'nano-banana-2',
      suggested_aspect_ratio: r.suggested_aspect_ratio || '16:9',
      recipe_note: r.recipe_note || null,
      stages: stages.map((s: Record<string, unknown>, idx: number) => ({
        id: s.id ?? `stage_${idx}`,
        order: typeof s.order === 'number' ? s.order : idx,
        template: s.template ?? '',
        reference_images: Array.isArray(s.referenceImages)
          ? (s.referenceImages as Array<Record<string, unknown>>).map((ref) => ({
              id: ref.id,
              name: ref.name,
              url: ref.url,
            }))
          : [],
      })),
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: `/v2/recipes/${id}`,
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({ recipe })
  } catch (err) {
    log.error('GET /v2/recipes/[id] error', { error: err instanceof Error ? err.message : String(err), recipeId: id })
    return errors.internal()
  }
}
