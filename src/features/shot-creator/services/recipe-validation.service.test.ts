/**
 * Unit tests for Recipe Validation Service
 * Tests validation logic for recipe import operations including:
 * - validateRecipeForImport with valid/invalid data
 * - hasDuplicateRecipe edge cases
 * - validateRecipeStructure with missing fields
 * - validateExportData for structure validation
 * - sanitizeRecipeForImport for data cleaning
 */

import { describe, it, expect } from 'vitest'
import {
  RecipeValidationService,
  recipeValidationService,
  RecipeExportData,
} from './recipe-validation.service'
import { Recipe, RecipeStage } from '../types/recipe.types'

// ============================================================================
// TEST HELPERS
// ============================================================================

const createMockStage = (
  index: number,
  overrides: Partial<RecipeStage> = {}
): RecipeStage => ({
  id: `stage_${index}`,
  order: index,
  template: 'Test template with <<FIELD:text!>>',
  fields: [],
  referenceImages: [],
  ...overrides,
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

// ============================================================================
// TEST: RecipeValidationService Class
// ============================================================================

describe('RecipeValidationService', () => {
  it('should export a singleton instance', () => {
    expect(recipeValidationService).toBeInstanceOf(RecipeValidationService)
  })

  it('should be instantiable as a class', () => {
    const service = new RecipeValidationService()
    expect(service).toBeInstanceOf(RecipeValidationService)
  })
})

// ============================================================================
// TEST: validateRecipeStructure - Basic Structure Validation
// ============================================================================

describe('validateRecipeStructure', () => {
  describe('with invalid inputs', () => {
    it('should reject null recipe', () => {
      const result = recipeValidationService.validateRecipeStructure(null)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe must be an object')
    })

    it('should reject undefined recipe', () => {
      const result = recipeValidationService.validateRecipeStructure(undefined)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe must be an object')
    })

    it('should reject string as recipe', () => {
      const result = recipeValidationService.validateRecipeStructure('not a recipe')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe must be an object')
    })

    it('should reject number as recipe', () => {
      const result = recipeValidationService.validateRecipeStructure(42)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe must be an object')
    })

    it('should reject array as recipe', () => {
      const result = recipeValidationService.validateRecipeStructure([])

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('name'))).toBe(true)
    })
  })

  describe('with missing name property', () => {
    it('should reject recipe without name property', () => {
      const result = recipeValidationService.validateRecipeStructure({
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe is missing "name" property')
    })

    it('should reject recipe where name is not a string', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 123,
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe "name" must be a string')
    })

    it('should reject recipe where name is null', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: null,
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe "name" must be a string')
    })

    it('should reject recipe where name is an object', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: { text: 'Recipe Name' },
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe "name" must be a string')
    })
  })

  describe('with missing stages property', () => {
    it('should reject recipe without stages property', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 'Test Recipe',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe is missing "stages" property')
    })

    it('should reject recipe where stages is not an array', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 'Test Recipe',
        stages: 'not an array',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe "stages" must be an array')
    })

    it('should reject recipe where stages is null', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 'Test Recipe',
        stages: null,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe "stages" must be an array')
    })

    it('should reject recipe where stages is an object', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 'Test Recipe',
        stages: { 0: createMockStage(0) },
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe "stages" must be an array')
    })
  })

  describe('with multiple missing fields', () => {
    it('should report both missing name and stages', () => {
      const result = recipeValidationService.validateRecipeStructure({})

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe is missing "name" property')
      expect(result.errors).toContain('Recipe is missing "stages" property')
    })
  })

  describe('with valid structure', () => {
    it('should accept recipe with name and stages array', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 'Valid Recipe',
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipe with empty stages array (structure check only)', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 'Valid Recipe',
        stages: [],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipe with additional optional properties', () => {
      const result = recipeValidationService.validateRecipeStructure({
        name: 'Valid Recipe',
        stages: [createMockStage(0)],
        description: 'A description',
        categoryId: 'characters',
        isQuickAccess: true,
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})

// ============================================================================
// TEST: validateRecipeForImport - Full Import Validation
// ============================================================================

describe('validateRecipeForImport', () => {
  describe('with valid data', () => {
    it('should accept minimal valid recipe', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'My Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Generate a portrait' }],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipe with all optional fields', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Full Recipe',
        description: 'A complete recipe',
        recipeNote: 'Instructions here',
        stages: [createMockStage(0)],
        suggestedAspectRatio: '16:9',
        suggestedResolution: '1920x1080',
        suggestedModel: 'nano-banana-2',
        quickAccessLabel: 'Quick',
        isQuickAccess: true,
        categoryId: 'characters',
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipe with tool stage', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Tool Recipe',
        stages: [{
          id: 'stage_0',
          order: 0,
          type: 'tool',
          toolId: 'remove-background',
          template: '',
        }],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipe with multiple stages', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Multi-Stage Recipe',
        stages: [
          { id: 'stage_0', order: 0, template: 'First prompt' },
          { id: 'stage_1', order: 1, type: 'tool', toolId: 'remove-background', template: '' },
          { id: 'stage_2', order: 2, template: 'Second prompt' },
        ],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipe name at minimum length (2 characters)', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'AB',
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept recipe name at maximum length (100 characters)', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'A'.repeat(100),
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('with invalid name', () => {
    it('should reject empty name', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: '',
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('empty'))).toBe(true)
    })

    it('should reject whitespace-only name', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: '   ',
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('empty'))).toBe(true)
    })

    it('should reject name too short (1 character)', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'A',
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('2 characters'))).toBe(true)
    })

    it('should reject name too long (101+ characters)', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'A'.repeat(101),
        stages: [createMockStage(0)],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('100 characters'))).toBe(true)
    })
  })

  describe('with invalid stages', () => {
    it('should reject empty stages array', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('at least one stage'))).toBe(true)
    })

    it('should reject stage without template or toolId', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [{ id: 'stage_0', order: 0 }],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('template') || e.includes('toolId'))).toBe(true)
    })

    it('should reject stage that is not an object', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: ['not a stage object'],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Stage 1') && e.includes('object'))).toBe(true)
    })

    it('should reject null stage', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [null],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Stage 1'))).toBe(true)
    })

    it('should reject tool stage without toolId', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [{ id: 'stage_0', order: 0, type: 'tool', template: '' }],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('toolId'))).toBe(true)
    })

    it('should report errors for multiple invalid stages', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [
          { id: 'stage_0', order: 0 }, // Missing template/toolId
          { id: 'stage_1', order: 1, type: 'tool' }, // Tool without toolId
          { id: 'stage_2', order: 2, template: 'valid' }, // Valid
        ],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Stage 1'))).toBe(true)
      expect(result.errors.some(e => e.includes('Stage 2'))).toBe(true)
    })

    it('should reject non-array referenceImages in stage', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [{
          id: 'stage_0',
          order: 0,
          template: 'Valid template',
          referenceImages: 'not an array',
        }],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('referenceImages') && e.includes('array'))).toBe(true)
    })
  })

  describe('with invalid optional fields', () => {
    it('should reject non-string description', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
        description: 123,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('description') && e.includes('string'))).toBe(true)
    })

    it('should reject non-string categoryId', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
        categoryId: 456,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('categoryId') && e.includes('string'))).toBe(true)
    })

    it('should accept undefined optional fields', () => {
      const result = recipeValidationService.validateRecipeForImport({
        name: 'Test Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
        description: undefined,
        categoryId: undefined,
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('with structure validation integration', () => {
    it('should fail structure validation first before content validation', () => {
      const result = recipeValidationService.validateRecipeForImport(null)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe must be an object')
      // Should not have content-related errors since structure failed
      expect(result.errors.length).toBe(1)
    })

    it('should fail on missing name before checking stages content', () => {
      const result = recipeValidationService.validateRecipeForImport({
        stages: [],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Recipe is missing "name" property')
    })
  })
})

// ============================================================================
// TEST: hasDuplicateRecipe - Duplicate Detection
// ============================================================================

describe('hasDuplicateRecipe', () => {
  const existingRecipes: Recipe[] = [
    createMockRecipe({ id: 'recipe_1', name: 'Character Sheet', categoryId: undefined }),
    createMockRecipe({ id: 'recipe_2', name: 'Style Guide', categoryId: 'styles' }),
    createMockRecipe({ id: 'recipe_3', name: '9-Frame Cinematic', categoryId: 'scenes' }),
    createMockRecipe({ id: 'recipe_4', name: 'Product Shot', categoryId: undefined }),
    createMockRecipe({ id: 'recipe_5', name: 'Style Guide', categoryId: 'characters' }), // Same name, different category
  ]

  describe('basic duplicate detection', () => {
    it('should detect exact name match (no category)', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Character Sheet',
        undefined
      )

      expect(isDuplicate).toBe(true)
    })

    it('should detect exact name and category match', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Style Guide',
        'styles'
      )

      expect(isDuplicate).toBe(true)
    })

    it('should NOT detect duplicate for different name', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'New Unique Recipe',
        undefined
      )

      expect(isDuplicate).toBe(false)
    })

    it('should NOT detect duplicate for same name but different category', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Style Guide',
        'products' // Not in existing categories for "Style Guide"
      )

      expect(isDuplicate).toBe(false)
    })
  })

  describe('case insensitivity', () => {
    it('should be case-insensitive (uppercase match)', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'CHARACTER SHEET',
        undefined
      )

      expect(isDuplicate).toBe(true)
    })

    it('should be case-insensitive (lowercase match)', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'style guide',
        'styles'
      )

      expect(isDuplicate).toBe(true)
    })

    it('should be case-insensitive (mixed case match)', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        '9-fRaMe CiNeMaTiC',
        'scenes'
      )

      expect(isDuplicate).toBe(true)
    })
  })

  describe('whitespace handling', () => {
    it('should trim leading and trailing whitespace from name', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        '  Character Sheet  ',
        undefined
      )

      expect(isDuplicate).toBe(true)
    })

    it('should detect duplicate with only leading whitespace', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        '   Product Shot',
        undefined
      )

      expect(isDuplicate).toBe(true)
    })

    it('should detect duplicate with only trailing whitespace', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Product Shot   ',
        undefined
      )

      expect(isDuplicate).toBe(true)
    })
  })

  describe('category edge cases', () => {
    it('should distinguish between undefined and defined categories', () => {
      // "Character Sheet" has undefined category
      const isDuplicateWithCategory = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Character Sheet',
        'characters' // Adding a category
      )

      expect(isDuplicateWithCategory).toBe(false)
    })

    it('should find duplicate when both have undefined category', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Product Shot',
        undefined
      )

      expect(isDuplicate).toBe(true)
    })

    it('should handle empty string category differently from undefined', () => {
      // This tests that empty string is treated as a value, not as undefined
      // Note: In JavaScript, '' !== undefined, so this should return false
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Character Sheet',
        '' // Empty string, not undefined
      )

      // Empty string category won't match undefined category
      expect(isDuplicate).toBe(false)
    })
  })

  describe('excludeId parameter', () => {
    it('should exclude specific recipe ID from duplicate check', () => {
      // When updating "Character Sheet" (recipe_1), it shouldn't conflict with itself
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Character Sheet',
        undefined,
        'recipe_1' // Exclude this recipe
      )

      expect(isDuplicate).toBe(false)
    })

    it('should still detect other duplicates when excluding an ID', () => {
      // Excluding recipe_1, but there's still another recipe with same name+category
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Style Guide',
        'styles',
        'recipe_1' // Exclude a different recipe
      )

      expect(isDuplicate).toBe(true)
    })

    it('should work correctly when excluded ID does not match any recipe', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Character Sheet',
        undefined,
        'non_existent_id'
      )

      expect(isDuplicate).toBe(true)
    })

    it('should work correctly with undefined excludeId', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        'Character Sheet',
        undefined,
        undefined
      )

      expect(isDuplicate).toBe(true)
    })
  })

  describe('empty recipe list', () => {
    it('should return false for empty recipe list', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        [],
        'Any Recipe Name',
        undefined
      )

      expect(isDuplicate).toBe(false)
    })

    it('should return false for empty recipe list with category', () => {
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        [],
        'Any Recipe Name',
        'any-category'
      )

      expect(isDuplicate).toBe(false)
    })
  })

  describe('special characters in names', () => {
    it('should handle names with special characters', () => {
      const recipesWithSpecialChars: Recipe[] = [
        createMockRecipe({ name: "Sarah's Recipe", categoryId: undefined }),
        createMockRecipe({ name: 'Recipe #1 (Best!)', categoryId: 'test' }),
      ]

      const isDuplicate1 = recipeValidationService.hasDuplicateRecipe(
        recipesWithSpecialChars,
        "Sarah's Recipe",
        undefined
      )

      const isDuplicate2 = recipeValidationService.hasDuplicateRecipe(
        recipesWithSpecialChars,
        'Recipe #1 (Best!)',
        'test'
      )

      expect(isDuplicate1).toBe(true)
      expect(isDuplicate2).toBe(true)
    })

    it('should handle names with unicode characters', () => {
      const recipesWithUnicode: Recipe[] = [
        createMockRecipe({ name: 'Café Recipe ☕', categoryId: undefined }),
        createMockRecipe({ name: '日本語レシピ', categoryId: 'international' }),
      ]

      const isDuplicate1 = recipeValidationService.hasDuplicateRecipe(
        recipesWithUnicode,
        'Café Recipe ☕',
        undefined
      )

      const isDuplicate2 = recipeValidationService.hasDuplicateRecipe(
        recipesWithUnicode,
        '日本語レシピ',
        'international'
      )

      expect(isDuplicate1).toBe(true)
      expect(isDuplicate2).toBe(true)
    })
  })
})

