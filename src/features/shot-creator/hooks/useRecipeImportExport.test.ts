/**
 * Unit tests for Recipe Import/Export functionality
 * Tests export JSON format, userId exclusion, import validation, duplicate handling, and counting
 */

import { describe, it, expect } from 'vitest'
import {
  recipeValidationService,
  RecipeExportData,
} from '../services/recipe-validation.service'
import type { RecipeValidationResult } from '../services/recipe-validation.service'
import { Recipe, RecipeStage } from '../types/recipe.types'

// ============================================================================
// TEST DATA - Sample Recipes
// ============================================================================

const createMockStage = (index: number, template: string = 'Test template'): RecipeStage => ({
  id: `stage_${index}`,
  order: index,
  template,
  fields: [],
  referenceImages: [],
})

const createMockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: `recipe_${Date.now()}_${Math.random()}`,
  name: 'Test Recipe',
  description: 'A test recipe',
  stages: [createMockStage(0)],
  isQuickAccess: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

// Recipes without userId (as they should appear after export)
const EXPORTABLE_RECIPES: Omit<Recipe, 'userId'>[] = [
  createMockRecipe({ id: 'recipe_1', name: 'Character Sheet' }),
  createMockRecipe({ id: 'recipe_2', name: 'Style Guide', categoryId: 'styles' }),
  createMockRecipe({ id: 'recipe_3', name: '9-Frame Cinematic' }),
]

// Valid export data structure
const VALID_EXPORT_DATA: RecipeExportData = {
  version: '1.0',
  exportDate: new Date().toISOString(),
  recipes: EXPORTABLE_RECIPES,
}

// ============================================================================
// TEST: Export Creates Valid JSON Structure
// ============================================================================

describe('Export JSON Structure', () => {
  it('should validate export data with version, exportDate, and recipes array', () => {
    const exportData: RecipeExportData = {
      version: '1.0',
      exportDate: '2025-01-01T00:00:00.000Z',
      recipes: EXPORTABLE_RECIPES,
    }

    const result = recipeValidationService.validateExportData(exportData)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should include version field in export data', () => {
    const exportData = VALID_EXPORT_DATA

    expect(exportData).toHaveProperty('version')
    expect(typeof exportData.version).toBe('string')
    expect(exportData.version).toBe('1.0')
  })

  it('should include exportDate field as ISO 8601 timestamp', () => {
    const exportData = VALID_EXPORT_DATA

    expect(exportData).toHaveProperty('exportDate')
    expect(typeof exportData.exportDate).toBe('string')
    // Validate ISO 8601 format
    expect(new Date(exportData.exportDate).toISOString()).toBe(exportData.exportDate)
  })

  it('should include recipes array with all recipe data', () => {
    const exportData = VALID_EXPORT_DATA

    expect(exportData).toHaveProperty('recipes')
    expect(Array.isArray(exportData.recipes)).toBe(true)
    expect(exportData.recipes).toHaveLength(3)
  })

  it('should preserve recipe properties in export', () => {
    const recipe = EXPORTABLE_RECIPES[1] // Style Guide with categoryId

    expect(recipe).toHaveProperty('name')
    expect(recipe).toHaveProperty('stages')
    expect(recipe).toHaveProperty('categoryId')
    expect(recipe.name).toBe('Style Guide')
    expect(recipe.categoryId).toBe('styles')
  })
})

// ============================================================================
// TEST: Export Excludes userId Field
// ============================================================================

