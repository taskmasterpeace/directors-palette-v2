import { Recipe, RecipeStage } from '../types/recipe.types'

/**
 * Validation result for recipe import operations
 */
export interface RecipeValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Expected structure of import/export data
 */
export interface RecipeExportData {
  version: string
  exportDate: string
  recipes: unknown[]
}

/**
 * Recipe Validation Service
 * Handles validation logic for recipe import operations
 * - Structure validation
 * - Required field validation
 * - Duplicate detection
 */
export class RecipeValidationService {
  /**
   * Validate the structure of export/import data
   * Checks that the data has the expected shape with a recipes array
   * @param data - The parsed JSON data to validate
   * @returns RecipeValidationResult with isValid flag and error messages
   */
  validateExportData(data: unknown): RecipeValidationResult {
    const errors: string[] = []

    if (!data || typeof data !== 'object') {
      errors.push('Invalid format: data must be an object')
      return { isValid: false, errors }
    }

    const dataObj = data as Record<string, unknown>

    if (!('recipes' in dataObj)) {
      errors.push('Invalid format: missing recipes array')
    } else if (!Array.isArray(dataObj.recipes)) {
      errors.push('Invalid format: recipes must be an array')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate the basic structure of a recipe object
   * Checks that the object has the expected shape
   * @param recipe - The recipe object to validate
   * @returns RecipeValidationResult with isValid flag and error messages
   */
  validateRecipeStructure(recipe: unknown): RecipeValidationResult {
    const errors: string[] = []

    // Check if recipe is an object
    if (!recipe || typeof recipe !== 'object') {
      errors.push('Recipe must be an object')
      return { isValid: false, errors }
    }

    const recipeObj = recipe as Record<string, unknown>

    // Check for name property
    if (!('name' in recipeObj)) {
      errors.push('Recipe is missing "name" property')
    } else if (typeof recipeObj.name !== 'string') {
      errors.push('Recipe "name" must be a string')
    }

    // Check for stages property
    if (!('stages' in recipeObj)) {
      errors.push('Recipe is missing "stages" property')
    } else if (!Array.isArray(recipeObj.stages)) {
      errors.push('Recipe "stages" must be an array')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate a recipe for import - checks all required fields and structure
   * @param recipe - The recipe to validate
   * @returns RecipeValidationResult with isValid flag and error messages
   */
  validateRecipeForImport(recipe: unknown): RecipeValidationResult {
    const errors: string[] = []

    // First check basic structure
    const structureResult = this.validateRecipeStructure(recipe)
    if (!structureResult.isValid) {
      return structureResult
    }

    const recipeObj = recipe as Record<string, unknown>

    // Validate name is not empty
    const name = recipeObj.name as string
    if (!name.trim()) {
      errors.push('Recipe name cannot be empty')
    } else if (name.length < 2) {
      errors.push('Recipe name must be at least 2 characters long')
    } else if (name.length > 100) {
      errors.push('Recipe name must not exceed 100 characters')
    }

    // Validate stages array is not empty
    const stages = recipeObj.stages as unknown[]
    if (stages.length === 0) {
      errors.push('Recipe must have at least one stage')
    } else {
      // Validate each stage
      stages.forEach((stage, index) => {
        const stageErrors = this.validateStage(stage, index)
        errors.push(...stageErrors)
      })
    }

    // Validate optional fields if present
    if ('description' in recipeObj && recipeObj.description !== undefined) {
      if (typeof recipeObj.description !== 'string') {
        errors.push('Recipe "description" must be a string')
      }
    }

    if ('categoryId' in recipeObj && recipeObj.categoryId !== undefined) {
      if (typeof recipeObj.categoryId !== 'string') {
        errors.push('Recipe "categoryId" must be a string')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate a single stage within a recipe
   * Each stage must have either a template (for generation) or toolId (for tool stages)
   * @param stage - The stage object to validate
   * @param index - The stage index (for error messages)
   * @returns Array of error messages
   */
  private validateStage(stage: unknown, index: number): string[] {
    const errors: string[] = []
    const stageNum = index + 1

    if (!stage || typeof stage !== 'object') {
      errors.push(`Stage ${stageNum}: must be an object`)
      return errors
    }

    const stageObj = stage as Record<string, unknown>

    // Check for either template or toolId (at least one must be present)
    const hasTemplate = 'template' in stageObj && typeof stageObj.template === 'string'
    const hasToolId = 'toolId' in stageObj && typeof stageObj.toolId === 'string'

    if (!hasTemplate && !hasToolId) {
      errors.push(`Stage ${stageNum}: must have either "template" or "toolId"`)
    }

    // If type is 'tool', toolId is required
    if (stageObj.type === 'tool' && !hasToolId) {
      errors.push(`Stage ${stageNum}: tool stages require a "toolId"`)
    }

    // If type is 'generation' or not specified, template should be present
    if (stageObj.type !== 'tool' && !hasTemplate) {
      // Only error if there's also no toolId (tool stages without type are ok)
      if (!hasToolId) {
        errors.push(`Stage ${stageNum}: generation stages require a "template"`)
      }
    }

    // Validate referenceImages if present
    if ('referenceImages' in stageObj && stageObj.referenceImages !== undefined) {
      if (!Array.isArray(stageObj.referenceImages)) {
        errors.push(`Stage ${stageNum}: "referenceImages" must be an array`)
      }
    }

    return errors
  }

  /**
   * Check if a recipe with the same name and categoryId already exists
   * @param existingRecipes - Array of existing recipes to check against
   * @param name - The recipe name to check
   * @param categoryId - The category ID to check (can be undefined)
   * @param excludeId - Optional recipe ID to exclude from the check (for updates)
   * @returns True if a duplicate exists, false otherwise
   */
  hasDuplicateRecipe(
    existingRecipes: Recipe[],
    name: string,
    categoryId: string | undefined,
    excludeId?: string
  ): boolean {
    const normalizedName = name.toLowerCase().trim()

    return existingRecipes.some(
      (recipe) =>
        recipe.name.toLowerCase().trim() === normalizedName &&
        recipe.categoryId === categoryId &&
        recipe.id !== excludeId
    )
  }

  /**
   * Sanitize a recipe object for import
   * Removes fields that shouldn't be imported (like userId, id) and ensures defaults
   * @param recipe - The recipe object to sanitize
   * @returns A sanitized recipe ready for import
   */
  sanitizeRecipeForImport(recipe: Record<string, unknown>): Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> {
    // Extract and sanitize stages
    const stages = (recipe.stages as RecipeStage[]).map((stage, index) => ({
      id: stage.id || `stage_${index}`,
      order: stage.order ?? index,
      type: stage.type,
      template: stage.template || '',
      toolId: stage.toolId,
      fields: stage.fields || [],
      referenceImages: stage.referenceImages || [],
    }))

    return {
      name: (recipe.name as string).trim(),
      description: recipe.description as string | undefined,
      recipeNote: recipe.recipeNote as string | undefined,
      stages,
      suggestedAspectRatio: recipe.suggestedAspectRatio as string | undefined,
      suggestedResolution: recipe.suggestedResolution as string | undefined,
      suggestedModel: recipe.suggestedModel as string | undefined,
      quickAccessLabel: recipe.quickAccessLabel as string | undefined,
      isQuickAccess: (recipe.isQuickAccess as boolean) ?? false,
      categoryId: recipe.categoryId as string | undefined,
      isSystem: false, // Imported recipes are never system recipes
      isSystemOnly: false, // Imported recipes are never system-only
    }
  }
}

// Singleton instance
export const recipeValidationService = new RecipeValidationService()