// ============================================================================
// TEST: validateExportData - Export Structure Validation
// ============================================================================

describe('validateExportData', () => {
  describe('with invalid inputs', () => {
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

    it('should reject string data', () => {
      const result = recipeValidationService.validateExportData('{"recipes": []}')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: data must be an object')
    })

    it('should reject number data', () => {
      const result = recipeValidationService.validateExportData(42)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: data must be an object')
    })

    it('should reject boolean data', () => {
      const result = recipeValidationService.validateExportData(true)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: data must be an object')
    })
  })

  describe('with missing recipes property', () => {
    it('should reject empty object', () => {
      const result = recipeValidationService.validateExportData({})

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: missing recipes array')
    })

    it('should reject object without recipes key', () => {
      const result = recipeValidationService.validateExportData({
        version: '1.0',
        exportDate: new Date().toISOString(),
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: missing recipes array')
    })
  })

  describe('with invalid recipes property', () => {
    it('should reject when recipes is a string', () => {
      const result = recipeValidationService.validateExportData({
        recipes: 'not an array',
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: recipes must be an array')
    })

    it('should reject when recipes is null', () => {
      const result = recipeValidationService.validateExportData({
        recipes: null,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: recipes must be an array')
    })

    it('should reject when recipes is an object', () => {
      const result = recipeValidationService.validateExportData({
        recipes: { 0: 'recipe' },
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: recipes must be an array')
    })

    it('should reject when recipes is a number', () => {
      const result = recipeValidationService.validateExportData({
        recipes: 123,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid format: recipes must be an array')
    })
  })

  describe('with valid export data', () => {
    it('should accept minimal valid structure', () => {
      const result = recipeValidationService.validateExportData({
        recipes: [],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept full export structure', () => {
      const exportData: RecipeExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        recipes: [
          { name: 'Recipe 1', stages: [{ id: 'stage_0', order: 0, template: 'Test' }] },
          { name: 'Recipe 2', stages: [{ id: 'stage_0', order: 0, template: 'Test' }] },
        ],
      }

      const result = recipeValidationService.validateExportData(exportData)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept export data with extra properties', () => {
      const result = recipeValidationService.validateExportData({
        version: '1.0',
        exportDate: new Date().toISOString(),
        recipes: [],
        customField: 'extra data',
        anotherField: 123,
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})

// ============================================================================
// TEST: sanitizeRecipeForImport - Data Sanitization
// ============================================================================

describe('sanitizeRecipeForImport', () => {
  describe('field removal', () => {
    it('should not include id in sanitized output', () => {
      const recipe = {
        id: 'old_id_123',
        name: 'Test Recipe',
        stages: [createMockStage(0)],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized).not.toHaveProperty('id')
    })

    it('should not include createdAt in sanitized output', () => {
      const recipe = {
        name: 'Test Recipe',
        stages: [createMockStage(0)],
        createdAt: Date.now(),
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized).not.toHaveProperty('createdAt')
    })

    it('should not include updatedAt in sanitized output', () => {
      const recipe = {
        name: 'Test Recipe',
        stages: [createMockStage(0)],
        updatedAt: Date.now(),
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized).not.toHaveProperty('updatedAt')
    })

    it('should not include userId in sanitized output', () => {
      const recipe = {
        name: 'Test Recipe',
        stages: [createMockStage(0)],
        userId: 'user_123',
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized).not.toHaveProperty('userId')
    })
  })

  describe('name sanitization', () => {
    it('should trim whitespace from name', () => {
      const recipe = {
        name: '  Trimmed Recipe  ',
        stages: [createMockStage(0)],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.name).toBe('Trimmed Recipe')
    })

    it('should preserve name without whitespace', () => {
      const recipe = {
        name: 'Normal Recipe',
        stages: [createMockStage(0)],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.name).toBe('Normal Recipe')
    })
  })

  describe('system flags', () => {
    it('should set isSystem to false for imported recipes', () => {
      const recipe = {
        name: 'System Recipe',
        stages: [createMockStage(0)],
        isSystem: true,
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

    it('should set both system flags to false even if originally true', () => {
      const recipe = {
        name: 'System Recipe',
        stages: [createMockStage(0)],
        isSystem: true,
        isSystemOnly: true,
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.isSystem).toBe(false)
      expect(sanitized.isSystemOnly).toBe(false)
    })
  })

  describe('optional field preservation', () => {
    it('should preserve description when present', () => {
      const recipe = {
        name: 'Recipe',
        description: 'A helpful description',
        stages: [createMockStage(0)],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.description).toBe('A helpful description')
    })

    it('should preserve recipeNote when present', () => {
      const recipe = {
        name: 'Recipe',
        recipeNote: 'Instructions for use',
        stages: [createMockStage(0)],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.recipeNote).toBe('Instructions for use')
    })

    it('should preserve suggested settings', () => {
      const recipe = {
        name: 'Recipe',
        stages: [createMockStage(0)],
        suggestedAspectRatio: '16:9',
        suggestedResolution: '1920x1080',
        suggestedModel: 'nano-banana-2',
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.suggestedAspectRatio).toBe('16:9')
      expect(sanitized.suggestedResolution).toBe('1920x1080')
      expect(sanitized.suggestedModel).toBe('nano-banana-2')
    })

    it('should preserve quick access settings', () => {
      const recipe = {
        name: 'Recipe',
        stages: [createMockStage(0)],
        isQuickAccess: true,
        quickAccessLabel: 'Quick',
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.isQuickAccess).toBe(true)
      expect(sanitized.quickAccessLabel).toBe('Quick')
    })

    it('should preserve categoryId', () => {
      const recipe = {
        name: 'Recipe',
        stages: [createMockStage(0)],
        categoryId: 'characters',
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.categoryId).toBe('characters')
    })
  })

  describe('default values', () => {
    it('should default isQuickAccess to false if not specified', () => {
      const recipe = {
        name: 'Recipe',
        stages: [createMockStage(0)],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.isQuickAccess).toBe(false)
    })

    it('should preserve isQuickAccess true value', () => {
      const recipe = {
        name: 'Recipe',
        stages: [createMockStage(0)],
        isQuickAccess: true,
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.isQuickAccess).toBe(true)
    })
  })

  describe('stage sanitization', () => {
    it('should preserve stage IDs or generate defaults', () => {
      const recipe = {
        name: 'Recipe',
        stages: [
          { id: 'custom_id', order: 0, template: 'Test' },
          { order: 1, template: 'Test 2' }, // No ID
        ],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.stages[0].id).toBe('custom_id')
      expect(sanitized.stages[1].id).toBe('stage_1')
    })

    it('should preserve stage order or default to index', () => {
      const recipe = {
        name: 'Recipe',
        stages: [
          { id: 'stage_0', template: 'Test' }, // No order
          { id: 'stage_1', order: 5, template: 'Test 2' },
        ],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.stages[0].order).toBe(0)
      expect(sanitized.stages[1].order).toBe(5)
    })

    it('should default template to empty string if missing', () => {
      const recipe = {
        name: 'Recipe',
        stages: [
          { id: 'stage_0', order: 0, type: 'tool', toolId: 'remove-background' },
        ],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.stages[0].template).toBe('')
    })

    it('should default fields to empty array', () => {
      const recipe = {
        name: 'Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.stages[0].fields).toEqual([])
    })

    it('should default referenceImages to empty array', () => {
      const recipe = {
        name: 'Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.stages[0].referenceImages).toEqual([])
    })

    it('should preserve existing fields and referenceImages', () => {
      const recipe = {
        name: 'Recipe',
        stages: [{
          id: 'stage_0',
          order: 0,
          template: 'Test',
          fields: [{ id: 'field_1', name: 'TEST', label: 'Test', type: 'text', required: true, placeholder: 'Test!' }],
          referenceImages: [{ id: 'img_1', url: 'http://example.com/img.png' }],
        }],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.stages[0].fields).toHaveLength(1)
      expect(sanitized.stages[0].referenceImages).toHaveLength(1)
    })

    it('should preserve stage type and toolId', () => {
      const recipe = {
        name: 'Recipe',
        stages: [{
          id: 'stage_0',
          order: 0,
          type: 'tool',
          toolId: 'remove-background',
          template: '',
        }],
      }

      const sanitized = recipeValidationService.sanitizeRecipeForImport(recipe)

      expect(sanitized.stages[0].type).toBe('tool')
      expect(sanitized.stages[0].toolId).toBe('remove-background')
    })
  })
})

// ============================================================================
// TEST: Integration Scenarios
// ============================================================================

describe('Integration Scenarios', () => {
  describe('full import workflow validation', () => {
    it('should validate and sanitize a complete recipe', () => {
      const importedRecipe = {
        id: 'external_id_123',
        name: '  My Imported Recipe  ',
        description: 'An imported recipe',
        stages: [
          { id: 'stage_0', order: 0, template: 'Generate <<CHARACTER:name!>>' },
          { id: 'stage_1', order: 1, type: 'tool', toolId: 'remove-background', template: '' },
        ],
        isSystem: true,
        isSystemOnly: true,
        createdAt: 12345,
        updatedAt: 67890,
        userId: 'external_user',
      }

      // Step 1: Validate
      const validationResult = recipeValidationService.validateRecipeForImport(importedRecipe)
      expect(validationResult.isValid).toBe(true)

      // Step 2: Sanitize
      const sanitized = recipeValidationService.sanitizeRecipeForImport(importedRecipe)

      // Verify sanitization
      expect(sanitized.name).toBe('My Imported Recipe')
      expect(sanitized.isSystem).toBe(false)
      expect(sanitized.isSystemOnly).toBe(false)
      expect(sanitized).not.toHaveProperty('id')
      expect(sanitized).not.toHaveProperty('createdAt')
      expect(sanitized).not.toHaveProperty('updatedAt')
      expect(sanitized).not.toHaveProperty('userId')
    })

    it('should handle import with duplicate detection', () => {
      const existingRecipes: Recipe[] = [
        createMockRecipe({ name: 'Existing Recipe', categoryId: 'characters' }),
      ]

      const newRecipe = {
        name: 'Existing Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test' }],
        categoryId: 'characters',
      }

      // Step 1: Validate
      const validationResult = recipeValidationService.validateRecipeForImport(newRecipe)
      expect(validationResult.isValid).toBe(true)

      // Step 2: Check for duplicates
      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        newRecipe.name,
        newRecipe.categoryId
      )
      expect(isDuplicate).toBe(true)
    })
  })

  describe('batch import scenario', () => {
    it('should handle mixed valid and invalid recipes', () => {
      const recipesToImport = [
        { name: 'Valid Recipe 1', stages: [{ template: 'Test' }] },
        { name: '', stages: [{ template: 'Test' }] }, // Invalid: empty name
        { name: 'Valid Recipe 2', stages: [{ template: 'Test 2' }] },
        { stages: [{ template: 'Test' }] }, // Invalid: missing name
        { name: 'Valid Recipe 3', stages: [] }, // Invalid: no stages
      ]

      const results = recipesToImport.map(recipe =>
        recipeValidationService.validateRecipeForImport(recipe)
      )

      expect(results[0].isValid).toBe(true) // Valid Recipe 1
      expect(results[1].isValid).toBe(false) // Empty name
      expect(results[2].isValid).toBe(true) // Valid Recipe 2
      expect(results[3].isValid).toBe(false) // Missing name
      expect(results[4].isValid).toBe(false) // No stages

      // Count valid vs invalid
      const validCount = results.filter(r => r.isValid).length
      const invalidCount = results.filter(r => !r.isValid).length

      expect(validCount).toBe(2)
      expect(invalidCount).toBe(3)
    })
  })
})
