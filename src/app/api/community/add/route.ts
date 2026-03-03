import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

/**
 * POST /api/community/add
 * Add a community item to user's library
 * Also writes to type-specific tables (user_recipes, wildcards, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const body = await request.json()
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      )
    }

    // Get the community item
    const { data: itemData, error: itemError } = await supabase
      .from('community_items')
      .select('*')
      .eq('id', itemId)
      .eq('status', 'approved')
      .single()

    if (itemError || !itemData) {
      return NextResponse.json(
        { error: 'Community item not found' },
        { status: 404 }
      )
    }

    // Upsert into user's library (overwrite if exists with same name)
    const { data, error } = await supabase
      .from('user_library_items')
      .upsert({
        user_id: user.id,
        community_item_id: itemId,
        type: itemData.type,
        name: itemData.name,
        content: itemData.content,
        is_modified: false,
        submitted_to_community: false,
        community_status: null,
      }, {
        onConflict: 'user_id,type,name',
      })
      .select()
      .single()

    if (error) {
      logger.api.error('Error adding to library', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to add to library' },
        { status: 500 }
      )
    }

    // =========================================================================
    // TYPE-SPECIFIC TABLE WRITES (uses service role to bypass RLS)
    // =========================================================================
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = await getAPIClient()

    if (itemData.type === 'recipe') {
      const content = itemData.content as { stages?: { id?: string; order?: number; template: string; referenceImages?: unknown[] }[]; suggestedAspectRatio?: string; recipeNote?: string }

      const recipeData = {
        user_id: user.id,
        name: itemData.name,
        description: itemData.description || null,
        recipe_note: content.recipeNote || null,
        stages: (content.stages || []).map((stage: { id?: string; order?: number; template: string; referenceImages?: unknown[] }, index: number) => ({
          id: stage.id || `stage_${index}_${Date.now()}`,
          order: stage.order ?? index,
          template: stage.template,
          fields: [],
          referenceImages: stage.referenceImages || [],
        })),
        suggested_aspect_ratio: content.suggestedAspectRatio || null,
        suggested_resolution: null,
        quick_access_label: null,
        is_quick_access: false,
        category_id: itemData.category || null,
        is_system: false,
      }

      // Check if user already has this recipe
      const { data: existing } = await adminClient
        .from('user_recipes')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', itemData.name)
        .maybeSingle()

      if (existing) {
        await adminClient.from('user_recipes').update(recipeData).eq('id', existing.id)
      } else {
        const { error: insertErr } = await adminClient.from('user_recipes').insert(recipeData)
        if (insertErr) {
          logger.api.error('Error inserting recipe to user_recipes', { error: insertErr.message })
        }
      }
    }

    if (itemData.type === 'wildcard') {
      const content = itemData.content as { entries?: string[] }
      const wildcardData = {
        user_id: user.id,
        name: itemData.name,
        entries: content.entries || [],
        is_shared: false,
      }

      const { data: existing } = await adminClient
        .from('wildcards')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', itemData.name)
        .maybeSingle()

      if (existing) {
        await adminClient.from('wildcards').update(wildcardData).eq('id', existing.id)
      } else {
        const { error: insertErr } = await adminClient.from('wildcards').insert(wildcardData)
        if (insertErr) {
          logger.api.error('Error inserting wildcard', { error: insertErr.message })
        }
      }
    }

    if (itemData.type === 'director') {
      const content = itemData.content as { fingerprint?: string; avatarUrl?: string }
      const directorData = {
        user_id: user.id,
        name: itemData.name,
        description: itemData.description || null,
        fingerprint: content.fingerprint || '',
        community_item_id: itemId,
        is_modified: false,
        avatar_url: content.avatarUrl || null,
      }

      const { data: existing } = await adminClient
        .from('user_directors')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', itemData.name)
        .maybeSingle()

      if (existing) {
        await adminClient.from('user_directors').update(directorData).eq('id', existing.id)
      } else {
        const { error: insertErr } = await adminClient.from('user_directors').insert(directorData)
        if (insertErr) {
          logger.api.error('Error inserting director', { error: insertErr.message })
        }
      }
    }

    return NextResponse.json({
      libraryItem: {
        id: data.id,
        userId: data.user_id,
        communityItemId: data.community_item_id,
        type: data.type,
        name: data.name,
        content: data.content,
        isModified: data.is_modified,
        addedAt: data.added_at,
      },
      message: 'Item added to library',
    })
  } catch (error) {
    logger.api.error('Community add error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
