/**
 * API v2 Admin: Single Style Sheet
 * GET    /api/v2/admin/styles/{id} — Get one
 * PATCH  /api/v2/admin/styles/{id} — Update (partial)
 * DELETE /api/v2/admin/styles/{id} — Delete
 *
 * Requires an admin API key.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../../_lib/middleware'
import { successResponse, errors } from '../../../_lib/response'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SELECT_COLUMNS = 'id, name, description, style_prompt, image_url, usage_count, is_system, created_at, updated_at'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth
  if (!auth.isAdmin) return errors.forbidden('Admin API key required')

  const { id } = await params
  const supabase = getClient()
  const { data, error } = await supabase
    .from('style_guides')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .eq('is_system', true)
    .single()

  if (error || !data) return errors.notFound('Style not found')
  return successResponse({ style: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth
  if (!auth.isAdmin) return errors.forbidden('Admin API key required')

  const { id } = await params
  const body = await request.json().catch(() => null) as {
    name?: string
    description?: string | null
    style_prompt?: string | null
    image_url?: string | null
  } | null

  if (!body) return errors.validation('Request body is required')

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') {
    if (!body.name.trim()) return errors.validation('name cannot be empty')
    updates.name = body.name.trim()
  }
  if ('description' in body) updates.description = body.description?.trim?.() || null
  if ('style_prompt' in body) updates.style_prompt = body.style_prompt?.trim?.() || null
  if ('image_url' in body) updates.image_url = body.image_url?.trim?.() || null

  const supabase = getClient()
  const { data, error } = await supabase
    .from('style_guides')
    .update(updates)
    .eq('id', id)
    .eq('is_system', true)
    .select(SELECT_COLUMNS)
    .single()

  if (error || !data) return errors.notFound('Style not found')
  return successResponse({ style: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth
  if (!auth.isAdmin) return errors.forbidden('Admin API key required')

  const { id } = await params
  const supabase = getClient()
  const { error } = await supabase
    .from('style_guides')
    .delete()
    .eq('id', id)
    .eq('is_system', true)

  if (error) return errors.internal(`Failed to delete: ${error.message}`)
  return successResponse({ deleted: true, id })
}