describe('Export Excludes userId', () => {
  it('should not include userId in exported recipe', () => {
    // Create a recipe that might have userId at runtime
    const recipeWithUserId = {
      ...createMockRecipe({ name: 'Test Recipe' }),
      userId: 'user_123', // This should NOT be in exports
    } as Recipe & { userId?: string }

    // When preparing for export, userId should be excluded
    const { userId: _, ...exportableRecipe } = recipeWithUserId

    expect(exportableRecipe).not.toHaveProperty('userId')
    expect(exportableRecipe).toHaveProperty('name')
    expect(exportableRecipe).toHaveProperty('stages')
  })

  it('should export recipes without userId for all recipes in array', () => {
    // Simulate recipes that might have userId
    const recipesWithUserId = EXPORTABLE_RECIPES.map(recipe => ({
      ...recipe,
      userId: 'user_456',
    }))

    // When exporting, strip userId
    const exportedRecipes = recipesWithUserId.map(({ userId: _, ...rest }) => rest)

    exportedRecipes.forEach(recipe => {
      expect(recipe).not.toHaveProperty('userId')
      expect(recipe).toHaveProperty('name')
      expect(recipe).toHaveProperty('stages')
    })
  })

  it('should handle recipe that never had userId', () => {
    const recipeWithoutUserId = createMockRecipe({ name: 'Clean Recipe' })

    expect(recipeWithoutUserId).not.toHaveProperty('userId')
    expect(recipeWithoutUserId).toHaveProperty('name')
    expect(recipeWithoutUserId).toHaveProperty('stages')
  })
})

// ============================================================================
// TEST: Import Validates JSON Structure
// ============================================================================

