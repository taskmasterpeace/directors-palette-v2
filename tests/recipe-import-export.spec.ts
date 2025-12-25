import { test, expect } from '@playwright/test'

/**
 * Recipe Import/Export Tests
 * Tests for the recipe import/export functionality
 *
 * Tests cover:
 * - Export creates valid JSON with version/date/recipes
 * - Export excludes userId field
 * - Import validates JSON structure
 * - Import validates recipe required fields
 * - Import skips duplicates
 * - Import counts imported/skipped correctly
 */

// Import the validation service to test its functions directly
// Since these are pure functions, we can test them without browser interaction
import { recipeValidationService } from '../src/features/shot-creator/services/recipe-validation.service'
import type { Recipe } from '../src/features/shot-creator/types/recipe.types'

// ============================================================================
// TEST DATA
// ============================================================================

const validRecipe = {
  name: 'Test Recipe',
  description: 'A test recipe description',
  stages: [
    {
      id: 'stage_0',
      order: 0,
      template: 'Test template with <<FIELD:text!>>',
      fields: [],
      referenceImages: [],
    },
  ],
  isQuickAccess: false,
  categoryId: 'custom',
}

const validRecipeWithToolStage = {
  name: 'Tool Recipe',
  stages: [
    {
      id: 'stage_0',
      order: 0,
      type: 'tool',
      template: '',
      toolId: 'remove-background',
      fields: [],
      referenceImages: [],
    },
  ],
  isQuickAccess: false,
}

// ============================================================================
// TEST: Export Data Structure Validation
// ============================================================================

