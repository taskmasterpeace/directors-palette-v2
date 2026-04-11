/**
 * Recipe Catalog Service
 * Fetches recipes from community_items table for the catalog browser
 */

import { logger } from '@/lib/logger'
import type { CatalogRecipe } from '../types/recipe-core.types'

interface CatalogFilters {
  category?: string
  search?: string
  featured?: boolean
}

interface CatalogResponse {
  recipes: CatalogRecipe[]
  total: number
}

class RecipeCatalogService {
  /**
   * Fetch catalog recipes (approved community_items with type='recipe')
   */
  async getCatalogRecipes(filters?: CatalogFilters): Promise<CatalogResponse> {
    try {
      const params = new URLSearchParams()
      if (filters?.category) params.set('category', filters.category)
      if (filters?.search) params.set('search', filters.search)
      if (filters?.featured) params.set('featured', 'true')

      const response = await fetch(`/api/recipes/catalog?${params.toString()}`)
      if (!response.ok) {
        logger.shotCreator.error('Error fetching catalog recipes', { status: response.status })
        return { recipes: [], total: 0 }
      }
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error fetching catalog', { error: error instanceof Error ? error.message : String(error) })
      return { recipes: [], total: 0 }
    }
  }

  /**
   * Get a single catalog recipe by ID
   */
  async getCatalogRecipe(itemId: string): Promise<CatalogRecipe | null> {
    try {
      const response = await fetch(`/api/recipes/catalog/${itemId}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error fetching catalog recipe', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Add a catalog recipe to the user's personal collection
   * Creates a copy in user_recipes table
   */
  async addToCollection(catalogItemId: string): Promise<{ recipeId: string } | null> {
    try {
      const response = await fetch('/api/recipes/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogItemId }),
      })
      if (!response.ok) {
        const err = await response.json()
        logger.shotCreator.error('Error adding catalog recipe', { error: err })
        return null
      }
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error adding to collection', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Publish a user recipe to the catalog
   */
  async publishRecipe(recipeId: string, opts: {
    visibility: 'public' | 'unlisted'
    previewImageUrl?: string
  }): Promise<{ catalogItemId: string } | null> {
    try {
      const response = await fetch('/api/recipes/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, ...opts }),
      })
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error publishing recipe', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }
}

export const recipeCatalogService = new RecipeCatalogService()
