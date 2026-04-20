/**
 * API Route: Seed System Recipes
 * POST /api/admin/seed-recipes
 *
 * Seeds the system recipes from SAMPLE_RECIPES to the database.
 * Incremental: only inserts recipes that don't already exist (by name).
 * Also seeds non-system-only recipes into community_items as pre-approved items.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { getAPIClient } from '@/lib/db/client'
import { SAMPLE_RECIPES } from '@/features/shot-creator/types/recipe.types'
import { logger } from '@/lib/logger'

// Helper to get admin client (untyped for tables not in DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminClient(): Promise<any> {
  return await getAPIClient()
}

// Map Shot Creator categoryId to Community recipe category
function mapCategoryToCommunity(categoryId?: string): string {
  switch (categoryId) {
    case 'characters': return 'character-sheets'
    case 'products': return 'product'
    case 'scenes': return 'storyboards'
    case 'styles': return 'style-guides'
    case 'artists': return 'style-guides'
    case 'time-based': return 'time-based'
    case 'environments': return 'storyboards'
    case 'narrative': return 'storyboards'
    case 'action': return 'action'
    case 'portraits': return 'portraits'
    default: return 'character-sheets'
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = await getAdminClient()

    // Upsert mode: update existing rows by name instead of skipping. Prevents
    // DB drift when SAMPLE_RECIPES changes (e.g. URL migrations, new fields,
    // template fixes). Passed via ?upsert=true or JSON body { upsert: true }.
    const url = new URL(request.url)
    const upsertQuery = url.searchParams.get('upsert') === 'true'
    let upsertBody = false
    try {
      const body = await request.clone().json().catch(() => ({}))
      upsertBody = Boolean((body as { upsert?: boolean })?.upsert)
    } catch { /* no body */ }
    const upsert = upsertQuery || upsertBody

    // Get existing system recipes (id + name for update targeting)
    const { data: existing } = await supabase
      .from('user_recipes')
      .select('id, name')
      .eq('is_system', true)

    const existingByName = new Map(
      (existing || []).map((r: { id: string; name: string }) => [r.name, r.id])
    )

    logger.api.info('Seeding', {
      totalSamples: SAMPLE_RECIPES.length,
      existing: existingByName.size,
      mode: upsert ? 'upsert' : 'insert-only',
    })

    let insertedCount = 0
    let updatedCount = 0

    for (const sample of SAMPLE_RECIPES) {
      const dbRecipe = {
        user_id: null, // System recipes have no owner
        name: sample.name,
        description: sample.description || null,
        recipe_note: sample.recipeNote || null,
        stages: sample.stages.map(stage => ({
          id: stage.id,
          order: stage.order,
          template: stage.template,
          fields: [],
          referenceImages: stage.referenceImages || [],
          ...(stage.type && { type: stage.type }),
          ...(stage.analysisId && { analysisId: stage.analysisId }),
        })),
        suggested_aspect_ratio: sample.suggestedAspectRatio || null,
        suggested_model: sample.suggestedModel || null,
        suggested_resolution: null,
        quick_access_label: sample.quickAccessLabel || null,
        is_quick_access: sample.isQuickAccess || false,
        category_id: sample.categoryId || null,
        is_system: true,
        is_system_only: sample.isSystemOnly || false,
      }

      const existingId = existingByName.get(sample.name)

      if (existingId) {
        if (!upsert) continue // insert-only mode — skip existing
        // Update mutable fields; leave id and created_at alone
        const { user_id: _uid, ...updatePayload } = dbRecipe
        void _uid
        const { error } = await supabase
          .from('user_recipes')
          .update({ ...updatePayload, updated_at: new Date().toISOString() })
          .eq('id', existingId)
        if (error) {
          logger.api.error('Error updating recipe', { name: sample.name, error: error instanceof Error ? error.message : String(error) })
        } else {
          logger.api.info('Updated recipe', { name: sample.name, id: existingId })
          updatedCount++
        }
      } else {
        const { error } = await supabase
          .from('user_recipes')
          .insert(dbRecipe)
        if (error) {
          logger.api.error('Error inserting recipe', { name: sample.name, error: error instanceof Error ? error.message : String(error) })
        } else {
          logger.api.info('Inserted recipe', { name: sample.name })
          insertedCount++
        }
      }
    }

    // Seed community_items with non-system-only recipes (same upsert mode)
    const { seeded: communityCount, updated: communityUpdated } =
      await seedCommunityItems(supabase, upsert)

    return NextResponse.json({
      success: true,
      message: `user_recipes: ${insertedCount} inserted, ${updatedCount} updated. community_items: ${communityCount} inserted, ${communityUpdated} updated.`,
      count: insertedCount,
      updated: updatedCount,
      existing: existingByName.size,
      communitySeeded: communityCount,
      communityUpdated,
      upsert,
    })
  } catch (error) {
    logger.api.error('Error seeding recipes', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      count: 0
    }, { status: 500 })
  }
}

