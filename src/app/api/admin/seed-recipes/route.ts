/**
 * API Route: Seed System Recipes
 * POST /api/admin/seed-recipes
 *
 * Seeds the system recipes from SAMPLE_RECIPES to the database.
 * This should only be run once to initialize the system recipes.
 */

import { NextResponse } from 'next/server'
import { getAPIClient } from '@/lib/db/client'
import { SAMPLE_RECIPES } from '@/features/shot-creator/types/recipe.types'

// Helper to get admin client (untyped for tables not in DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminClient(): Promise<any> {
  return await getAPIClient()
}

export async function POST() {
  try {
    const supabase = await getAdminClient()

    // Check if system recipes already exist
    const { data: existing } = await supabase
      .from('user_recipes')
      .select('id')
      .eq('is_system', true)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'System recipes already exist',
        count: 0
      })
    }

    console.log('Seeding system recipes...')
    let insertedCount = 0

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
        })),
        suggested_aspect_ratio: sample.suggestedAspectRatio || null,
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
        console.error(`Error inserting recipe "${sample.name}":`, error)
      } else {
        console.log(`✓ Inserted: ${sample.name}`)
        insertedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedCount} system recipes`,
      count: insertedCount
    })
  } catch (error) {
    console.error('Error seeding recipes:', error)
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
    console.error('Error checking recipes:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
