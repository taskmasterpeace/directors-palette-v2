/**
 * Recipe Service
 * Handles all recipe-related database operations
 * Recipes are stored in Supabase, not localStorage
 */

import { getClient } from '@/lib/db/client'
import type { Recipe, RecipeStage, RecipeReferenceImage } from '../types/recipe.types'
import { parseStageTemplate, SAMPLE_RECIPES } from '../types/recipe.types'

// Helper to get an untyped client for recipe tables (not in main DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRecipeClient(): Promise<any> {
  return await getClient()
}

// Database recipe type (matches Supabase schema)
export interface DbRecipe {
  id: string
  user_id: string
  name: string
  description: string | null
  recipe_note: string | null
  stages: RecipeStage[]
  suggested_aspect_ratio: string | null
  suggested_resolution: string | null
  suggested_model: string | null
  quick_access_label: string | null
  is_quick_access: boolean
  category_id: string | null
  is_system: boolean
  is_system_only: boolean
  created_at: string
  updated_at: string
}

// Quick access item from database
export interface DbQuickAccessItem {
  id: string
  user_id: string
  recipe_id: string
  label: string
  display_order: number
  created_at: string
}

// Convert database recipe to app recipe format
function dbRecipeToRecipe(dbRecipe: DbRecipe): Recipe {
  return {
    id: dbRecipe.id,
    name: dbRecipe.name,
    description: dbRecipe.description || undefined,
    recipeNote: dbRecipe.recipe_note || undefined,
    stages: dbRecipe.stages.map((stage, index) => ({
      ...stage,
      fields: parseStageTemplate(stage.template, index),
    })),
    suggestedAspectRatio: dbRecipe.suggested_aspect_ratio || undefined,
    suggestedResolution: dbRecipe.suggested_resolution || undefined,
    quickAccessLabel: dbRecipe.quick_access_label || undefined,
    isQuickAccess: dbRecipe.is_quick_access,
    categoryId: dbRecipe.category_id || undefined,
    isSystem: dbRecipe.is_system,
    isSystemOnly: dbRecipe.is_system_only,
    createdAt: new Date(dbRecipe.created_at).getTime(),
    updatedAt: new Date(dbRecipe.updated_at).getTime(),
  }
}

// Convert app recipe to database format for insert/update
function recipeToDbRecipe(
  recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Omit<DbRecipe, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    name: recipe.name,
    description: recipe.description || null,
    recipe_note: recipe.recipeNote || null,
    stages: recipe.stages.map(stage => ({
      id: stage.id,
      order: stage.order,
      type: stage.type || 'generation',
      template: stage.template,
      toolId: stage.toolId,
      fields: [], // Fields are parsed on read, not stored
      referenceImages: stage.referenceImages,
    })),
    suggested_aspect_ratio: recipe.suggestedAspectRatio || null,
    suggested_resolution: recipe.suggestedResolution || null,
    quick_access_label: recipe.quickAccessLabel || null,
    is_quick_access: recipe.isQuickAccess,
    category_id: recipe.categoryId || null,
    is_system: recipe.isSystem || false,
    is_system_only: recipe.isSystemOnly || false,
  }
}

class RecipeService {
  /**
   * Get all recipes for a user (including system recipes)
   */
  async getRecipes(userId: string): Promise<Recipe[]> {
    const supabase = await getRecipeClient()

    const { data, error } = await supabase
      .from('user_recipes')
      .select('*')
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recipes:', error)
      return []
    }

