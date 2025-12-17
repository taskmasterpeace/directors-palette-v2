/**
 * External API: Recipe List
 * GET /api/v1/recipes
 *
 * Returns all available recipe templates with their field definitions
 * No authentication required - recipes are public
 */

import { NextResponse } from 'next/server'
import {
  SAMPLE_RECIPES,
  COMMON_SELECT_OPTIONS,
  FRAME_TYPE_OPTIONS,
  HOLIDAY_OPTIONS,
  parseRecipeTemplate,
  getAllFields,
} from '@/features/shot-creator/types/recipe.types'

interface ApiRecipeField {
  name: string
  label: string
  type: 'name' | 'text' | 'select'
  required: boolean
  options?: string[]
  description?: string
}

interface ApiRecipe {
  id: string
  name: string
  description: string | null
  recipeNote: string | null
  template: string
  fields: ApiRecipeField[]
  stageCount: number
  suggestedAspectRatio: string | null
  category: string | null
  quickAccessLabel: string | null
}

/**
 * GET /api/v1/recipes
 * List all available recipe templates
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Convert sample recipes to API format
    const recipes: ApiRecipe[] = SAMPLE_RECIPES.map((recipe, index) => {
      // Build full template from stages
      const fullTemplate = recipe.stages.map(s => s.template).join(' | ')

      // Parse the template to get stages and fields
      const stages = parseRecipeTemplate(fullTemplate)
      const fields = getAllFields(stages)

      // Convert fields to API format
      const apiFields: ApiRecipeField[] = fields.map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        options: field.options,
        description: getFieldDescription(field.name, field.type),
      }))

      return {
        id: `recipe_${index + 1}`,
        name: recipe.name,
        description: recipe.description || null,
        recipeNote: recipe.recipeNote || null,
        template: fullTemplate,
        fields: apiFields,
        stageCount: recipe.stages.length,
        suggestedAspectRatio: recipe.suggestedAspectRatio || null,
        category: recipe.categoryId || null,
        quickAccessLabel: recipe.quickAccessLabel || null,
      }
    })

    return NextResponse.json({
      success: true,
      recipes,
      total: recipes.length,
      categories: ['characters', 'scenes', 'styles', 'products', 'custom'],
      commonOptions: {
        shotTypes: COMMON_SELECT_OPTIONS.shotType,
        cameraAngles: COMMON_SELECT_OPTIONS.cameraAngle,
        lighting: COMMON_SELECT_OPTIONS.lighting,
        moods: COMMON_SELECT_OPTIONS.mood,
        frameTypes: FRAME_TYPE_OPTIONS,
        holidays: HOLIDAY_OPTIONS,
      },
      templateSyntax: {
        description: 'Recipe templates use a fill-in-the-blank syntax for dynamic content',
        syntax: {
          '<<FIELD_NAME:name!>>': 'Required name field (short text input)',
          '<<FIELD_NAME:name>>': 'Optional name field',
          '<<FIELD_NAME:text!>>': 'Required text field (longer text input)',
          '<<FIELD_NAME:text>>': 'Optional text field',
          '<<FIELD_NAME:select(opt1,opt2,opt3)!>>': 'Required dropdown selection',
          '<<FIELD_NAME:select(opt1,opt2,opt3)>>': 'Optional dropdown selection',
          '|': 'Pipe separator for multi-stage recipes (each stage generates an image)',
        },
        examples: [
          {
            template: 'A <<SHOT_TYPE:select(CU,MS,WS)!>> shot of <<CHARACTER:name!>>',
            variables: { SHOT_TYPE: 'CU', CHARACTER: 'Maya' },
            result: 'A CU shot of Maya',
          },
          {
            template: 'Scene in <<LOCATION:text>> during <<TIME:select(dawn,noon,dusk,night)>>',
            variables: { LOCATION: 'forest clearing', TIME: 'dusk' },
            result: 'Scene in forest clearing during dusk',
          },
        ],
      },
      usage: {
        endpoint: '/api/v1/recipes/execute',
        method: 'POST',
        example: {
          template: 'A <<SHOT_TYPE:select(CU,MS,WS)!>> shot of <<CHARACTER:name!>> in a <<LOCATION:text>> setting',
          variables: { SHOT_TYPE: 'CU', CHARACTER: 'John', LOCATION: 'forest' },
          model: 'nano-banana',
          aspectRatio: '16:9',
        },
      },
    })
  } catch (error) {
    console.error('[API v1] Recipe list error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

/**
 * Get a human-readable description for a field based on its name and type
 */
function getFieldDescription(name: string, type: string): string {
  const descriptions: Record<string, string> = {
    CHARACTER_NAME: 'Name/tag for the character (used for consistency across frames)',
    CHARACTER: 'Character identifier or description',
    STYLE_NAME: 'Name for the style guide being created',
    STYLE: 'Art/rendering style (e.g., claymation, anime, realistic)',
    SHOT_TYPE: 'Camera shot type (ECU, CU, MS, WS, etc.)',
    STORY: 'Full story or scene description to visualize',
    LOCATION: 'Setting/environment description',
    HOLIDAY: 'Holiday theme to apply to the image',
    NIGHT_LIGHTING: 'Lighting style for nighttime scenes',
    FRAME_1: 'Row 1 - Environmental/establishing shot',
    FRAME_2: 'Row 1 - Wide shot variation',
    FRAME_3: 'Row 1 - Medium wide shot',
    FRAME_4: 'Row 2 - Medium shot',
    FRAME_5: 'Row 2 - Medium close-up',
    FRAME_6: 'Row 2 - Close-up',
    FRAME_7: 'Row 3 - Extreme close-up/detail',
    FRAME_8: 'Row 3 - Low angle shot',
    FRAME_9: 'Row 3 - High angle shot',
  }

  // Try exact match first
  if (descriptions[name]) {
    return descriptions[name]
  }

  // Generic description based on type
  switch (type) {
    case 'name':
      return 'Short identifier or name'
    case 'text':
      return 'Descriptive text field'
    case 'select':
      return 'Choose from available options'
    default:
      return 'Input field'
  }
}