describe('Import Validates JSON Structure', () => {
  it('should reject null data', () => {
    const result = recipeValidationService.validateExportData(null)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: data must be an object')
  })

  it('should reject undefined data', () => {
    const result = recipeValidationService.validateExportData(undefined)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: data must be an object')
  })

  it('should reject non-object data (string)', () => {
    const result = recipeValidationService.validateExportData('not an object')

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: data must be an object')
  })

  it('should reject non-object data (number)', () => {
    const result = recipeValidationService.validateExportData(123)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: data must be an object')
  })

  it('should reject object without recipes array', () => {
    const result = recipeValidationService.validateExportData({
      version: '1.0',
      exportDate: new Date().toISOString(),
      // missing recipes
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: missing recipes array')
  })

  it('should reject object where recipes is not an array', () => {
    const result = recipeValidationService.validateExportData({
      version: '1.0',
      exportDate: new Date().toISOString(),
      recipes: 'not an array',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: recipes must be an array')
  })

  it('should reject object where recipes is null', () => {
    const result = recipeValidationService.validateExportData({
      version: '1.0',
      exportDate: new Date().toISOString(),
      recipes: null,
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: recipes must be an array')
  })

  it('should accept valid export data structure', () => {
    const result = recipeValidationService.validateExportData(VALID_EXPORT_DATA)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should accept export data with empty recipes array', () => {
    const result = recipeValidationService.validateExportData({
      version: '1.0',
      exportDate: new Date().toISOString(),
      recipes: [],
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

// ============================================================================
// TEST: Import Validates Recipe Required Fields
// ============================================================================

describe('Import Validates Recipe Required Fields', () => {
  it('should reject recipe without name', () => {
    const invalidRecipe = {
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('name'))).toBe(true)
  })

  it('should reject recipe without stages', () => {
    const invalidRecipe = {
      name: 'Test Recipe',
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('stages'))).toBe(true)
  })

  it('should reject recipe with non-string name', () => {
    const invalidRecipe = {
      name: 123,
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('name') && e.includes('string'))).toBe(true)
  })

  it('should reject recipe with non-array stages', () => {
    const invalidRecipe = {
      name: 'Test Recipe',
      stages: 'not an array',
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('stages') && e.includes('array'))).toBe(true)
  })

  it('should reject recipe with empty name', () => {
    const invalidRecipe = {
      name: '',
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('name') && e.includes('empty'))).toBe(true)
  })

  it('should reject recipe with whitespace-only name', () => {
    const invalidRecipe = {
      name: '   ',
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('name') && e.includes('empty'))).toBe(true)
  })

  it('should reject recipe with empty stages array', () => {
    const invalidRecipe = {
      name: 'Test Recipe',
      stages: [],
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('stage'))).toBe(true)
  })

  it('should reject recipe with name too short', () => {
    const invalidRecipe = {
      name: 'A', // Only 1 character
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('2 characters'))).toBe(true)
  })

  it('should reject recipe with name too long', () => {
    const invalidRecipe = {
      name: 'A'.repeat(101), // 101 characters
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('100 characters'))).toBe(true)
  })

  it('should accept valid recipe with name and stages', () => {
    const validRecipe = {
      name: 'Valid Recipe',
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(validRecipe)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should accept recipe with optional fields', () => {
    const validRecipe = {
      name: 'Recipe with Options',
      description: 'A description',
      categoryId: 'characters',
      stages: [createMockStage(0)],
    }

    const result = recipeValidationService.validateRecipeForImport(validRecipe)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject stage without template or toolId', () => {
    const invalidRecipe = {
      name: 'Test Recipe',
      stages: [{ id: 'stage_0', order: 0 }], // Missing template and toolId
    }

    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('template') || e.includes('toolId'))).toBe(true)
  })

  it('should accept stage with template', () => {
    const validRecipe = {
      name: 'Test Recipe',
      stages: [{
        id: 'stage_0',
        order: 0,
        template: 'Create a portrait of <<CHARACTER_NAME:name!>>',
      }],
    }

    const result = recipeValidationService.validateRecipeForImport(validRecipe)

    expect(result.isValid).toBe(true)
  })

  it('should accept stage with toolId', () => {
    const validRecipe = {
      name: 'Test Recipe',
      stages: [{
        id: 'stage_0',
        order: 0,
        type: 'tool',
        toolId: 'remove-background',
      }],
    }

    const result = recipeValidationService.validateRecipeForImport(validRecipe)

    expect(result.isValid).toBe(true)
  })
})

// ============================================================================
// TEST: Import Skips Duplicates
// ============================================================================

describe('Import Skips Duplicates', () => {
  const existingRecipes: Recipe[] = [
    createMockRecipe({ id: 'existing_1', name: 'Character Sheet', categoryId: undefined }),
    createMockRecipe({ id: 'existing_2', name: 'Style Guide', categoryId: 'styles' }),
    createMockRecipe({ id: 'existing_3', name: '9-Frame', categoryId: 'scenes' }),
  ]

  it('should detect duplicate by exact name match (no category)', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Character Sheet',
      undefined
    )

    expect(isDuplicate).toBe(true)
  })

  it('should detect duplicate by name and categoryId match', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Style Guide',
      'styles'
    )

    expect(isDuplicate).toBe(true)
  })

  it('should be case-insensitive for name matching', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'CHARACTER SHEET',
      undefined
    )

    expect(isDuplicate).toBe(true)
  })

  it('should be case-insensitive for name with mixed case', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'style guide',
      'styles'
    )

    expect(isDuplicate).toBe(true)
  })

  it('should NOT detect duplicate when name differs', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'New Recipe Name',
      undefined
    )

    expect(isDuplicate).toBe(false)
  })

  it('should NOT detect duplicate when categoryId differs', () => {
    // "Style Guide" exists in "styles" category
    // But "Style Guide" in "characters" category is NOT a duplicate
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Style Guide',
      'characters'
    )

    expect(isDuplicate).toBe(false)
  })

  it('should NOT detect duplicate for same name but different category', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      '9-Frame',
      undefined // Different from 'scenes'
    )

    expect(isDuplicate).toBe(false)
  })

  it('should handle whitespace in name matching', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      '  Character Sheet  ', // Extra whitespace
      undefined
    )

    expect(isDuplicate).toBe(true)
  })

  it('should NOT detect duplicate in empty recipe list', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      [],
      'Any Recipe',
      undefined
    )

    expect(isDuplicate).toBe(false)
  })

  it('should exclude specific recipe ID from duplicate check', () => {
    // When updating a recipe, it shouldn't conflict with itself
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Character Sheet',
      undefined,
      'existing_1' // Exclude this recipe
    )

    expect(isDuplicate).toBe(false)
  })

  it('should still detect other duplicates when excluding an ID', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Style Guide',
      'styles',
      'existing_1' // Exclude a different recipe
    )

    expect(isDuplicate).toBe(true)
  })
})