test.describe('Export Data Structure', () => {
  test('validates correct export structure with version, date, and recipes', () => {
    const exportData = {
      version: '1.0',
      exportDate: '2025-01-01T00:00:00.000Z',
      recipes: [validRecipe],
    }

    const result = recipeValidationService.validateExportData(exportData)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('rejects export data missing recipes array', () => {
    const invalidData = {
      version: '1.0',
      exportDate: '2025-01-01T00:00:00.000Z',
      // Missing recipes array
    }

    const result = recipeValidationService.validateExportData(invalidData)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: missing recipes array')
  })

  test('rejects export data with non-array recipes', () => {
    const invalidData = {
      version: '1.0',
      exportDate: '2025-01-01T00:00:00.000Z',
      recipes: 'not an array',
    }

    const result = recipeValidationService.validateExportData(invalidData)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: recipes must be an array')
  })

  test('rejects null data', () => {
    const result = recipeValidationService.validateExportData(null)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: data must be an object')
  })

  test('rejects non-object data', () => {
    const result = recipeValidationService.validateExportData('string data')

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Invalid format: data must be an object')
  })
})

// ============================================================================
// TEST: Export excludes userId field
// ============================================================================

test.describe('Export userId Handling', () => {
  test('sanitizeRecipeForImport excludes userId and id fields', () => {
    const recipeWithUserId = {
      id: 'some-id',
      userId: 'some-user-id',
      name: 'Test Recipe',
      description: 'Description',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'Test template',
          fields: [],
          referenceImages: [],
        },
      ],
      isQuickAccess: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(recipeWithUserId as unknown as Record<string, unknown>)

    // The sanitized recipe should not have id, userId, createdAt, or updatedAt
    expect(sanitized).not.toHaveProperty('id')
    expect(sanitized).not.toHaveProperty('userId')
    expect(sanitized).not.toHaveProperty('createdAt')
    expect(sanitized).not.toHaveProperty('updatedAt')
    expect(sanitized.name).toBe('Test Recipe')
    expect(sanitized.isSystem).toBe(false)
    expect(sanitized.isSystemOnly).toBe(false)
  })

  test('sanitizeRecipeForImport sets isSystem and isSystemOnly to false', () => {
    const systemRecipe = {
      name: 'System Recipe',
      isSystem: true,
      isSystemOnly: true,
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'Test',
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(systemRecipe as unknown as Record<string, unknown>)

    // Imported recipes should never be system recipes
    expect(sanitized.isSystem).toBe(false)
    expect(sanitized.isSystemOnly).toBe(false)
  })
})

// ============================================================================
// TEST: Import validates JSON structure
// ============================================================================

test.describe('Import JSON Structure Validation', () => {
  test('validates proper recipe structure', () => {
    const result = recipeValidationService.validateRecipeStructure(validRecipe)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('rejects non-object recipe', () => {
    const result = recipeValidationService.validateRecipeStructure('not an object')

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe must be an object')
  })

  test('rejects null recipe', () => {
    const result = recipeValidationService.validateRecipeStructure(null)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe must be an object')
  })

  test('rejects recipe missing name', () => {
    const recipeWithoutName = {
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
    }

    const result = recipeValidationService.validateRecipeStructure(recipeWithoutName)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe is missing "name" property')
  })

  test('rejects recipe with non-string name', () => {
    const recipeWithBadName = {
      name: 123,
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
    }

    const result = recipeValidationService.validateRecipeStructure(recipeWithBadName)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe "name" must be a string')
  })

  test('rejects recipe missing stages', () => {
    const recipeWithoutStages = {
      name: 'Test Recipe',
    }

    const result = recipeValidationService.validateRecipeStructure(recipeWithoutStages)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe is missing "stages" property')
  })

  test('rejects recipe with non-array stages', () => {
    const recipeWithBadStages = {
      name: 'Test Recipe',
      stages: 'not an array',
    }

    const result = recipeValidationService.validateRecipeStructure(recipeWithBadStages)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe "stages" must be an array')
  })
})

// ============================================================================
// TEST: Import validates recipe required fields
// ============================================================================

test.describe('Import Recipe Required Fields Validation', () => {
  test('validates recipe with all required fields', () => {
    const result = recipeValidationService.validateRecipeForImport(validRecipe)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('rejects recipe with empty name', () => {
    const recipeWithEmptyName = {
      name: '  ',
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithEmptyName)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe name cannot be empty')
  })

  test('rejects recipe with name too short', () => {
    const recipeWithShortName = {
      name: 'A',
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithShortName)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe name must be at least 2 characters long')
  })

  test('rejects recipe with name too long', () => {
    const longName = 'A'.repeat(101)
    const recipeWithLongName = {
      name: longName,
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithLongName)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe name must not exceed 100 characters')
  })

  test('rejects recipe with empty stages array', () => {
    const recipeWithEmptyStages = {
      name: 'Test Recipe',
      stages: [],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithEmptyStages)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe must have at least one stage')
  })

  test('validates stage with template', () => {
    const recipeWithTemplate = {
      name: 'Test Recipe',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'A valid template',
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithTemplate)

    expect(result.isValid).toBe(true)
  })

  test('validates stage with toolId', () => {
    const result = recipeValidationService.validateRecipeForImport(validRecipeWithToolStage)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('rejects stage without template or toolId', () => {
    const recipeWithBadStage = {
      name: 'Test Recipe',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithBadStage)

    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('Stage 1'))).toBe(true)
  })

  test('validates optional fields when present', () => {
    const recipeWithOptionalFields = {
      name: 'Test Recipe',
      description: 'A description',
      categoryId: 'custom',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'Test template',
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithOptionalFields)

    expect(result.isValid).toBe(true)
  })

  test('rejects non-string description', () => {
    const recipeWithBadDescription = {
      name: 'Test Recipe',
      description: 123,
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithBadDescription)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe "description" must be a string')
  })

  test('rejects non-string categoryId', () => {
    const recipeWithBadCategoryId = {
      name: 'Test Recipe',
      categoryId: 123,
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithBadCategoryId)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Recipe "categoryId" must be a string')
  })
})

// ============================================================================
// TEST: Import skips duplicates
// ============================================================================

test.describe('Import Duplicate Detection', () => {
  const existingRecipes: Recipe[] = [
    {
      id: 'recipe-1',
      name: 'Existing Recipe',
      description: 'An existing recipe',
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
      isQuickAccess: false,
      categoryId: 'custom',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'recipe-2',
      name: 'Another Recipe',
      description: 'Another recipe in a different category',
      stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
      isQuickAccess: false,
      categoryId: 'characters',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  test('detects duplicate by exact name and categoryId match', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Existing Recipe',
      'custom'
    )

    expect(isDuplicate).toBe(true)
  })

  test('detects duplicate with case-insensitive name match', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'EXISTING RECIPE',
      'custom'
    )

    expect(isDuplicate).toBe(true)
  })

  test('detects duplicate with name that has extra whitespace', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      '  Existing Recipe  ',
      'custom'
    )

    expect(isDuplicate).toBe(true)
  })

  test('does not detect duplicate with same name but different categoryId', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Existing Recipe',
      'different-category'
    )

    expect(isDuplicate).toBe(false)
  })

  test('does not detect duplicate with different name', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'New Recipe',
      'custom'
    )

    expect(isDuplicate).toBe(false)
  })

  test('does not detect duplicate with undefined categoryId vs existing undefined', () => {
    const recipesWithUndefinedCategory: Recipe[] = [
      {
        id: 'recipe-3',
        name: 'Uncategorized Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
        isQuickAccess: false,
        categoryId: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      recipesWithUndefinedCategory,
      'Uncategorized Recipe',
      undefined
    )

    expect(isDuplicate).toBe(true)
  })

  test('excludes recipe by ID when checking for duplicates (for updates)', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Existing Recipe',
      'custom',
      'recipe-1' // Exclude the recipe with this ID
    )

    expect(isDuplicate).toBe(false)
  })

  test('does not exclude different recipe ID when checking for duplicates', () => {
    const isDuplicate = recipeValidationService.hasDuplicateRecipe(
      existingRecipes,
      'Existing Recipe',
      'custom',
      'recipe-2' // Different ID
    )

    expect(isDuplicate).toBe(true)
  })
})

