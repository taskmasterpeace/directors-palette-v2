#!/usr/bin/env node
/**
 * Seed SAMPLE_RECIPES as community_items with type='recipe', status='approved'.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-community-recipes.mjs            # insert-only (skip existing)
 *   node --env-file=.env.local scripts/seed-community-recipes.mjs --dry-run  # print plan, don't write
 *   node --env-file=.env.local scripts/seed-community-recipes.mjs --upsert   # update existing rows by name
 *
 * IMPORTANT: Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS (required for
 * inserting with submitted_by=null, which the RLS policy blocks for normal users).
 *
 * Why --upsert exists: code-side SAMPLE_RECIPES / sample-recipes.json evolves
 * (new STYLE fields, URL migrations, template fixes), but this script was
 * insert-only — existing rows never got the updates. That caused two drift
 * incidents on 2026-04-20 (character-sheet URL migration + Battle Rap photoreal
 * override). --upsert updates the existing row's mutable fields in place.
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
const upsert = process.argv.includes('--upsert')

const STARTER_RECIPE_NAMES = [
  'Battle Rap',
  'Character Sheet',
  'Product Photography',
]

function buildCommunityItem(recipe) {
  const isStarter = STARTER_RECIPE_NAMES.includes(recipe.name)
  return {
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
    is_official: true,
  }
}

async function main() {
  const recipesJson = readFileSync('scripts/data/sample-recipes.json', 'utf-8')
  const recipes = JSON.parse(recipesJson)

  console.log(`Found ${recipes.length} recipes to seed`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : upsert ? 'UPSERT (update existing)' : 'INSERT-ONLY (skip existing)'}`)

  // Fetch existing community recipe names to decide insert vs update
  const { data: existing } = await supabase
    .from('community_items')
    .select('id, name')
    .eq('type', 'recipe')
  const existingByName = new Map((existing || []).map(r => [r.name, r.id]))
  console.log(`Existing community recipes: ${existingByName.size}`)

  let inserted = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (const recipe of recipes) {
    const isStarter = STARTER_RECIPE_NAMES.includes(recipe.name)
    const existingId = existingByName.get(recipe.name)
    const base = buildCommunityItem(recipe)

    if (existingId) {
      if (!upsert) {
        console.log(`  SKIP ${recipe.name} (already exists — pass --upsert to update)`)
        skipped++
        continue
      }

      // Update existing row — leave add_count / rating_* / submitted_by alone
      const updatePayload = {
        description: base.description,
        category: base.category,
        tags: base.tags,
        content: base.content,
        status: base.status,
        is_official: base.is_official,
      }

      console.log(`  ${isStarter ? 'STARTER' : 'UPSERT'} ${recipe.name} → id ${existingId}`)

      if (!dryRun) {
        const { error } = await supabase
          .from('community_items')
          .update(updatePayload)
          .eq('id', existingId)
        if (error) {
          console.error(`    ERROR: ${error.message}`)
          errors++
          continue
        }
      }
      updated++
    } else {
      // Insert new row — include counts at zero
      const insertPayload = {
        ...base,
        add_count: 0,
        rating_sum: 0,
        rating_count: 0,
      }

      console.log(`  ${isStarter ? 'STARTER' : 'SEED'} ${recipe.name} → category: ${base.category}`)

      if (!dryRun) {
        const { error } = await supabase
          .from('community_items')
          .insert(insertPayload)
        if (error) {
          console.error(`    ERROR: ${error.message}`)
          errors++
          continue
        }
      }
      inserted++
    }
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors`)

  if (!upsert && existingByName.size > 0) {
    console.log('\nTip: if SAMPLE_RECIPES has changed, re-run with --upsert to sync existing DB rows.')
  }
}

main().catch(console.error)