    return (data as DbRecipe[]).map(dbRecipeToRecipe)
  }

  /**
   * Get a single recipe by ID
   */
  async getRecipe(recipeId: string, userId: string): Promise<Recipe | null> {
    const supabase = await getRecipeClient()

    const { data, error } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('id', recipeId)
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .single()

    if (error) {
      console.error('Error fetching recipe:', error)
      return null
    }

    return dbRecipeToRecipe(data as DbRecipe)
  }

  /**
   * Create a new recipe
   */
  async createRecipe(
    recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<Recipe | null> {
    const supabase = await getRecipeClient()

    const dbRecipe = recipeToDbRecipe(recipe, userId)

    const { data, error } = await supabase
      .from('user_recipes')
      .insert(dbRecipe)
      .select()
      .single()

    if (error) {
      console.error('Error creating recipe:', error)
      return null
    }

    return dbRecipeToRecipe(data as DbRecipe)
  }

  /**
   * Update an existing recipe
   */
  async updateRecipe(
    recipeId: string,
    updates: Partial<Omit<Recipe, 'id' | 'createdAt'>>,
    userId: string
  ): Promise<Recipe | null> {
    const supabase = await getRecipeClient()

    // Build update object
    const updateData: Partial<DbRecipe> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description || null
    if (updates.recipeNote !== undefined) updateData.recipe_note = updates.recipeNote || null
    if (updates.suggestedAspectRatio !== undefined) updateData.suggested_aspect_ratio = updates.suggestedAspectRatio || null
    if (updates.suggestedResolution !== undefined) updateData.suggested_resolution = updates.suggestedResolution || null
    if (updates.quickAccessLabel !== undefined) updateData.quick_access_label = updates.quickAccessLabel || null
    if (updates.isQuickAccess !== undefined) updateData.is_quick_access = updates.isQuickAccess
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId || null

    if (updates.stages !== undefined) {
      updateData.stages = updates.stages.map(stage => ({
        id: stage.id,
        order: stage.order,
        type: stage.type || 'generation',
        template: stage.template,
        toolId: stage.toolId,
        fields: [],
        referenceImages: stage.referenceImages,
      }))
    }

    // Add missing field mappings
    if (updates.suggestedModel !== undefined) updateData.suggested_model = updates.suggestedModel || null
    if (updates.isSystem !== undefined) updateData.is_system = updates.isSystem
    if (updates.isSystemOnly !== undefined) updateData.is_system_only = updates.isSystemOnly

    // First check if this is a system recipe (admin can edit system recipes)
    const { data: existing } = await supabase
      .from('user_recipes')
      .select('is_system, user_id')
      .eq('id', recipeId)
      .single()

    let query = supabase
      .from('user_recipes')
      .update(updateData)
      .eq('id', recipeId)

    // Allow update if: user owns it OR it's a system recipe (admin only)
    if (!existing?.is_system) {
      // User recipe - require user_id match
      query = query.eq('user_id', userId)
    }
    // System recipes have no user_id filter - admin can update

    const { data, error } = await query.select().single()

    if (error) {
      console.error('Error updating recipe:', error)
      return null
    }

    return dbRecipeToRecipe(data as DbRecipe)
  }

  /**
   * Delete a recipe
   */
  async deleteRecipe(recipeId: string, userId: string): Promise<boolean> {
    const supabase = await getRecipeClient()

    const { error } = await supabase
      .from('user_recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId) // Only owner can delete

    if (error) {
      console.error('Error deleting recipe:', error)
      return false
    }

    return true
  }

  /**
   * Add a reference image to a recipe stage
   */
  async addReferenceImageToStage(
    recipeId: string,
    stageId: string,
    image: RecipeReferenceImage,
    userId: string
  ): Promise<Recipe | null> {
    // Get current recipe
    const recipe = await this.getRecipe(recipeId, userId)
    if (!recipe) return null

    // Update stages with new image
    const updatedStages = recipe.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          referenceImages: [...stage.referenceImages, image],
        }
      }
      return stage
    })

    return this.updateRecipe(recipeId, { stages: updatedStages }, userId)
  }

  /**
   * Remove a reference image from a recipe stage
   */
  async removeReferenceImageFromStage(
    recipeId: string,
    stageId: string,
    imageId: string,
    userId: string
  ): Promise<Recipe | null> {
    // Get current recipe
    const recipe = await this.getRecipe(recipeId, userId)
    if (!recipe) return null

    // Update stages without the image
    const updatedStages = recipe.stages.map(stage => {
      if (stage.id === stageId) {
        return {
          ...stage,
          referenceImages: stage.referenceImages.filter(img => img.id !== imageId),
        }
      }
      return stage
    })

    return this.updateRecipe(recipeId, { stages: updatedStages }, userId)
  }

  // ============================================================================
  // QUICK ACCESS METHODS
  // ============================================================================

  /**
   * Get user's quick access items
   */
  async getQuickAccessItems(userId: string): Promise<DbQuickAccessItem[]> {
    const supabase = await getRecipeClient()

    const { data, error } = await supabase
      .from('user_recipe_quick_access')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching quick access items:', error)
      return []
    }

    return data as DbQuickAccessItem[]
  }

  /**
   * Add a recipe to quick access
   */
  async addToQuickAccess(
    recipeId: string,
    label: string,
    userId: string
  ): Promise<DbQuickAccessItem | null> {
    const supabase = await getRecipeClient()

    // Get current max order
    const items = await this.getQuickAccessItems(userId)
    if (items.length >= 9) {
      console.warn('Quick access is full (max 9 items)')
      return null
    }

    // Check if already exists
    if (items.some(item => item.recipe_id === recipeId)) {
      console.warn('Recipe already in quick access')
      return null
    }

    const newOrder = items.length

    const { data, error } = await supabase
      .from('user_recipe_quick_access')
      .insert({
        user_id: userId,
        recipe_id: recipeId,
        label,
        display_order: newOrder,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding to quick access:', error)
      return null
    }

    return data as DbQuickAccessItem
  }

  /**
   * Remove from quick access
   */
  async removeFromQuickAccess(itemId: string, userId: string): Promise<boolean> {
    const supabase = await getRecipeClient()

    const { error } = await supabase
      .from('user_recipe_quick_access')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing from quick access:', error)
      return false
    }

    return true
  }

  /**
   * Update quick access label
   */
  async updateQuickAccessLabel(
    itemId: string,
    label: string,
    userId: string
  ): Promise<boolean> {
    const supabase = await getRecipeClient()

    const { error } = await supabase
      .from('user_recipe_quick_access')
      .update({ label })
      .eq('id', itemId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating quick access label:', error)
      return false
    }

    return true
  }

  /**
   * Reorder quick access items
   */
  async reorderQuickAccess(
    items: { id: string; order: number }[],
    userId: string
  ): Promise<boolean> {
    const supabase = await getRecipeClient()

    // Update each item's order
    for (const item of items) {
      const { error } = await supabase
        .from('user_recipe_quick_access')
        .update({ display_order: item.order })
        .eq('id', item.id)
        .eq('user_id', userId)

      if (error) {
        console.error('Error reordering quick access:', error)
        return false
      }
    }

    return true
  }

  // ============================================================================
  // SYSTEM RECIPES INITIALIZATION
  // ============================================================================

  /**
   * Initialize system recipes (called once per system, not per user)
   * These are the built-in recipes that all users can access
   */
  async initializeSystemRecipes(): Promise<void> {
    const supabase = await getRecipeClient()

    // Check if system recipes already exist
    const { data: existing } = await supabase
      .from('user_recipes')
      .select('id')
      .eq('is_system', true)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log('System recipes already initialized')
      return
    }

    console.log('Initializing system recipes...')

    // Insert sample recipes as system recipes (no user_id)
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
          referenceImages: stage.referenceImages,
        })),
        suggested_aspect_ratio: sample.suggestedAspectRatio || null,
        suggested_resolution: sample.suggestedResolution || null,
        quick_access_label: sample.quickAccessLabel || null,
        is_quick_access: sample.isQuickAccess,
        category_id: sample.categoryId || null,
        is_system: true,
        is_system_only: sample.isSystemOnly || false,
      }

      const { error } = await supabase
        .from('user_recipes')
        .insert(dbRecipe)

      if (error) {
        console.error(`Error inserting system recipe "${sample.name}":`, error)
      } else {
        console.log(`✓ Inserted system recipe: ${sample.name}`)
      }
    }

    console.log('System recipes initialization complete')
  }
}

// Export singleton instance
export const recipeService = new RecipeService()
