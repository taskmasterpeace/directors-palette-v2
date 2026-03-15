#!/usr/bin/env node
/**
 * Seed SAMPLE_RECIPES as community_items with type='recipe', status='approved'.
 *
 * Usage: node --env-file=.env.local scripts/seed-community-recipes.mjs [--dry-run]
 *
 * IMPORTANT: Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS (required for
 * inserting with submitted_by=null, which the RLS policy blocks for normal users).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Run with: node --env-file=.env.local scripts/seed-community-recipes.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const dryRun = process.argv.includes('--dry-run')

const STARTER_RECIPE_NAMES = [
  'Battle Rap',
  'Character Sheet',
  'Product Photography',
]

async function main() {
  const recipesJson = readFileSync('scripts/data/sample-recipes.json', 'utf-8')
  const recipes = JSON.parse(recipesJson)

  console.log(`Found ${recipes.length} recipes to seed`)

  // Fetch existing community recipe names to avoid duplicates
  const { data: existing } = await supabase
    .from('community_items')
    .select('name')
    .eq('type', 'recipe')
  const existingNames = new Set((existing || []).map(r => r.name))
  console.log(`Existing community recipes: ${existingNames.size}`)

  let seeded = 0
  let skipped = 0
  let errors = 0

  for (const recipe of recipes) {
    const isStarter = STARTER_RECIPE_NAMES.includes(recipe.name)

    if (existingNames.has(recipe.name)) {
      console.log(`  SKIP ${recipe.name} (already exists)`)
      skipped++
      continue
    }

    const communityItem = {
      type: 'recipe',
      name: recipe.name,
      description: recipe.description || null,
      category: recipe.categoryId || 'character-sheets',
      tags: isStarter ? ['starterRecipe'] : [],
      content: {
        stages: recipe.stages.map(stage => ({
          id: stage.id,
          order: stage.order,
          type: stage.type || 'generation',
          template: stage.template,
          toolId: stage.toolId || undefined,
          referenceImages: stage.referenceImages || [],
        })),
        suggestedAspectRatio: recipe.suggestedAspectRatio || null,
        recipeNote: recipe.recipeNote || null,
        referenceImages: [],
      },
      submitted_by: null,
      submitted_by_name: 'Directors Palette',
      status: 'approved',
      is_featured: false,
      // is_official: true,  // Uncomment after running migration: 20260315_community_is_official.sql
      add_count: 0,
      rating_sum: 0,
      rating_count: 0,
    }

    console.log(`  ${isStarter ? 'STARTER' : 'SEED'} ${recipe.name} → category: ${communityItem.category}`)

    if (!dryRun) {
      const { error } = await supabase
        .from('community_items')
        .insert(communityItem)

      if (error) {
        console.error(`    ERROR: ${error.message}`)
        errors++
        continue
      }
    }
    seeded++
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done: ${seeded} seeded, ${skipped} skipped, ${errors} errors`)
}

main().catch(console.error)