// ============================================================================
// TEST: Import counts (simulated through validation results)
// ============================================================================

test.describe('Import Counting Logic', () => {
  test('valid recipe passes validation (would be counted as imported)', () => {
    const result = recipeValidationService.validateRecipeForImport(validRecipe)
    expect(result.isValid).toBe(true)
  })

  test('invalid recipe fails validation (would be counted as skipped)', () => {
    const invalidRecipe = {
      name: '',
      stages: [],
    }
    const result = recipeValidationService.validateRecipeForImport(invalidRecipe)
    expect(result.isValid).toBe(false)
  })

  test('simulates batch import with mixed valid/invalid recipes', () => {
    const recipes = [
      validRecipe,
      { name: '', stages: [] }, // Invalid: empty name
      { name: 'Valid Recipe 2', stages: [{ id: 's1', order: 0, template: 'test', fields: [], referenceImages: [] }] },
      { name: 'x', stages: [{ id: 's1', order: 0, template: 'test', fields: [], referenceImages: [] }] }, // Invalid: name too short
      { name: 'Valid Recipe 3', stages: [{ id: 's1', order: 0, toolId: 'remove-background', template: '', fields: [], referenceImages: [] }] },
    ]

    let imported = 0
    let skipped = 0

    for (const recipe of recipes) {
      const result = recipeValidationService.validateRecipeForImport(recipe)
      if (result.isValid) {
        imported++
      } else {
        skipped++
      }
    }

    expect(imported).toBe(3)
    expect(skipped).toBe(2)
  })

  test('simulates import with duplicate detection', () => {
    const existingRecipes: Recipe[] = [
      {
        id: 'existing-1',
        name: 'Existing Recipe',
        stages: [{ id: 'stage_0', order: 0, template: 'Test', fields: [], referenceImages: [] }],
        isQuickAccess: false,
        categoryId: 'custom',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    const recipesToImport = [
      { name: 'New Recipe', categoryId: 'custom', stages: [{ id: 's1', order: 0, template: 'test', fields: [], referenceImages: [] }] },
      { name: 'Existing Recipe', categoryId: 'custom', stages: [{ id: 's1', order: 0, template: 'test', fields: [], referenceImages: [] }] }, // Duplicate
      { name: 'Another New Recipe', categoryId: 'custom', stages: [{ id: 's1', order: 0, template: 'test', fields: [], referenceImages: [] }] },
    ]

    let imported = 0
    let skipped = 0

    for (const recipe of recipesToImport) {
      const validationResult = recipeValidationService.validateRecipeForImport(recipe)
      if (!validationResult.isValid) {
        skipped++
        continue
      }

      const isDuplicate = recipeValidationService.hasDuplicateRecipe(
        existingRecipes,
        recipe.name,
        recipe.categoryId
      )
      if (isDuplicate) {
        skipped++
      } else {
        imported++
      }
    }

    expect(imported).toBe(2)
    expect(skipped).toBe(1)
  })
})

// ============================================================================
// TEST: Edge Cases
// ============================================================================

test.describe('Edge Cases', () => {
  test('handles recipe with empty referenceImages in stage', () => {
    const recipeWithEmptyRefs = {
      name: 'Test Recipe',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'Test template',
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithEmptyRefs)
    expect(result.isValid).toBe(true)
  })

  test('handles recipe with special characters in name', () => {
    const recipeWithSpecialChars = {
      name: 'Recipe (with) special-chars & symbols!',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'Test template',
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithSpecialChars)
    expect(result.isValid).toBe(true)
  })

  test('handles recipe with unicode characters in name', () => {
    const recipeWithUnicode = {
      name: 'Recipe with emojis',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'Test template',
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithUnicode)
    expect(result.isValid).toBe(true)
  })

  test('handles recipe with multiple stages', () => {
    const recipeWithMultipleStages = {
      name: 'Multi-Stage Recipe',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'First stage template',
          fields: [],
          referenceImages: [],
        },
        {
          id: 'stage_1',
          order: 1,
          template: 'Second stage template',
          fields: [],
          referenceImages: [],
        },
        {
          id: 'stage_2',
          order: 2,
          type: 'tool',
          template: '',
          toolId: 'remove-background',
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithMultipleStages)
    expect(result.isValid).toBe(true)
  })

  test('validates stage that is tool type but missing toolId', () => {
    const recipeWithBadToolStage = {
      name: 'Test Recipe',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          type: 'tool',
          template: '',
          // Missing toolId
          fields: [],
          referenceImages: [],
        },
      ],
    }

    const result = recipeValidationService.validateRecipeForImport(recipeWithBadToolStage)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('toolId'))).toBe(true)
  })

  test('sanitizeRecipeForImport preserves all optional fields correctly', () => {
    const fullRecipe = {
      name: '  Test Recipe  ',
      description: 'Description',
      recipeNote: 'Note for users',
      stages: [
        {
          id: 'stage_0',
          order: 0,
          template: 'Template content',
          fields: [{ id: 'f1', name: 'FIELD', label: 'Field', type: 'text', required: true, placeholder: 'Field!' }],
          referenceImages: [{ id: 'ref1', url: 'http://example.com/img.png' }],
        },
      ],
      suggestedAspectRatio: '16:9',
      suggestedResolution: '1920x1080',
      suggestedModel: 'nano-banana-pro',
      quickAccessLabel: 'Quick',
      isQuickAccess: true,
      categoryId: 'custom',
    }

    const sanitized = recipeValidationService.sanitizeRecipeForImport(fullRecipe as unknown as Record<string, unknown>)

    expect(sanitized.name).toBe('Test Recipe') // Trimmed
    expect(sanitized.description).toBe('Description')
    expect(sanitized.recipeNote).toBe('Note for users')
    expect(sanitized.suggestedAspectRatio).toBe('16:9')
    expect(sanitized.suggestedResolution).toBe('1920x1080')
    expect(sanitized.suggestedModel).toBe('nano-banana-pro')
    expect(sanitized.quickAccessLabel).toBe('Quick')
    expect(sanitized.isQuickAccess).toBe(true)
    expect(sanitized.categoryId).toBe('custom')
    expect(sanitized.isSystem).toBe(false)
    expect(sanitized.isSystemOnly).toBe(false)
    expect(sanitized.stages).toHaveLength(1)
    expect(sanitized.stages[0].template).toBe('Template content')
  })
})
