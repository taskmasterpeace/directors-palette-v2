/**
 * API Route: Seed System Recipes
 * POST /api/admin/seed-recipes
 *
 * Seeds the system recipes from SAMPLE_RECIPES to the database.
 * Incremental: only inserts recipes that don't already exist (by name).
 */

import { NextResponse } from 'next/server'
import { getAPIClient } from '@/lib/db/client'
import { SAMPLE_RECIPES } from '@/features/shot-creator/types/recipe.types'
import { logger } from '@/lib/logger'

// Helper to get admin client (untyped for tables not in DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminClient(): Promise<any> {
  return await getAPIClient()
}

export async function POST() {
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
      return NextResponse.json({
        success: true,
        message: `All ${SAMPLE_RECIPES.length} system recipes already exist`,
        count: 0,
        existing: existingNames.size,
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

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedCount} new system recipes (${existingNames.size} already existed)`,
      count: insertedCount,
      existing: existingNames.size,
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

export async function GET() {
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
