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

    // Get names of existing system recipes
    const { data: existing } = await supabase
      .from('user_recipes')
      .select('name')
      .eq('is_system', true)

    const existingNames = new Set((existing || []).map((r: { name: string }) => r.name))

    // Filter to only recipes that don't already exist
    const newRecipes = SAMPLE_RECIPES.filter(sample => !existingNames.has(sample.name))

    if (newRecipes.length === 0) {
      // Even if all user_recipes exist, still sync community_items
      const communityCount = await seedCommunityItems(supabase)
      return NextResponse.json({
        success: true,
        message: `All ${SAMPLE_RECIPES.length} system recipes already exist. Synced ${communityCount} to community.`,
        count: 0,
        existing: existingNames.size,
        communitySeeded: communityCount,
      })
    }

    logger.api.info('Seeding', { newRecipes: newRecipes.length, existingNames: existingNames.size })
    let insertedCount = 0

    for (const sample of newRecipes) {
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

    // Seed community_items with non-system-only recipes
    const communityCount = await seedCommunityItems(supabase)

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedCount} new system recipes (${existingNames.size} already existed). Synced ${communityCount} to community.`,
      count: insertedCount,
      existing: existingNames.size,
      communitySeeded: communityCount,
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
 * Skips recipes that already exist in community_items (matched by type + name).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedCommunityItems(supabase: any): Promise<number> {
  // Get existing community recipe names to avoid duplicates
  const { data: existingCommunity } = await supabase
    .from('community_items')
    .select('name')
    .eq('type', 'recipe')

  const existingCommunityNames = new Set(
    (existingCommunity || []).map((r: { name: string }) => r.name)
  )

  // Filter: skip isSystemOnly and already-existing community items
  const communityRecipes = SAMPLE_RECIPES.filter(
    sample => !sample.isSystemOnly && !existingCommunityNames.has(sample.name)
  )

  if (communityRecipes.length === 0) {
    logger.api.info('All eligible recipes already in community_items')
    return 0
  }

  let seededCount = 0
  const now = new Date().toISOString()

  for (const sample of communityRecipes) {
    const communityItem = {
      type: 'recipe' as const,
      name: sample.name,
      description: sample.description || null,
      category: mapCategoryToCommunity(sample.categoryId),
      tags: ['system'],
      content: {
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
      },
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

  logger.api.info('Community recipes seeded', {
    seeded: seededCount,
    skipped: existingCommunityNames.size,
  })

  return seededCount
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