/**
 * Seed non-system-only recipes into community_items as pre-approved items.
 * In upsert mode, updates existing rows by name instead of skipping.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedCommunityItems(supabase: any, upsert: boolean = false): Promise<{ seeded: number; updated: number }> {
  // Get existing community recipes (id + name for update targeting)
  const { data: existingCommunity } = await supabase
    .from('community_items')
    .select('id, name')
    .eq('type', 'recipe')

  const existingByName = new Map(
    (existingCommunity || []).map((r: { id: string; name: string }) => [r.name, r.id])
  )

  const eligibleRecipes = SAMPLE_RECIPES.filter(sample => !sample.isSystemOnly)

  let seededCount = 0
  let updatedCount = 0
  const now = new Date().toISOString()

  for (const sample of eligibleRecipes) {
    const communityContent = {
      stages: sample.stages.map(stage => ({
        id: stage.id,
        order: stage.order,
        template: stage.template,
        fields: [],
        referenceImages: stage.referenceImages || [],
        ...(stage.type && { type: stage.type }),
        ...(stage.analysisId && { analysisId: stage.analysisId }),
      })),
      suggestedAspectRatio: sample.suggestedAspectRatio || undefined,
      recipeNote: sample.recipeNote || undefined,
      referenceImages: [],
    }

    const existingId = existingByName.get(sample.name)

    if (existingId) {
      if (!upsert) continue
      const { error } = await supabase
        .from('community_items')
        .update({
          description: sample.description || null,
          category: mapCategoryToCommunity(sample.categoryId),
          tags: ['system'],
          content: communityContent,
          status: 'approved' as const,
        })
        .eq('id', existingId)
      if (error) {
        logger.api.error('Error updating community recipe', {
          name: sample.name,
          error: error instanceof Error ? error.message : String(error),
        })
      } else {
        updatedCount++
      }
    } else {
      const communityItem = {
        type: 'recipe' as const,
        name: sample.name,
        description: sample.description || null,
        category: mapCategoryToCommunity(sample.categoryId),
        tags: ['system'],
        content: communityContent,
        submitted_by: null,
        submitted_by_name: 'System',
        status: 'approved' as const,
        approved_at: now,
        is_featured: false,
      }
      const { error } = await supabase
        .from('community_items')
        .insert(communityItem)
      if (error) {
        logger.api.error('Error inserting community recipe', {
          name: sample.name,
          error: error instanceof Error ? error.message : String(error),
        })
      } else {
        seededCount++
      }
    }
  }

  logger.api.info('Community recipes seeded', {
    seeded: seededCount,
    updated: updatedCount,
    existing: existingByName.size,
  })

  return { seeded: seededCount, updated: updatedCount }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('user_recipes')
      .select('id, name, is_system')
      .eq('is_system', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      systemRecipes: data?.length || 0,
      recipes: data
    })
  } catch (error) {
    logger.api.error('Error checking recipes', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