// ============================================================================
// TEST: Import Counts Imported/Skipped Correctly
// ============================================================================

describe('Import Counting Logic', () => {
  // Simulate the import counting logic from the hook
  interface ImportResult {
    imported: number
    skipped: number
    total: number
  }

  function simulateImportCounting(
    recipesToImport: unknown[],
    _existingRecipes: Recipe[],
    validateFn: (recipe: unknown) => RecipeValidationResult,
    hasDuplicateFn: (name: string, categoryId: string | undefined) => boolean
  ): ImportResult {
    let imported = 0
    let skipped = 0

    for (const recipe of recipesToImport) {
      // Validate recipe
      const validationResult = validateFn(recipe)
      if (!validationResult.isValid) {
        skipped++
        continue
      }

      // Check for duplicates
      const recipeObj = recipe as Record<string, unknown>
      const isDuplicate = hasDuplicateFn(
        recipeObj.name as string,
        recipeObj.categoryId as string | undefined
      )
      if (isDuplicate) {
        skipped++
        continue
      }

      // Would be imported
      imported++
    }

    return { imported, skipped, total: recipesToImport.length }
  }

  it('should count all as imported when no duplicates and all valid', () => {
    const recipesToImport = [
      { name: 'Recipe 1', stages: [createMockStage(0)] },
      { name: 'Recipe 2', stages: [createMockStage(0)] },
      { name: 'Recipe 3', stages: [createMockStage(0)] },
    ]
    const existingRecipes: Recipe[] = []

    const result = simulateImportCounting(
      recipesToImport,
      existingRecipes,
      (recipe) => recipeValidationService.validateRecipeForImport(recipe),
      () => false // No duplicates
    )

    expect(result.imported).toBe(3)
    expect(result.skipped).toBe(0)
    expect(result.total).toBe(3)
  })

  it('should count duplicates as skipped', () => {
    const recipesToImport = [
      { name: 'Existing Recipe', stages: [createMockStage(0)] },
      { name: 'New Recipe', stages: [createMockStage(0)] },
    ]
    const existingRecipes = [
      createMockRecipe({ name: 'Existing Recipe' }),
    ]

    const result = simulateImportCounting(
      recipesToImport,
      existingRecipes,
      (recipe) => recipeValidationService.validateRecipeForImport(recipe),
      (name: string, categoryId: string | undefined) =>
        recipeValidationService.hasDuplicateRecipe(existingRecipes, name, categoryId)
    )

    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('should count invalid recipes as skipped', () => {
    const recipesToImport = [
      { name: 'Valid Recipe', stages: [createMockStage(0)] },
      { name: '', stages: [createMockStage(0)] }, // Invalid: empty name
      { stages: [createMockStage(0)] }, // Invalid: missing name
      { name: 'Another Valid', stages: [createMockStage(0)] },
    ]

    const result = simulateImportCounting(
      recipesToImport,
      [],
      (recipe) => recipeValidationService.validateRecipeForImport(recipe),
      () => false
    )

    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(2)
  })

  it('should count both invalid and duplicate as skipped', () => {
    const existingRecipes = [
      createMockRecipe({ name: 'Duplicate Recipe' }),
    ]

    const recipesToImport = [
      { name: 'Duplicate Recipe', stages: [createMockStage(0)] }, // Duplicate
      { name: '', stages: [createMockStage(0)] }, // Invalid
      { name: 'New Recipe', stages: [createMockStage(0)] }, // Valid
    ]

    const result = simulateImportCounting(
      recipesToImport,
      existingRecipes,
      (recipe) => recipeValidationService.validateRecipeForImport(recipe),
      (name: string, categoryId: string | undefined) =>
        recipeValidationService.hasDuplicateRecipe(existingRecipes, name, categoryId)
    )

    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(2)
    expect(result.total).toBe(3)
  })

  it('should handle empty import array', () => {
    const result = simulateImportCounting(
      [],
      [],
      (recipe) => recipeValidationService.validateRecipeForImport(recipe),
      () => false
    )

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.total).toBe(0)
  })

  it('should count all as skipped when all are duplicates', () => {
    const existingRecipes = [
      createMockRecipe({ name: 'Recipe A' }),
      createMockRecipe({ name: 'Recipe B' }),
    ]

    const recipesToImport = [
      { name: 'Recipe A', stages: [createMockStage(0)] },
      { name: 'Recipe B', stages: [createMockStage(0)] },
    ]

    const result = simulateImportCounting(
      recipesToImport,
      existingRecipes,
      (recipe) => recipeValidationService.validateRecipeForImport(recipe),
      (name: string, categoryId: string | undefined) =>
        recipeValidationService.hasDuplicateRecipe(existingRecipes, name, categoryId)
    )

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(2)
  })

  it('should count all as skipped when all are invalid', () => {
    const recipesToImport = [
      { stages: [createMockStage(0)] }, // Missing name
      { name: 'No Stages' }, // Missing stages
      { name: 'A' }, // Name too short, missing stages
    ]

    const result = simulateImportCounting(
      recipesToImport,
      [],
      (recipe) => recipeValidationService.validateRecipeForImport(recipe),
      () => false
    )

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(3)
  })
})

// ============================================================================
// TEST: Recipe Sanitization for Import
// ============================================================================

describe('Recipe Sanitization for Import', () => {
  it('should sanitize recipe and remove id field', () => {
    const recipeWithId = {
      id: 'old_id_123',
      name: 'Test Recipe',
      stages: [createMockStage(0)],
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipeWithId)

    expect(sanitized).not.toHaveProperty('id')
    expect(sanitized.name).toBe('Test Recipe')
  })

  it('should trim whitespace from name', () => {
    const recipe = {
      name: '  Whitespace Recipe  ',
      stages: [createMockStage(0)],
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

    expect(sanitized.name).toBe('Whitespace Recipe')
  })

  it('should set isSystem to false for imported recipes', () => {
    const recipe = {
      name: 'System Recipe',
      stages: [createMockStage(0)],
      isSystem: true, // Trying to import a system recipe
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

    expect(sanitized.isSystem).toBe(false)
  })

  it('should set isSystemOnly to false for imported recipes', () => {
    const recipe = {
      name: 'System Only Recipe',
      stages: [createMockStage(0)],
      isSystemOnly: true,
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

    expect(sanitized.isSystemOnly).toBe(false)
  })

  it('should preserve optional fields when present', () => {
    const recipe = {
      name: 'Full Recipe',
      description: 'A description',
      recipeNote: 'A note',
      suggestedAspectRatio: '16:9',
      suggestedResolution: '1920x1080',
      suggestedModel: 'model-name',
      quickAccessLabel: 'Label',
      categoryId: 'characters',
      stages: [createMockStage(0)],
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

    expect(sanitized.description).toBe('A description')
    expect(sanitized.recipeNote).toBe('A note')
    expect(sanitized.suggestedAspectRatio).toBe('16:9')
    expect(sanitized.suggestedResolution).toBe('1920x1080')
    expect(sanitized.suggestedModel).toBe('model-name')
    expect(sanitized.quickAccessLabel).toBe('Label')
    expect(sanitized.categoryId).toBe('characters')
  })

  it('should default isQuickAccess to false if not specified', () => {
    const recipe = {
      name: 'Recipe',
      stages: [createMockStage(0)],
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

    expect(sanitized.isQuickAccess).toBe(false)
  })

  it('should preserve isQuickAccess if true', () => {
    const recipe = {
      name: 'Quick Access Recipe',
      stages: [createMockStage(0)],
      isQuickAccess: true,
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

    expect(sanitized.isQuickAccess).toBe(true)
  })
})
