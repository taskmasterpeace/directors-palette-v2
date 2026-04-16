/**
 * API v2 Admin: Style Sheets
 * GET  /api/v2/admin/styles — List all system styles with usage_count
 * POST /api/v2/admin/styles — Create a new system style
 *
 * Requires an admin API key (isAdmin=true on the auth context).
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth
  if (!auth.isAdmin) return errors.forbidden('Admin API key required')

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') || 'name' // 'name' | 'usage' | 'recent'

  const supabase = getClient()
  let query = supabase
    .from('style_guides')
    .select('id, name, description, style_prompt, image_url, usage_count, is_system, created_at, updated_at')
    .eq('is_system', true)

  if (sort === 'usage') query = query.order('usage_count', { ascending: false })
  else if (sort === 'recent') query = query.order('created_at', { ascending: false })
  else query = query.order('name')

  const { data, error } = await query
  if (error) return errors.internal('Failed to fetch styles')

  return successResponse({ styles: data || [], total: data?.length || 0 })
}

export async function POST(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth
  if (!auth.isAdmin) return errors.forbidden('Admin API key required')

  const body = await request.json().catch(() => null) as {
    name?: string
    description?: string
    style_prompt?: string
    image_url?: string
  } | null

  if (!body?.name?.trim()) return errors.validation('name is required')

  const supabase = getClient()
  const { data, error } = await supabase
    .from('style_guides')
    .insert({
      user_id: auth.userId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      style_prompt: body.style_prompt?.trim() || null,
      image_url: body.image_url?.trim() || null,
      is_system: true,
      metadata: { created_via: 'api_v2_admin' },
    })
    .select('id, name, description, style_prompt, image_url, usage_count, is_system, created_at, updated_at')
    .single()

  if (error) return errors.internal(`Failed to create style: ${error.message}`)
  return successResponse({ style: data }, 201)
}
