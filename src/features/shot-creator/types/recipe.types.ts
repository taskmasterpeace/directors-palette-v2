/**
 * Recipe Types - Fill-in-the-blank prompt templates with multi-stage pipe support
 *
 * Field Syntax: <<FIELD_NAME:type!>>
 * - FIELD_NAME: Variable name (used in placeholder)
 * - type: name, text, or select(opt1,opt2,opt3)
 * - ! at end = required field
 *
 * Examples:
 * - <<CHARACTER_NAME:name!>> - Required name field (small input)
 * - <<DESCRIPTION:text>> - Optional text field (larger input)
 * - <<SHOT_TYPE:select(CU,MS,WS)!>> - Required dropdown
 *
 * Pipe Syntax:
 * - Use | to separate stages
 * - Each stage can have its own reference images
 * - Previous stage output becomes reference for next stage
 */

// Server-safe UUID generator (crypto.randomUUID() is not available on server during SSR)
let uuidCounter = 0;
function generateStageId(): string {
  // Use crypto.randomUUID if available (client-side), otherwise use a counter-based ID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `stage-${Date.now()}-${++uuidCounter}`;
}

// Field types for recipe forms
export type RecipeFieldType = 'name' | 'text' | 'select'

// A single field definition parsed from the recipe template
export interface RecipeField {
  id: string                    // Unique field ID
  name: string                  // Field name from template (e.g., "CHARACTER_NAME")
  label: string                 // Display label (e.g., "Character Name")
  type: RecipeFieldType         // Field type
  required: boolean             // Whether field must be filled (marked with !)
  options?: string[]            // For 'select' type - dropdown options
  placeholder: string           // Placeholder text (includes ! if required)
}

// Reference image attached to a recipe stage
export interface RecipeReferenceImage {
  id: string
  url: string                   // Image URL (can be data URL or public URL)
  name?: string                 // Display name
  aspectRatio?: string          // Detected aspect ratio
  isStatic?: boolean            // Static reference images are always included
}

// Stage type - generation (default) or tool
export type RecipeStageType = 'generation' | 'tool'

// Tool output type
export type RecipeToolOutputType = 'single' | 'multi'

// Available tools that can be used in recipe stages
export const RECIPE_TOOLS = {
  'remove-background': {
    id: 'remove-background',
    name: 'Remove Background',
    description: 'Removes background from image, outputs PNG with transparency',
    icon: '✂️',
    cost: 3,  // points
    endpoint: '/api/tools/remove-background',
    outputType: 'single' as RecipeToolOutputType,
  },
  'cinematic-grid': {
    id: 'cinematic-grid',
    name: 'Cinematic Grid',
    description: 'Generates 3x3 grid with 9 cinematic camera angles from reference image',
    icon: '🎬',
    cost: 20,  // Same as nano-banana-pro (uses it internally)
    endpoint: '/api/tools/cinematic-grid',
    outputType: 'single' as RecipeToolOutputType,
  },
  'grid-split': {
    id: 'grid-split',
    name: 'Grid Split (3x3)',
    description: 'Splits a 3x3 grid image into 9 separate images',
    icon: '🔲',
    cost: 0,  // Server-side processing only, no API cost
    endpoint: '/api/tools/grid-split',
    outputType: 'multi' as RecipeToolOutputType,
    outputCount: 9,
  },
  'before-after-grid': {
    id: 'before-after-grid',
    name: 'Before/After Grid',
    description: 'Generates 3x3 grid showing same location in 9 different states/time periods',
    icon: '🔄',
    cost: 20,  // Same as nano-banana-pro (uses it internally)
    endpoint: '/api/tools/before-after-grid',
    outputType: 'single' as RecipeToolOutputType,
  },
} as const

export type RecipeToolId = keyof typeof RECIPE_TOOLS

// A single stage in a multi-pipe recipe
export interface RecipeStage {
  id: string
  order: number                 // Stage order (0, 1, 2...)
  type?: RecipeStageType        // 'generation' (default) or 'tool'
  template: string              // The prompt template for this stage (empty for tool stages)
  toolId?: RecipeToolId         // For tool stages: which tool to use
  fields: RecipeField[]         // Parsed fields from this stage's template
  referenceImages: RecipeReferenceImage[]  // Fixed reference images for this stage
}

// User's filled-in values for a recipe
export interface RecipeFieldValues {
  [fieldId: string]: string
}

// A recipe template
export interface Recipe {
  id: string
  name: string                  // Recipe name (e.g., "Character Sheet Generator")
  description?: string          // Optional description
  recipeNote?: string           // Instructions shown when recipe is activated
                                // e.g., "Please provide an image with a character"
  stages: RecipeStage[]         // Multi-stage support (separated by |)
  suggestedAspectRatio?: string // Suggested aspect ratio (user can change)
  suggestedResolution?: string  // Suggested resolution
  suggestedModel?: string       // Suggested model (auto-selects when recipe applied)
  quickAccessLabel?: string     // 1-word label for quick access bar
  isQuickAccess: boolean        // Whether it's in quick access
  categoryId?: string           // Optional category
  isSystem?: boolean            // System recipes are read-only, must be duplicated to edit
  isSystemOnly?: boolean        // If true, only visible to admin users (hidden from regular users)
  createdAt: number
  updatedAt: number
}

// Quick access item - recipes only now
export interface QuickAccessItem {
  id: string
  type: 'recipe'
  label: string                 // 1-word display label
  recipeId: string              // Recipe ID
  order: number                 // Display order (0-8)
}

// Validation result for a recipe
export interface RecipeValidation {
  isValid: boolean
  missingFields: string[]       // Names of required fields not filled
  errors: string[]              // Error messages
}

// Recipe categories
export interface RecipeCategory {
  id: string
  name: string
  icon: string
  isDefault?: boolean           // Built-in categories can't be deleted
  isSystemOnly?: boolean        // If true, only visible to admin users
}

// Default recipe categories
export const DEFAULT_RECIPE_CATEGORIES: RecipeCategory[] = [
  { id: 'characters', name: 'Characters', icon: '👤', isDefault: true },
  { id: 'scenes', name: 'Scenes', icon: '🎬', isDefault: true },
  { id: 'environments', name: 'Environments', icon: '🏛️', isDefault: true },
  { id: 'narrative', name: 'Narrative', icon: '📚', isDefault: true },
  { id: 'styles', name: 'Style Transfers', icon: '🎨', isDefault: true },
  { id: 'products', name: 'Products', icon: '📦', isDefault: true },
  { id: 'custom', name: 'Custom', icon: '✨', isDefault: true },
  // System-only categories (visible only to admin users)
  { id: 'storybook', name: 'Storybook', icon: '📖', isDefault: true, isSystemOnly: true },
]

// Common select options for convenience
export const COMMON_SELECT_OPTIONS = {
  shotType: ['ECU', 'BCU', 'CU', 'MCU', 'MS', 'MCS', 'MWS', 'WS', 'EWS', 'EST'],
  cameraAngle: ['eye-level', 'low-angle', 'high-angle', 'dutch', 'birds-eye', 'worms-eye', 'POV', 'OTS'],
  lighting: ['natural', 'golden-hour', 'dramatic', 'soft', 'rim', 'silhouette', 'high-key', 'low-key'],
  mood: ['dramatic', 'peaceful', 'tense', 'joyful', 'mysterious', 'romantic', 'energetic'],
}

/**
 * Parse a single stage template and extract fields
 *
 * Syntax: <<FIELD_NAME:type!>>
 * - ! at end means required
 * - type can be: name, text, select(opt1,opt2)
 */
export function parseStageTemplate(template: string, stageIndex: number): RecipeField[] {
  const fieldRegex = /<<([A-Z_0-9]+):([^>]+)>>/g
  const fields: RecipeField[] = []
  let match
  let fieldIndex = 0

  while ((match = fieldRegex.exec(template)) !== null) {
    const [, name, typeSpec] = match

    // Check if required (ends with !)
    const required = typeSpec.endsWith('!')
    const cleanTypeSpec = required ? typeSpec.slice(0, -1) : typeSpec

    let type: RecipeFieldType = 'text'
    let options: string[] | undefined

    // Parse type
    if (cleanTypeSpec === 'name') {
      type = 'name'
    } else if (cleanTypeSpec === 'text') {
      type = 'text'
    } else if (cleanTypeSpec.startsWith('select(')) {
      type = 'select'
      const optionsMatch = cleanTypeSpec.match(/select\(([^)]+)\)/)
      if (optionsMatch) {
        options = optionsMatch[1].split(',').map(o => o.trim())
      }
    }

    // Convert FIELD_NAME to "Field Name" label
    const label = name
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')

    // Create placeholder with ! if required
    const placeholder = required ? `${label}!` : label

    fields.push({
      id: `stage${stageIndex}_field${fieldIndex}_${name.toLowerCase()}`,
      name,
      label,
      type,
      required,
      options,
      placeholder,
    })

    fieldIndex++
  }

  return fields
}

/**
 * Parse a full recipe template (may contain pipes) into stages
 */
export function parseRecipeTemplate(fullTemplate: string): RecipeStage[] {
  // Split by pipe
  const stageParts = fullTemplate.split('|').map(s => s.trim())

  return stageParts.map((template, index) => ({
    id: `stage_${index}`,
    order: index,
    template,
    fields: parseStageTemplate(template, index),
    referenceImages: [],
  }))
}

/**
 * Get all fields from all stages, deduplicated by name
 * If the same field name appears multiple times, only return it once
 * (first occurrence wins, keeps required status if any instance is required)
 */
export function getAllFields(stages: RecipeStage[]): RecipeField[] {
  const allFields = stages.flatMap(stage => stage.fields)
  const uniqueByName = new Map<string, RecipeField>()

  for (const field of allFields) {
    const existing = uniqueByName.get(field.name)
    if (existing) {
      // If this instance is required, update the existing to be required
      if (field.required && !existing.required) {
        uniqueByName.set(field.name, { ...existing, required: true })
      }
    } else {
      uniqueByName.set(field.name, field)
    }
  }

  return Array.from(uniqueByName.values())
}

/**
 * Get deduplicated fields for the form (user only fills each unique field once)
 */
export function getUniqueFieldsForForm(stages: RecipeStage[]): RecipeField[] {
  return getAllFields(stages)
}

/**
 * Build a prompt from a stage template and field values
 * - Looks up values by field NAME (for variable reuse)
 * - Optional fields with empty values are omitted entirely
 * - Cleans up orphaned punctuation and extra spaces
 */
export function buildStagePrompt(
  template: string,
  fields: RecipeField[],
  values: RecipeFieldValues,
  allUniqueFields?: RecipeField[]
): string {
  let result = template

  // Build a map of field name -> value (using unique fields for lookup)
  const fieldsToUse = allUniqueFields || fields
  const valueByName = new Map<string, { value: string; required: boolean }>()

  for (const field of fieldsToUse) {
    // Try to find value by field ID first, then by name-based lookup
    let value = values[field.id] || ''

    // Also check if any field with this name has a value set
    if (!value) {
      for (const [id, val] of Object.entries(values)) {
        if (id.toLowerCase().includes(field.name.toLowerCase()) && val) {
          value = val
          break
        }
      }
    }

    valueByName.set(field.name, { value, required: field.required })
  }

  // Replace each field placeholder
  const fieldRegex = /<<([A-Z_0-9]+):([^>]+)>>/g
  result = result.replace(fieldRegex, (_match, name, typeSpec) => {
    const fieldData = valueByName.get(name)
    const value = fieldData?.value || ''
    const isRequired = typeSpec.endsWith('!')

    // If optional and empty, return empty string to remove placeholder
    if (!value && !isRequired) {
      return ''
    }

    return value
  })

  // Clean up orphaned punctuation and extra spaces
  // Remove ", ," patterns
  result = result.replace(/,\s*,/g, ',')
  // Remove ", ." or ". ," patterns
  result = result.replace(/[,\s]+\./g, '.')
  result = result.replace(/\.\s*,/g, '.')
  // Remove leading/trailing commas in sentences
  result = result.replace(/,\s*$/g, '')
  result = result.replace(/^\s*,\s*/g, '')
  // Remove multiple spaces
  result = result.replace(/\s+/g, ' ')
  // Clean up spaces around punctuation
  result = result.replace(/\s+,/g, ',')
  result = result.replace(/\s+\./g, '.')

  return result.trim()
}

/**
 * Result of building recipe prompts - includes both prompts and reference images
 */
export interface RecipePromptResult {
  prompts: string[]
  referenceImages: string[]           // All refs flattened (backward compat)
  stageReferenceImages: string[][]    // Per-stage refs indexed by stage order
}

/**
 * Build all stage prompts from a recipe
 * Uses deduplicated fields so same field name = same value across stages
 * Also collects all reference images from all stages
 */
export function buildRecipePrompts(
  stages: RecipeStage[],
  values: RecipeFieldValues
): RecipePromptResult {
  const uniqueFields = getAllFields(stages)
  const prompts = stages.map(stage => buildStagePrompt(stage.template, stage.fields, values, uniqueFields))

  // Collect all reference images from all stages (deduplicated) for backward compatibility
  const referenceImages: string[] = []
  for (const stage of stages) {
    for (const ref of stage.referenceImages || []) {
      if (ref.url && !referenceImages.includes(ref.url)) {
        referenceImages.push(ref.url)
      }
    }
  }

  // Collect reference images per stage (indexed by stage order) for pipe chaining
  const stageReferenceImages: string[][] = stages.map(stage =>
    (stage.referenceImages || [])
      .map(ref => ref.url)
      .filter((url): url is string => Boolean(url))
  )

  return { prompts, referenceImages, stageReferenceImages }
}

/**
 * Calculate the total cost of a recipe based on its tool stages
 * Returns 0 if no tool stages (cost determined by selected model)
 */
export function calculateRecipeCost(stages: RecipeStage[]): number {
  return stages.reduce((total, stage) => {
    if (stage.type === 'tool' && stage.toolId) {
      const tool = RECIPE_TOOLS[stage.toolId as RecipeToolId]
      if (tool) return total + tool.cost
    }
    return total
  }, 0)
}

/**
 * Validate that all required fields are filled
 * Uses deduplicated fields so same field name = validated once
 */
export function validateRecipe(
  stages: RecipeStage[],
  values: RecipeFieldValues
): RecipeValidation {
  const missingFields: string[] = []
  const errors: string[] = []

  // Use deduplicated fields for validation
  const uniqueFields = getAllFields(stages)

  for (const field of uniqueFields) {
    if (field.required) {
      // Check by field ID first
      let value = values[field.id]

      // Also check by field name pattern
      if (!value) {
        for (const [id, val] of Object.entries(values)) {
          if (id.includes(field.name.toLowerCase()) && val) {
            value = val
            break
          }
        }
      }

      if (!value || value.trim() === '') {
        missingFields.push(field.label)
        errors.push(`${field.label} is required`)
      }
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    errors,
  }
}

/**
 * Frame type options for cinematic grids
 */
export const FRAME_TYPE_OPTIONS = {
  row1: ['Extreme Wide Shot', 'Wide Shot', 'Full Body Shot', 'Establishing Shot', 'Environmental Shot'],
  row2: ['Medium Wide Shot', 'Medium Shot', 'Waist-Up Shot', 'Cowboy Shot', 'American Shot'],
  row3: ['Medium Close-Up', 'Close-Up Shot', 'Chest-Up Shot', 'Tight Shot', 'Portrait Frame'],
  row4: ['Extreme Close-Up', 'Big Close-Up', 'Detail Shot', 'Macro Shot', 'Insert Shot'],
  angles: ['Eye-Level', 'Low Angle', 'High Angle', 'Dutch Angle', 'Birds Eye', 'Worms Eye', 'Over-the-Shoulder', 'POV'],
}

/**
 * Holiday options
 */
export const HOLIDAY_OPTIONS = [
  'Christmas',
  'Valentines Day',
  'Halloween',
  'Easter',
  'Thanksgiving',
  'New Years Eve',
  'Fourth of July',
  'St Patricks Day',
  'Lunar New Year',
  'Diwali',
  'Hanukkah',
  'Cinco de Mayo',
]

/**
 * System template URLs from Supabase Storage
 * These are used as layout reference images for recipes
 */
const SUPABASE_URL = 'https://tarohelkwuurakbxjyxm.supabase.co'

const SYSTEM_TEMPLATE_URLS = {
  characterSheetBasic: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-basic.png`,
  characterSheetAdvanced: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-advanced.webp`,
  characterSheetV3: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-v3.jpg`,
  wardrobeGrid: `${SUPABASE_URL}/storage/v1/object/public/templates/system/grids/wardrobe-2x3.png`,
  styleGuide9Tile: `${SUPABASE_URL}/storage/v1/object/public/templates/system/grids/style-guide-9tile.png`,
}

/**
 * Sample recipes for initial setup
 */
export const SAMPLE_RECIPES: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Style Guide Grid - 9 tile visual style guide (3x3 grid)
  {
    name: 'Style Guide Grid',
    description: 'Create a 3x3 visual style guide with 9 example tiles demonstrating the full visual language of a style',
    recipeNote: 'Attach a style reference image. Name your style. The model generates 9 tiles showing how the style handles characters, action, environments, vehicles, and group scenes.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a visual style guide as a 9-image grid (3 rows × 3 columns) with header "STYLE GUIDE" and subtitle "<<STYLE_NAME:text!>>".
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

The guide must generate its own characters and should NOT rely on any user-provided characters.

GLOBAL STYLE RULES (match the reference image exactly):
- Color & Contrast: Match the reference image's color palette, contrast, and saturation
- Rendering Style: Maintain identical rendering style across all 9 tiles (painterly, illustrative, photoreal, 3D, claymation, etc.)
- Line & Detail: Match line quality, edge sharpness/softness, and detail level
- Lighting & Mood: Match lighting style, time of day, shadow softness, and mood
- Camera Language: Match depth of field, framing, focal length feel, and sense of motion
- World Cohesion: Every tile must look like it comes from the same production, using the same design language, textures, and atmosphere

SHARED CAST (for consistency demonstration):
- Character A: A Black man in his early 30s, medium build, short natural hair, expressive eyes
- Character B: A White man in his early 30s, average build, short hair, clean shave
- Character C: A woman in her late 20s, athletic build, long dark hair
These characters are generated by the model to test how the style handles diversity consistently.

THE 9 TILES (3x3 grid):

ROW 1:
TILE 1 - CHARACTER CLOSE-UP:
Dramatic close-up portrait (shoulders-up) of Character A with expressive lighting and shallow depth of field. Must clearly demonstrate how the style handles skin texture, emotion, materials, and color behavior.

TILE 2 - EVERYDAY SCENE:
Character B in an everyday activity (reading, drinking coffee, walking) in a relatable setting. Must maintain consistent lighting and style.

TILE 3 - ENVIRONMENT DETAIL:
Richly detailed environment element (street corner, room interior, forest clearing, etc.) showing materials, lighting, and atmospheric depth consistent with the style.

ROW 2:
TILE 4 - URBAN CHARACTER:
Character C in an urban setting (city street, rooftop, subway, alley). Demonstrates how the style handles character integration with architectural elements.

TILE 5 - DYNAMIC POSE:
Full-body shot of a character in a dramatic action-oriented pose (jumping, running, reaching). Shows how anatomy, silhouette, and gesture work in this style.

TILE 6 - SET DESIGN:
Wide shot highlighting set or location design (city street, interior room, outdoor landscape). Must match environment lighting and atmosphere of the reference style.

ROW 3:
TILE 7 - COMBAT POSE:
Character in combat/fighting stance or mid-action (punching, kicking, wielding weapon). Demonstrates how the style handles dynamic action and movement.

TILE 8 - VEHICLE INTERACTION:
Character interacting with a vehicle (car, bike, spaceship, horse, etc.). Shows how the style handles mechanical/organic elements alongside characters.

TILE 9 - GROUP SHOT:
Multiple characters (3-4 people) in a scene together. Demonstrates how the style handles multiple subjects, racial diversity, and group composition.

CRITICAL: This guide functions as a style bible for future scenes — a unified blueprint demonstrating humans, environments, action, vehicles, and group dynamics in one consistent art style.

No style drift. No new color schemes, lighting models, render methods, or camera styles.
Black grid lines between all cells. Match the template layout exactly.`,
      fields: [],
      referenceImages: [
        {
          id: 'template_style_guide_9tile',
          url: SYSTEM_TEMPLATE_URLS.styleGuide9Tile,
          name: 'Style Guide Grid Template',
          aspectRatio: '16:9',
        },
      ],
    }],
    suggestedAspectRatio: '16:9',
    isQuickAccess: true,
    quickAccessLabel: 'StyleGuide',
    categoryId: 'styles',
  },

  // Character Sheet - Professional reference sheet matching action figure style
  {
    name: 'Character Sheet',
    description: 'Professional character reference sheet with full-body views, expressions, and accessories',
    recipeNote: 'Attach a reference image of your character. The sheet will include turnarounds, expressions, talking views, and accessory slots.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `CHARACTER @<<CHARACTER_NAME:name!>>

Create a professional character reference sheet on a clean white/light gray background.

LAYOUT (Left to Right):

SECTION 1 - FULL BODY VIEWS:
- Large front view with proportion grid lines
- Side profile view
- Back view
- All views on same baseline for height reference
- Below: COLOR PALETTE strip showing skin, hair, eye colors, and main clothing colors

SECTION 2 - EXPRESSIONS & DETAILS:
- Header: "CHARACTER @<<CHARACTER_NAME:name!>>" with description box
- EXPRESSION GRID (2 rows × 3 columns):
  Row 1: Talking-Neutral, Talking-Happy, Talking-Angry
  Row 2: Sad, Surprised, Smug/Confident
- Below: CLOSE-UP DETAILS box for distinctive features
- ACCESSORIES boxes for props/items

SECTION 3 - TALKING VIEWS:
- Profile head shots showing speaking poses
- Additional ACCESSORIES boxes

STYLE: <<STYLE:select(claymation,anime,3D render,cartoon,realistic,watercolor,oil painting,illustrated,Pixar-style,Disney-style)>>

Clean, production-ready layout. No busy backgrounds.
Consistent lighting and rendering across all views.
Professional character sheet suitable for animation/illustration reference.`,
      fields: [],
      referenceImages: [
        {
          id: 'template_charsheet_advanced',
          url: SYSTEM_TEMPLATE_URLS.characterSheetAdvanced,
          name: 'Character Sheet Layout Template',
          aspectRatio: '21:9',
        },
      ],
    }],
    suggestedAspectRatio: '21:9',
    isQuickAccess: true,
    quickAccessLabel: 'CharSheet',
    categoryId: 'characters',
  },

  // Character Sheet from Description - No photo required
  {
    name: 'Character Sheet (From Description)',
    description: 'Generate a character sheet from text description only - no reference photo needed',
    recipeNote: 'Perfect for creating consistent characters when you only have a written description. Stage 1 generates the character appearance, Stage 2 creates the full character sheet.',
    stages: [
      // STAGE 0: Generate character appearance from description
      {
        id: 'stage_desc_char_0',
        order: 0,
        type: 'generation',
        template: `Generate a character based on this description:

CHARACTER NAME: @<<CHARACTER_NAME:name!>>
VISUAL DESCRIPTION: <<CHARACTER_DESCRIPTION:text!>>

Create a full-body character portrait:
- Standing pose, facing forward (slight 3/4 angle is acceptable)
- Clean WHITE or light gray background
- Neutral expression, relaxed posture
- Soft, even studio lighting
- Show full body from head to feet
- High detail on face and distinctive features

STYLE: <<STYLE:select(realistic,cinematic,anime,3D render,cartoon,illustrated,concept art,oil painting,watercolor,Pixar-style,Disney-style)>>

The character should match the description EXACTLY - pay attention to:
- Age, gender, ethnicity
- Hair color, style, length
- Eye color
- Build/body type
- Clothing and accessories
- Any distinctive features (scars, tattoos, glasses, etc.)

Output: High-quality full-body character portrait suitable for reference.`,
        fields: [],
        referenceImages: [],
      },
      // STAGE 1: Generate character sheet with expressions
      {
        id: 'stage_desc_char_1',
        order: 1,
        type: 'generation',
        template: `CHARACTER: @<<CHARACTER_NAME:name!>>

Create a professional character reference sheet using the previous image as the definitive reference.

CRITICAL: Every view and expression must clearly be the SAME PERSON.
Facial structure, proportions, and distinctive features must remain IDENTICAL across all views.

CHARACTER SHEET LAYOUT (21:9 aspect ratio):

LEFT SECTION - FULL BODY VIEWS:
- Large front view with proportion reference
- Side profile view
- Back view
- All views on same baseline for height reference
- Below: COLOR PALETTE strip (skin, hair, eye colors, main clothing colors)

RIGHT SECTION - EXPRESSIONS (2 rows × 5 columns):
Row 1: Neutral, Happy, Sad, Angry, Surprised
Row 2: Speaking, Shouting, Whispering, Confident, Scared

TOP: Character name "@<<CHARACTER_NAME:name!>>" prominently displayed

STYLE: Match the style from Stage 1 exactly

CRITICAL REQUIREMENTS:
- SOLID BLACK LINES (4-6 pixels) separating each expression cell
- All expressions maintain the SAME face structure
- Clean white/light gray background throughout
- Production-ready layout for animation/illustration reference`,
        fields: [],
        referenceImages: [
          {
            id: 'template_charsheet_advanced',
            url: SYSTEM_TEMPLATE_URLS.characterSheetAdvanced,
            name: 'Character Sheet Layout Template',
            aspectRatio: '21:9',
          }
        ],
      },
    ],
    suggestedAspectRatio: '21:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    quickAccessLabel: 'DescSheet',
    categoryId: 'characters',
  },

  // 9-Frame Cinematic Contact Sheet
  {
    name: '9-Frame Cinematic',
    description: '3x3 cinematic contact sheet covering full shot range',
    recipeNote: 'Attach a reference image. The model will create 9 different framings of the same subject with black grid lines for extraction.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the entire composition of the input image. Identify all key subjects present (single person, group, vehicle, or object) and their spatial relationship.

Generate a cohesive 3x3 cinematic contact sheet featuring 9 distinct camera shots of exactly these subjects in the same environment.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

ROW 1 - ENVIRONMENTAL CONTEXT:
1. <<FRAME_1:select(Extreme Wide Shot,Wide Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
2. <<FRAME_2:select(Wide Shot,Full Body Shot,Long Shot,Master Shot)!>>
3. <<FRAME_3:select(Medium Wide Shot,Medium Long Shot,Cowboy Shot,American Shot)!>>

ROW 2 - CORE SUBJECT:
4. <<FRAME_4:select(Medium Shot,Waist-Up Shot,Mid-Shot,Two-Shot)!>>
5. <<FRAME_5:select(Medium Close-Up,Chest-Up Shot,Bust Shot)!>>
6. <<FRAME_6:select(Close-Up Shot,Tight Shot,Head Shot)!>>

ROW 3 - INTIMATE DETAILS & ANGLES:
7. <<FRAME_7:select(Extreme Close-Up,Macro Detail,Insert Shot,Detail Shot)!>>
8. <<FRAME_8:select(Low Angle Upward,Worms Eye View,Hero Shot,Power Shot)!>>
9. <<FRAME_9:select(High Angle Downward,Birds Eye,Overhead Shot,God Shot)!>>

STRICT REQUIREMENTS:
- Identical subjects, outfits, environment, lighting across all 9 frames
- Coherent scene continuity
- Depth of field becomes increasingly shallow as framing gets tighter
- Black grid lines separating all 9 cells
- No labels, text, overlays, icons, or shot-type captions
- Only clean cinematic imagery
- Professional photorealistic textures and cinematic color grading<<STYLE:select(,maintain claymation style,maintain anime style,maintain watercolor style,maintain oil painting style,maintain 3D render style)>>`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: '9-Frame',
    categoryId: 'scenes',
  },

  // 9-Frame Before/After Location Grid
  {
    name: 'Before/After Location',
    description: '3x3 grid showing same location in 9 different states/time periods',
    recipeNote: 'Attach a reference image of a location. The model will show the same camera angle with 9 different states (time of day, seasons, decades, or custom transformations).',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the location shown in the reference image. Identify the exact camera angle, composition, and key architectural/environmental features.

Generate a 3x3 grid showing this EXACT SAME location from the EXACT SAME camera angle in 9 different <<TRANSFORMATION:select(time periods throughout a single day,seasons throughout a year,decades from past to future,states before and after an event,construction phases from empty lot to completion)!>>.

<<LOCATION_DESCRIPTION:text>> - Brief description of the location (optional, helps with accuracy)

IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

ROW 1 - BEGINNING STATES:
1. <<STATE_1:select(Pre-dawn/6AM,Early Spring,1920s Era,Pristine Before,Empty Lot)!>>
2. <<STATE_2:select(Sunrise/7AM,Late Spring,1950s Era,Warning Signs,Groundbreaking)!>>
3. <<STATE_3:select(Morning/9AM,Early Summer,1970s Era,Event Beginning,Foundation)!>>

ROW 2 - MIDDLE STATES:
4. <<STATE_4:select(Midday/12PM,Mid Summer,1980s Era,Event Peak,Framing Complete)!>>
5. <<STATE_5:select(Afternoon/3PM,Late Summer,1990s Era,Maximum Impact,Exterior Done)!>>
6. <<STATE_6:select(Golden Hour/5PM,Early Autumn,2000s Era,Event Subsiding,Interior Work)!>>

ROW 3 - END STATES:
7. <<STATE_7:select(Sunset/7PM,Peak Autumn,2010s Era,Immediate Aftermath,Landscaping)!>>
8. <<STATE_8:select(Dusk/8PM,Late Autumn,2020s Present,Recovery Phase,Final Touches)!>>
9. <<STATE_9:select(Night/10PM,Winter,2040s Future,Fully Transformed,Completed/Occupied)!>>

STRICT REQUIREMENTS:
- IDENTICAL camera angle and position in EVERY cell
- IDENTICAL composition and framing
- Only the state/time/condition of the location changes
- Black grid lines separating all 9 cells
- No labels, text, overlays, icons, or captions
- Photorealistic rendering with attention to lighting changes
- Consistent architectural details across all frames<<STYLE:select(,maintain illustrated style,maintain painterly style,maintain cinematic style,maintain documentary style)>>`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'Before/After',
    categoryId: 'scenes',
  },

  // Holiday Vibe - Add holiday elements
  {
    name: 'Holiday Vibe',
    description: 'Add holiday decorations and atmosphere without changing the character',
    recipeNote: 'Attach the image you want to add holiday vibes to. The character and location will stay the same.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `DO NOT change the character or the location in this image.
DO NOT alter the person's face, body, clothing, or pose.
DO NOT change the environment structure or layout.

ONLY ADD elements that give this image a <<HOLIDAY:select(Christmas,Valentines Day,Halloween,Easter,Thanksgiving,New Years Eve,Fourth of July,St Patricks Day,Lunar New Year,Diwali,Hanukkah,Cinco de Mayo)!>> vibe.

You may add:
- Holiday-specific decorations (lights, ornaments, banners, etc.)
- Seasonal atmospheric effects (snow, confetti, sparkles, etc.)
- Holiday-themed props in the environment
- Appropriate color grading/lighting that matches the holiday mood
- Festive background elements

Keep the subject looking natural and not like they're wearing a costume (unless it makes sense for the holiday).
The additions should feel organic and integrated, not pasted on.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'Holiday',
    categoryId: 'scenes',
  },

  // Story to 9 Frames - Complete visual narrative
  {
    name: 'Story to 9 Frames',
    description: 'Tell an entire story in 9 cinematic frames. Attach character sheet and style guide for consistency.',
    recipeNote: 'Attach: 1) Character sheet, 2) Style guide. Enter your story. The AI will identify 9 key moments and visualize them.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `MAIN CHARACTER: @<<CHARACTER_NAME:name!>>
Use the attached character sheet for ABSOLUTE consistency - same face, same body, same proportions in every frame.

STYLE: Match the attached style guide EXACTLY across all 9 frames.

STORY:
<<STORY:text!>>

Generate a 3x3 grid telling this COMPLETE STORY in 9 cinematic frames.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

CRITICAL - ABSOLUTE CONSISTENCY:
- Character looks IDENTICAL in every frame (same face, same features, same body)
- Clothing only changes if the story explicitly describes it
- Art style remains PERFECTLY consistent (same rendering, same colors, same lighting approach)
- The 9 frames together tell a COMPLETE, COHERENT story

ANALYZE THE STORY AND CREATE:

ROW 1 - ACT 1 (Setup):
1. THE WORLD: Establish the setting, show where the story takes place
2. THE CHARACTER: Introduce the protagonist in their normal world
3. THE INCITING INCIDENT: Something changes, disrupts the normal

ROW 2 - ACT 2 (Conflict):
4. THE JOURNEY BEGINS: Character responds to the change, takes action
5. THE CHALLENGE: Obstacles, conflict, struggle - show the difficulty
6. THE LOW POINT: Moment of doubt, failure, or greatest challenge

ROW 3 - ACT 3 (Resolution):
7. THE TURNING POINT: Character finds strength, solution, or revelation
8. THE CLIMAX: Peak action, confrontation, the decisive moment
9. THE NEW NORMAL: Resolution, aftermath, how things have changed

CINEMATOGRAPHY:
- Vary shot types: wide establishing, medium, close-up, etc.
- Use camera angles to enhance emotion (low angle = power, high angle = vulnerability)
- Lighting should reflect emotional tone (warm = comfort, cool = tension, dramatic = conflict)
- Each frame should be INSTANTLY UNDERSTANDABLE without text

<<GENRE:select(adventure,fantasy,slice of life,mystery,comedy,drama,action,heartwarming)>>

Black grid lines between all cells. No text, labels, or dialogue in frames.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'StoryFrames',
    categoryId: 'scenes',
  },

  // Talking Heads / Multi-Angle - Same scene from different camera angles
  {
    name: 'Talking Heads Multi-Angle',
    description: 'Same scene from 9 different camera angles - perfect for podcasts, interviews, TV shows, behind-the-scenes',
    recipeNote: 'Attach your character/scene reference. Get 9 angles: front, side, close-up, over-shoulder, wide, behind-the-scenes, and more.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the reference image. This is the PRIMARY SHOT of a <<SCENE_TYPE:select(podcast recording,interview,TV show scene,livestream setup,meeting,presentation,conversation,news broadcast)!>>.

Generate a 3x3 grid showing the EXACT SAME SCENE from 9 different camera angles.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

CRITICAL - ABSOLUTE CONSISTENCY:
- SAME person(s), SAME clothing, SAME environment, SAME lighting setup
- SAME props, equipment, and background elements
- SAME moment in time - nothing has moved or changed
- Only the CAMERA POSITION changes

THE 9 ANGLES:

ROW 1 - PRIMARY COVERAGE:
1. FRONT MEDIUM: Classic talking head, shoulders-up, direct to camera
2. FRONT CLOSE-UP: Tighter frame, face fills more of the shot, emotional intimacy
3. FRONT WIDE: Pull back to show full setup, desk/table, environment context

ROW 2 - SIDE ANGLES:
4. PROFILE LEFT: 90° side view from the left, clean silhouette
5. 3/4 ANGLE: 45° angle showing depth and dimension
6. PROFILE RIGHT: 90° side view from the right, clean silhouette

ROW 3 - PRODUCTION ANGLES:
7. OVER-THE-SHOULDER: From behind, showing what they're looking at (screen, guest, etc.)
8. HIGH ANGLE: Looking down at the setup, shows spatial layout
9. BEHIND-THE-SCENES: Wide shot showing production equipment - cameras, lights, monitors, crew silhouettes

<<PRODUCTION_STYLE:select(professional studio,home office,podcast booth,news desk,outdoor location,casual living room)>>
<<EQUIPMENT_VISIBLE:select(show microphones and monitors,minimal visible equipment,full production setup visible)>>

Maintain the attached style guide's visual language throughout.
Black grid lines between all cells. No text labels.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'TalkHead',
    categoryId: 'scenes',
  },

  // Time of Day Series
  {
    name: 'Time of Day',
    description: 'Same location across 6 different times of day',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the location in the reference image. Create a 2x3 grid showing this EXACT same location at 6 different times of day.

STRICT REQUIREMENTS:
- The location, architecture, and composition must remain IDENTICAL across all 6 frames
- Only the lighting, sky, and atmospheric conditions should change
- Maintain consistent camera angle and framing
- No people or moving objects should change position

THE 6 TIME PERIODS:
1. DAWN (5-6 AM) - Pre-sunrise, deep blue sky with hints of orange on horizon, soft diffused light, quiet atmosphere
2. GOLDEN HOUR MORNING (7-8 AM) - Warm golden sunlight, long soft shadows, gentle glow on surfaces
3. MIDDAY (12 PM) - Harsh overhead sun, minimal shadows, bright and washed out colors, high contrast
4. GOLDEN HOUR EVENING (5-6 PM) - Rich warm orange/amber light, long dramatic shadows, romantic atmosphere
5. BLUE HOUR (7-8 PM) - Post-sunset, deep blue sky with warm artificial lights beginning to glow, twilight mood
6. NIGHT (10 PM+) - Dark sky, <<NIGHT_LIGHTING:select(moonlit with silver highlights,city lights and neon glow,streetlamp pools of light,dramatic noir lighting,starlit with minimal ambient)!>>

Arrange as a 2 row × 3 column grid. No labels or text overlays.<<STYLE:select(,Maintain photorealistic style,Maintain cinematic film style,Maintain painterly style,Maintain anime style)>>`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '3:2',
    isQuickAccess: true,
    quickAccessLabel: 'TimeOfDay',
    categoryId: 'scenes',
  },

  // Photo to Character Sheet (Isolation) - 3-stage pipeline for storybook
  {
    name: 'Photo to Character Sheet (Isolation)',
    description: 'Multi-stage: Extract character from photo → Apply art style → Generate character sheet. Best for single-photo input.',
    recipeNote: 'Attach: 1) Full-body photo of person, 2) Style guide for target art style. This version isolates the character first - use "Multi-Ref" version if you have multiple reference angles.',
    stages: [
      // STAGE 1: Isolate character from photo
      {
        id: 'stage_0',
        order: 0,
        template: `Analyze the attached photo and extract the person as an isolated character.

CRITICAL LIKENESS PRESERVATION:
- Exact facial structure: bone structure, jaw shape, cheekbones, nose shape, eye shape and spacing
- Exact skin tone and undertones
- Exact hair: color, texture, style, length, hairline shape
- Exact body proportions: height, build, posture
- Exact distinguishing features: moles, freckles, scars, dimples, facial hair

Create a clean, full-body portrait on a simple neutral background.
Remove busy background elements while keeping the person COMPLETELY intact.
Do NOT alter, enhance, or "improve" any facial features.
The isolated character must be IDENTICAL to the input photo.`,
        fields: [],
        referenceImages: [],
      },
      // STAGE 2: Stylize the isolated character
      {
        id: 'stage_1',
        order: 1,
        template: `Transform this character into <<STYLE_NAME:text!>> style.

CRITICAL - ABSOLUTE LIKENESS PRESERVATION:
Even in stylized form, the character MUST be recognizable as the same person:
- Maintain exact facial proportions and structure
- Keep distinctive features (nose shape, eye spacing, jawline)
- Preserve exact skin tone relationships
- Keep exact hair style, texture, and color
- Maintain body proportions and posture

STYLE TRANSFER (use attached style guide reference image):
- Follow the style guide reference EXACTLY - it is the definitive visual
- Match the style guide's color palette and saturation
- Match line quality and rendering approach
- Match level of stylization (how simplified features become)
- Match lighting and shadow style
- Match edge treatment (sharp vs soft)

The result should look like THIS SPECIFIC PERSON drawn in the target art style.
NOT a generic character that vaguely resembles them.`,
        fields: [],
        referenceImages: [],
      },
      // STAGE 3: Generate character sheet
      {
        id: 'stage_2',
        order: 2,
        template: `Name/Tag: @<<CHARACTER_NAME:name!>>

Create a professional character reference sheet maintaining PERFECT LIKENESS.

CRITICAL: Every view and expression must clearly be the SAME PERSON from previous stages.
Facial structure, proportions, and distinctive features must remain IDENTICAL across all views.

CHARACTER SHEET LAYOUT (21:9 aspect ratio):

LEFT SECTION - FULL BODY:
- Large neutral standing pose, front view (primary)
- Smaller side profile view
- Smaller back view (if space permits)
- Color palette strip: skin tone, hair color, eye color, main clothing colors

RIGHT SECTION - EXPRESSIONS (2 rows × 5 columns):
Row 1: Neutral, Happy, Sad, Angry, Surprised
Row 2: Speaking, Shouting, Whispering, Smug/Confident, Scared

TOP: Character name "@<<CHARACTER_NAME:name!>>" prominently displayed

All expressions must maintain the SAME face - only the expression changes, not the underlying structure.
White/light gray background. Clean, production-ready layout.
Maintain exact art style consistency from Stage 2.`,
        fields: [],
        referenceImages: [],
      }
    ],
    suggestedAspectRatio: '21:9',
    isQuickAccess: true,
    quickAccessLabel: 'PhotoChar',
    categoryId: 'characters',
    isSystemOnly: true,  // Hidden from users, used internally by storybook
  },

  // Photo to Character Sheet (Multi-Reference) - For multiple reference angles
  {
    name: 'Photo to Character Sheet (Multi-Ref)',
    description: 'Generate character sheet from multiple reference photos. Better likeness from multiple angles.',
    recipeNote: 'Attach: Multiple photos of the same person from different angles + style guide. More references = better likeness.',
    stages: [
      // STAGE 1: Analyze all references and stylize
      {
        id: 'stage_0',
        order: 0,
        template: `You have multiple reference photos of the SAME person from different angles.

CRITICAL: Analyze ALL attached reference images to build a complete understanding of this person:
- Study facial structure from every available angle
- Note how features look from front, side, 3/4 view
- Identify consistent skin tone, hair texture, body proportions
- Catalog distinguishing features: moles, freckles, facial hair, scars

Now transform this person into <<ART_STYLE:select(claymation,watercolor,cartoon,anime,3D animated,illustrated,storybook,Disney-style,Pixar-style)!>> style.

ABSOLUTE LIKENESS PRESERVATION:
Even in stylized form, someone who knows this person should recognize them instantly.
Maintain ALL distinctive features in stylized form.
Use the multiple angles to ensure 3D-consistent stylization.

STYLE TRANSFER (use attached style guide):
- Match style guide's color palette and saturation
- Match line quality and rendering approach
- Match level of stylization
- Match lighting and shadow style

Output: The character in stylized form, full body, clean background.`,
        fields: [],
        referenceImages: [],
      },
      // STAGE 2: Generate character sheet
      {
        id: 'stage_1',
        order: 1,
        template: `Name/Tag: @<<CHARACTER_NAME:name!>>

Create a professional character reference sheet.

CRITICAL: Maintain PERFECT LIKENESS across all views - this must clearly be the same person from every angle.
Use your understanding from the multiple reference photos.

CHARACTER SHEET LAYOUT (21:9 aspect ratio):

LEFT SECTION - FULL BODY:
- Large neutral standing pose, front view (primary)
- Smaller side profile view
- Smaller back view (if space permits)
- Color palette strip: skin tone, hair color, eye color, main clothing colors

RIGHT SECTION - EXPRESSIONS (2 rows × 5 columns):
Row 1: Neutral, Happy, Sad, Angry, Surprised
Row 2: Speaking, Shouting, Whispering, Smug/Confident, Scared

TOP: Character name "@<<CHARACTER_NAME:name!>>" prominently displayed

CONSISTENCY CHECK: All 10 expressions + all body views = SAME recognizable person.
White/light gray background. Clean, production-ready layout.`,
        fields: [],
        referenceImages: [],
      }
    ],
    suggestedAspectRatio: '21:9',
    isQuickAccess: false,
    quickAccessLabel: 'MultiRef',
    categoryId: 'characters',
  },

  // Book Cover Generator - 2-stage pipeline for storybook
  {
    name: 'Book Cover Generator',
    description: 'Generate 9 book cover variations, select one, upscale to final quality',
    recipeNote: 'Attach: 1) Style guide, 2) Main character sheet. Enter book title.',
    stages: [
      // STAGE 1: Generate 9 cover variations in grid
      {
        id: 'stage_0',
        order: 0,
        template: `Create a 3x3 grid of 9 children's book cover variations.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

BOOK TITLE: "<<BOOK_TITLE:text!>>"

CRITICAL - MAINTAIN EXACT ART STYLE:
Use the attached style guide as your ABSOLUTE visual reference:
- Match color palette EXACTLY (same saturation, same hues)
- Match rendering style (painterly, flat, textured, 3D, etc.)
- Match line quality (thick outlines, thin lines, no outlines)
- Match lighting approach (soft, dramatic, flat)
- Match level of detail and stylization

CRITICAL - MAINTAIN CHARACTER LIKENESS:
Use the attached character sheet for the main character:
- Same facial structure and proportions
- Same clothing/outfit style
- Same color scheme for character
- Character must be RECOGNIZABLE across all 9 covers

CHILDREN'S BOOK COVER BEST PRACTICES:
- Title should be LARGE, READABLE, and positioned strategically
- Title font should match the book's tone (playful, adventurous, cozy)
- Character should be the FOCAL POINT and emotionally engaging
- Use bright, appealing colors that attract children
- Create visual hierarchy: Title → Character → Background
- Leave breathing room around the title
- Background should support the story mood without overwhelming

9 VARIATION APPROACHES:
1. Character close-up with expressive face, title above
2. Character in action pose, title integrated into scene
3. Character with story-relevant props/elements
4. Dramatic silhouette with glowing/magical elements
5. Character in their world/environment
6. Whimsical/playful composition with fun angles
7. Classic centered composition with decorative border
8. Modern bold design with strong shapes
9. Adventure/journey feel with dynamic perspective

All 9 in <<ASPECT_RATIO:select(2:3,3:4,1:1,4:5)!>> aspect ratio.
NO mockup frames - just the cover art with BLACK GRID LINES separating cells.`,
        fields: [],
        referenceImages: [],
      },
      // STAGE 2: Upscale selected cover
      {
        id: 'stage_1',
        order: 1,
        template: `Take this book cover and enhance it to publication quality.

MAINTAIN EXACTLY:
- The exact composition - do not crop or reframe
- The exact art style from the style guide
- The exact character likeness
- The title text and positioning
- All visual elements and their relationships

ENHANCE:
- Resolution and fine detail
- Color vibrancy and contrast
- Title text clarity and readability
- Edge definition and sharpness
- Texture detail in character and environment

Output a single high-quality children's book cover ready for print (300 DPI equivalent quality).`,
        fields: [],
        referenceImages: [],
      }
    ],
    suggestedAspectRatio: '2:3',
    isQuickAccess: true,
    quickAccessLabel: 'BookCover',
    categoryId: 'scenes',
  },

  // Story Page Variations - for storybook page-by-page generation
  {
    name: 'Story Page Variations',
    description: 'Generate 9 image variations for a single story page. Attach character sheet(s) and style guide.',
    recipeNote: 'Attach: 1) Character sheet(s), 2) Style guide. The 9 variations will be in a 3x3 grid with black separator lines for easy extraction.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `STORY MOMENT:
<<PAGE_TEXT:text!>>

Create a 3x3 grid (9 variations) illustrating this story moment for a children's book.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

CRITICAL - ABSOLUTE STYLE CONSISTENCY:
Match the attached style guide EXACTLY across all 9 cells:
- Same color palette and saturation
- Same rendering approach (painterly, flat, 3D, etc.)
- Same line quality and edge treatment
- Same lighting style and mood
- Same level of detail and stylization

CRITICAL - ABSOLUTE CHARACTER CONSISTENCY:
Match the attached character sheet(s) EXACTLY:
- Same facial structure and proportions
- Same body type and posture style
- Same clothing and color scheme
- Same hair style and color
- Character must be INSTANTLY RECOGNIZABLE in all 9 cells

<<STYLE_NOTES:text>>
<<CHARACTER_NOTES:text>>

THE 9 COMPOSITION VARIATIONS:
1. WIDE ESTABLISHING - Full environment, characters smaller in scene
2. MEDIUM SCENE - Characters at medium distance, context visible
3. CHARACTER FOCUS - Close on character(s), emotion clear
4. ACTION MOMENT - Peak of action, dynamic energy
5. REACTION SHOT - Character's emotional response
6. ENVIRONMENT DETAIL - Focus on setting/props that matter to story
7. LOW ANGLE - Looking up, adds drama or wonder
8. HIGH ANGLE - Looking down, shows spatial relationship
9. CLASSIC STORYBOOK - Centered, balanced, traditional composition

Each cell shows the SAME story moment, just framed differently.
NO text overlays in the images.
Black grid lines between all cells.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'PageVar',
    categoryId: 'scenes',
  },

  // Character Through Ages - Same character at different life stages
  {
    name: 'Character Through Ages',
    description: 'Show the same character at 9 different ages - from baby to elderly',
    recipeNote: 'Attach your character reference. The character will be shown at 9 life stages while maintaining their core identity and distinguishing features.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the reference character. This is @<<CHARACTER_NAME:name!>>.

Generate a 3x3 grid showing this SAME CHARACTER at 9 different life stages.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

CRITICAL - IDENTITY PRESERVATION:
Throughout ALL ages, maintain the character's:
- Core facial structure proportions (adjusted for age appropriately)
- Distinctive features (birthmarks, dimples, nose shape, ear shape)
- Eye color and shape
- Ethnicity and skin tone
- Overall "essence" - they must be recognizably the SAME PERSON

THE 9 AGES (in order):

ROW 1 - CHILDHOOD:
1. BABY (0-1): Infant version, soft features, same distinctive markers
2. TODDLER (2-4): Playful, curious expression, developing features
3. CHILD (6-8): School age, personality emerging, same core features

ROW 2 - YOUTH TO ADULT:
4. PRETEEN (10-12): Transitioning features, recognizable identity
5. TEENAGER (15-17): Young adult features forming, same person clearly
6. YOUNG ADULT (25-30): Prime of life, full adult features

ROW 3 - MATURITY:
7. MIDDLE AGE (45-50): Some aging signs, same core identity
8. SENIOR (65-70): Gray hair, wrinkles, but still recognizably them
9. ELDERLY (80+): Advanced age, wisdom in eyes, same person

Each cell shows a portrait (shoulders-up or chest-up) with appropriate:
- Age-appropriate hairstyle (but consistent hair texture/color until graying)
- Age-appropriate clothing style for each era
- Age-appropriate expression and demeanor

<<ART_STYLE:select(realistic,illustrated,3D animated,painterly,claymation)>>

Black grid lines between all cells. No text labels.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'Ages',
    categoryId: 'characters',
  },

  // Character Generator - Generate 9 unique character designs from basic traits
  {
    name: 'Character Generator',
    description: 'Generate 9 unique character designs from basic traits. Pick your favorite to become your main character.',
    recipeNote: 'Attach your style guide. Enter character traits (age, gender, distinctive features). Get 9 unique designs to choose from!',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Generate a 3x3 grid of 9 COMPLETELY UNIQUE character designs for a children's book.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

CRITICAL - MATCH THE ATTACHED STYLE GUIDE EXACTLY:
- Same color palette and saturation
- Same rendering style (painterly, flat, 3D, claymation, etc.)
- Same line quality and edge treatment
- Same level of stylization
- Same lighting approach

ALL 9 CHARACTERS MUST SHARE THESE TRAITS:
- Gender: <<GENDER:select(girl,boy,non-binary)!>>
- Age: <<AGE:select(toddler (2-4),young child (5-7),older child (8-10),preteen (11-13))!>>
- Ethnicity: <<ETHNICITY:select(Black,White,Asian,Hispanic/Latino,South Asian,Middle Eastern,Mixed/Multiracial,Indigenous,any)!>>
<<DISTINCTIVE_FEATURES:text>>

BUT EACH CHARACTER MUST BE COMPLETELY DIFFERENT IN:
- Face shape and features (round, oval, angular, etc.)
- Hair style (braids, locs, curly, straight, short, long, ponytail, etc.)
- Hair color (if appropriate for ethnicity)
- Body type (tall, short, thin, chubby, athletic)
- Clothing style (casual, sporty, dressy, artistic, etc.)
- Personality expressed through pose/expression (shy, confident, curious, playful, etc.)

LAYOUT: Each cell shows ONE character in a full-body pose with clean background.
Show personality through pose and expression.
Make each character instantly distinguishable from the others.
These should feel like 9 different main characters, not variations of the same person.

No text labels. Black grid lines between cells.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'CharGen',
    categoryId: 'characters',
  },

  // Wardrobe Variations - Character in different outfits (user specifies each)
  {
    name: 'Wardrobe Variations',
    description: 'Generate 6 variations of your character in different outfits you specify',
    recipeNote: 'Attach your character reference. Specify what outfit/look goes in each cell, or leave blank for random luxury outfits.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the character in the reference image. This is @<<CHARACTER_NAME:name!>>.

Create a 2x3 grid (2 rows, 3 columns) showing this EXACT same character in 6 different outfits.

CRITICAL - MAINTAIN ACROSS ALL 6 CELLS:
- Identical face, facial features, expression style
- Same hair style and color
- Same body type and proportions
- Same art style and rendering quality
- Same age and overall appearance

EACH CELL LAYOUT:
- <<BACKGROUND_COLOR:select(white,light gray,soft blue,cream,pale pink,mint green)!>> background
- Full body view showing complete outfit
- Clean, production-ready framing

THE 6 OUTFITS (Row 1, Col 1 → Row 2, Col 3):
Row 1, Col 1: <<OUTFIT_1:text>>
Row 1, Col 2: <<OUTFIT_2:text>>
Row 1, Col 3: <<OUTFIT_3:text>>
Row 2, Col 1: <<OUTFIT_4:text>>
Row 2, Col 2: <<OUTFIT_5:text>>
Row 2, Col 3: <<OUTFIT_6:text>>

If any outfit field is empty, generate a creative luxury outfit variation.
Each outfit should be COMPLETELY DIFFERENT in style, silhouette, and color palette.
No text labels - clean imagery only.`,
      fields: [],
      referenceImages: [
        {
          id: 'template_wardrobe_grid',
          url: SYSTEM_TEMPLATE_URLS.wardrobeGrid,
          name: 'Wardrobe 2x3 Grid Layout',
          aspectRatio: '16:9',
        },
      ],
    }],
    suggestedAspectRatio: '16:9',
    isQuickAccess: true,
    quickAccessLabel: 'Wardrobe',
    categoryId: 'characters',
  },

  // Eye Level Grid - Standard eye-level shots with user-selected sizes
  {
    name: 'Eye Level Grid',
    description: '3x3 grid with your image centered. All shots at eye level. Choose 8 shot sizes for surrounding frames.',
    recipeNote: 'Attach a reference image. It goes in the center. Pick sizes for the 8 surrounding frames - all at eye level.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a 3x3 cinematic contact sheet with the attached image as CENTER reference.

CAMERA ANGLE: EYE LEVEL (straight on, neutral perspective) - LOCKED for all 8 frames
IMPORTANT: Separate each cell with solid BLACK LINE (4-6 pixels wide).

THE 8 FRAMES (all eye level, only size varies):
1. Top-Left: <<FRAME_1:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
2. Top-Center: <<FRAME_2:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
3. Top-Right: <<FRAME_3:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
4. Middle-Left: <<FRAME_4:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
5. Middle-Right: <<FRAME_5:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
6. Bottom-Left: <<FRAME_6:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
7. Bottom-Center: <<FRAME_7:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
8. Bottom-Right: <<FRAME_8:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>

CENTER: Use attached reference image as-is

REQUIREMENTS:
- ALL 8 frames: EYE LEVEL (camera at subject's eye height, straight on)
- Identical subject, outfit, environment, lighting
- Depth of field: shallower for tighter shots
- Black grid lines between all 9 cells
- No labels or text overlays`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'EyeLevel',
    categoryId: 'scenes',
  },

  // Low Angle Grid - All shots looking up at subject
  {
    name: 'Low Angle Grid',
    description: '3x3 grid with your image centered. All shots from low angle looking UP. Choose 8 shot sizes.',
    recipeNote: 'Attach a reference image. It goes in the center. Pick sizes for the 8 surrounding frames - all looking UP at subject.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a 3x3 cinematic contact sheet with the attached image as CENTER reference.

CAMERA ANGLE: LOW ANGLE (worm's eye, looking UP at subject) - LOCKED for all 8 frames
IMPORTANT: Separate each cell with solid BLACK LINE (4-6 pixels wide).

THE 8 FRAMES (all low angle, only size varies):
1. Top-Left: <<FRAME_1:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
2. Top-Center: <<FRAME_2:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
3. Top-Right: <<FRAME_3:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
4. Middle-Left: <<FRAME_4:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
5. Middle-Right: <<FRAME_5:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
6. Bottom-Left: <<FRAME_6:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
7. Bottom-Center: <<FRAME_7:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
8. Bottom-Right: <<FRAME_8:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>

CENTER: Use attached reference image as-is

REQUIREMENTS:
- ALL 8 frames: LOW ANGLE (camera below, looking up at subject - heroic/powerful perspective)
- Identical subject, outfit, environment, lighting
- Depth of field: shallower for tighter shots
- Black grid lines between all 9 cells
- No labels or text overlays`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'LowAngle',
    categoryId: 'scenes',
  },

  // High Angle Grid - All shots looking down at subject
  {
    name: 'High Angle Grid',
    description: '3x3 grid with your image centered. All shots from high angle looking DOWN. Choose 8 shot sizes.',
    recipeNote: 'Attach a reference image. It goes in the center. Pick sizes for the 8 surrounding frames - all looking DOWN at subject.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a 3x3 cinematic contact sheet with the attached image as CENTER reference.

CAMERA ANGLE: HIGH ANGLE (bird's eye, looking DOWN at subject) - LOCKED for all 8 frames
IMPORTANT: Separate each cell with solid BLACK LINE (4-6 pixels wide).

THE 8 FRAMES (all high angle, only size varies):
1. Top-Left: <<FRAME_1:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
2. Top-Center: <<FRAME_2:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
3. Top-Right: <<FRAME_3:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
4. Middle-Left: <<FRAME_4:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
5. Middle-Right: <<FRAME_5:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
6. Bottom-Left: <<FRAME_6:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
7. Bottom-Center: <<FRAME_7:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>
8. Bottom-Right: <<FRAME_8:select(Extreme Close-Up,Big Close-Up,Close-Up,Medium Close-Up,Medium Shot,Medium Wide Shot,Wide Shot,Extreme Wide Shot)!>>

CENTER: Use attached reference image as-is

REQUIREMENTS:
- ALL 8 frames: HIGH ANGLE (camera above, looking down at subject - diminishing/overview perspective)
- Identical subject, outfit, environment, lighting
- Depth of field: shallower for tighter shots
- Black grid lines between all 9 cells
- No labels or text overlays`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'HighAngle',
    categoryId: 'scenes',
  },

  // Wide Shot Grid - Environmental focus with wider shots
  {
    name: 'Wide Shot Grid',
    description: '3x3 grid with your image centered. Environmental focus with wider shot options. Choose 8 shot sizes.',
    recipeNote: 'Attach a reference image. It goes in the center. Pick sizes for the 8 surrounding frames - biased toward establishing/environmental shots.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a 3x3 cinematic contact sheet with the attached image as CENTER reference.

CAMERA ANGLE: EYE LEVEL (environmental/establishing focus) - LOCKED for all 8 frames
IMPORTANT: Separate each cell with solid BLACK LINE (4-6 pixels wide).

THE 8 FRAMES (eye level, wide shot bias, only size varies):
1. Top-Left: <<FRAME_1:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
2. Top-Center: <<FRAME_2:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
3. Top-Right: <<FRAME_3:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
4. Middle-Left: <<FRAME_4:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
5. Middle-Right: <<FRAME_5:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
6. Bottom-Left: <<FRAME_6:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
7. Bottom-Center: <<FRAME_7:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>
8. Bottom-Right: <<FRAME_8:select(Extreme Wide Shot,Wide Shot,Medium Wide Shot,Medium Shot,Full Body Shot,Establishing Shot,Environmental Shot,Vista Shot)!>>

CENTER: Use attached reference image as-is

REQUIREMENTS:
- ALL 8 frames: Show MORE ENVIRONMENT than subject
- Establish context, location, atmosphere
- Identical subject, outfit, environment, lighting
- Deeper depth of field to show environmental detail
- Black grid lines between all 9 cells
- No labels or text overlays`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'WideShots',
    categoryId: 'scenes',
  },

  // 5 Minutes Later - Time progression from a single action
  {
    name: '5 Minutes Later',
    description: 'Show time progression of an action through 9 frames - from normal state to consequences',
    recipeNote: 'Attach a starting image (person in normal state). Enter what action they decide to do. The 9 frames show the progression from decision to consequences.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the reference image. This is the STARTING STATE - the person in their normal life before making a decision.

Generate a 3x3 grid showing a TIME PROGRESSION narrative of what happens after this person decides to: <<ACTION:text!>>

IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

CRITICAL - ABSOLUTE CONSISTENCY:
- SAME person (exact face, body, features) in all 9 frames
- Only clothing changes if the story requires it
- Art style remains PERFECTLY consistent
- Each frame shows a different MOMENT IN TIME

THE 9 FRAMES (Time Progression):

ROW 1 - THE DECISION (0-5 minutes):
1. NORMAL STATE: The person in their everyday life, as shown in the reference image. Peaceful, mundane, routine.
2. THE IDEA: A thought bubble or expression showing they're considering the action. Internal conflict visible.
3. PREPARATION: Making ready - gathering items, making a plan, the moment before commitment.

ROW 2 - THE ACTION (5-30 minutes):
4. POINT OF NO RETURN: The decisive moment - stepping through the door, making the call, starting the action.
5. IN THE MIDDLE: Deep in the action - fully committed, adrenaline, focus, the peak of the event.
6. IMMEDIATE AFTERMATH: The action complete - catching breath, looking at what they've done, first reaction.

ROW 3 - THE CONSEQUENCES (30 minutes - hours later):
7. RIPPLES BEGIN: First signs of consequences - other people noticing, things changing, domino effects starting.
8. FULL CONSEQUENCES: The weight of the decision fully realized - emotional, social, or physical impact visible.
9. NEW NORMAL: The final state - how their life has changed, for better or worse, the new equilibrium.

VISUAL STORYTELLING:
- Use lighting to show mood progression (warm → tense → cool or vice versa)
- Vary shot types: wide establishing → medium → close-up for emotional beats
- Time-of-day can progress to show passage of time
- Environmental details should reflect consequences (messy vs clean, crowded vs empty)

<<TONE:select(comedic/lighthearted,dramatic/serious,absurdist/surreal,wholesome/heartwarming,dark comedy)!>>
<<TIME_SPAN:select(5 minutes to 1 hour,1 hour to 1 day,1 day to 1 week,instant to lifetime)!>>

The story should be VISUALLY CLEAR without text.
Black grid lines between all cells. No dialogue or captions.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: '5MinLater',
    categoryId: 'time-based',
  },

  // ============================================================================
  // NEW RECIPES FROM NANO BANANA PRO COMMUNITY
  // ============================================================================

  // Professional Headshot - Transform any photo into polished headshot
  {
    name: 'Professional Headshot',
    description: 'Transform any photo into a polished professional headshot for LinkedIn, websites, or corporate use',
    recipeNote: 'Upload a photo of the person. Choose style, lighting, and background options.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Keep facial features EXACTLY consistent with reference image.
Preserve: face shape, eye color, skin tone, distinctive features, facial structure.

STYLE: <<STYLE:select(Corporate LinkedIn,Creative Industry,Executive Portrait,Casual Professional,Academic/Research,Tech Startup,Real Estate Agent,Healthcare Professional)!>>

LIGHTING: <<LIGHTING:select(Bright Studio (clean/corporate),Soft Natural Window Light,Dramatic Rim Light,High Key (bright/airy),Golden Hour Warmth,Split Light (artistic),Loop Lighting (classic portrait))!>>

BACKGROUND: <<BACKGROUND:select(Pure White,Soft Gray Gradient,Blurred Office Environment,Gradient Blue (professional),Dark Professional,Natural Bokeh,Architectural Elements)!>>

FRAMING: Professional headshot framing
- Shoulders up, centered composition
- Head occupies 60-70% of vertical frame
- Eyes at upper third intersection
- Slight negative space above head

QUALITY REQUIREMENTS:
- Shot on professional camera with 85mm f/1.4 lens equivalent
- High-resolution, tack sharp focus on eyes
- Natural skin texture, subtle retouching
- Professional color grading
- Clean, polished final look suitable for business use`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'Headshot',
    categoryId: 'characters',
  },

  // Virtual Try-On - See yourself in different clothing
  {
    name: 'Virtual Try-On',
    description: 'Composite clothing onto a person - perfect for fashion visualization',
    recipeNote: 'Attach: 1) Photo of person (full body or upper body), 2) Photo of garment/clothing item. The AI will dress the person in the garment.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `VIRTUAL TRY-ON TASK:
Dress the person in the provided garment while maintaining their exact identity.

CRITICAL - PRESERVE EXACTLY:
- Face: identical facial features, expression, skin tone
- Body: same body type, proportions, pose (adjust naturally for clothing)
- Hair: identical style, color, and arrangement
- Accessories: keep any jewelry, glasses, watches unless they conflict with garment

GARMENT APPLICATION:
- Fit the garment naturally to the person's body type
- Maintain garment's original color, texture, and details
- Add realistic fabric physics (draping, folding, stretching)
- Match lighting on garment to scene lighting
- Add appropriate shadows where garment meets body

<<FIT_STYLE:select(True to size,Slightly oversized,Fitted/tailored,Loose/relaxed)>>
<<SETTING:select(Keep original background,Clean studio white,Fashion editorial backdrop,Casual lifestyle setting,E-commerce product shot)!>>

OUTPUT: Photorealistic image of the person wearing the garment.
Should look like an actual photo, not a composite.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '3:4',
    isQuickAccess: true,
    quickAccessLabel: 'TryOn',
    categoryId: 'products',
  },

  // Magazine Cover - Create editorial magazine covers
  {
    name: 'Magazine Cover',
    description: 'Transform a photo into a professional magazine cover with titles and layouts',
    recipeNote: 'Attach a photo of the subject. Enter magazine name and headline. Choose a color scheme.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a professional magazine cover featuring the subject from the reference image.

MAGAZINE: "<<MAGAZINE_NAME:text!>>"
HEADLINE: "<<HEADLINE:text!>>"
<<SUBHEADLINES:text>>

SUBJECT TREATMENT:
- Keep subject's exact likeness
- Frame as hero/cover shot (typically chest-up or 3/4 body)
- Add editorial-quality lighting and color grading
- High fashion/editorial styling feel

LAYOUT STYLE: <<LAYOUT:select(Classic Fashion (Vogue style),Modern Minimalist,Bold Typography,Luxury Lifestyle,Entertainment Weekly style,Business/Forbes style,Sports Illustrated style)!>>

COLOR SCHEME: <<COLORS:select(Classic White/Black,Bold Red Accent,Luxury Gold,Cool Blues,Warm Neutrals,Vibrant Pop Colors,Monochromatic)!>>

TYPOGRAPHY:
- Magazine title prominently at top
- Main headline as largest text
- 2-3 smaller subheadlines/teasers
- Text should NOT obscure the subject's face
- Professional editorial typography

QUALITY: High-end glossy magazine finish, ready for print.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '2:3',
    isQuickAccess: true,
    quickAccessLabel: 'Magazine',
    categoryId: 'products',
  },

  // Infographic Generator - Visual explanation of any topic
  {
    name: 'Infographic Generator',
    description: 'Generate a visual infographic explaining any topic with icons and illustrations',
    recipeNote: 'Enter the topic to explain. The AI will create a visual infographic with icons, illustrations, and clear visual hierarchy.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create an engaging visual infographic about: <<TOPIC:text!>>

<<ADDITIONAL_DETAILS:text>>

STYLE: <<STYLE:select(Modern Flat Design,Isometric 3D,Hand-Drawn Sketch,Corporate Professional,Playful/Fun,Technical/Scientific,Retro/Vintage)!>>

COLOR SCHEME: <<COLORS:select(Corporate Blues,Nature Greens,Warm Sunset,Monochrome,Vibrant Rainbow,Pastel Soft,Dark Mode)!>>

INFOGRAPHIC REQUIREMENTS:
- Clear visual hierarchy (most important info largest)
- Icons and illustrations to represent concepts
- Data visualization if applicable (charts, graphs)
- Visual flow that guides the eye top-to-bottom or left-to-right
- Consistent icon style throughout
- Balanced white space
- Easy to understand at a glance

SECTIONS TO INCLUDE:
1. Title/Header with main topic
2. Key statistics or facts (3-5 main points)
3. Visual representations of processes or relationships
4. Supporting icons and illustrations
5. Conclusion or call-to-action

TEXT: Include minimal, essential text labels.
The visuals should communicate the core ideas even without reading.

Output a single cohesive infographic image.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '9:16',
    isQuickAccess: true,
    quickAccessLabel: 'Infograph',
    categoryId: 'custom',
  },

  // Product Photography - Professional product shots
  {
    name: 'Product Photography',
    description: 'Transform product photos into professional e-commerce/advertising quality shots',
    recipeNote: 'Attach a photo of the product. Choose lighting, background, and styling options.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a professional product photograph of the item in the reference image.

PRODUCT PRESERVATION:
- Maintain exact product shape, colors, textures, and branding
- Keep all logos, text, and details sharp and readable
- Preserve material properties (glossy, matte, metallic, etc.)

LIGHTING STYLE: <<LIGHTING:select(Soft Box Studio,Hard Light Dramatic,Natural Window Light,Gradient Sweep,Rim/Edge Lighting,High Key Bright,Low Key Moody,Golden Hour)!>>

BACKGROUND: <<BACKGROUND:select(Pure White (e-commerce),Gradient Gray,Contextual Lifestyle,Solid Color Pop,Textured Surface,Floating/Shadow Only,Environmental Setting)!>>

ANGLE/COMPOSITION: <<ANGLE:select(Hero Front View,45-Degree Beauty Shot,Top-Down Flat Lay,Side Profile,3/4 Perspective,Detail Close-Up)!>>

STYLING: <<STYLING:select(Minimal Clean,Props and Accessories,Lifestyle Context,Luxury Premium,Playful and Fun,Technical/Industrial)>>

QUALITY REQUIREMENTS:
- Advertising/e-commerce quality
- Sharp focus throughout product
- Professional color accuracy
- Clean, distraction-free composition
- Ready for print or web use`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'Product',
    categoryId: 'products',
  },

  // Split View 3D Render - Realistic vs technical visualization
  {
    name: 'Split View 3D',
    description: 'Create a split-view image showing realistic render on one side and wireframe/technical on the other',
    recipeNote: 'Attach an image of an object, character, or scene. The AI will create a dramatic split showing photorealistic vs technical view.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a SPLIT VIEW visualization of the subject from the reference image.

SPLIT STYLE: <<SPLIT:select(Left Realistic / Right Wireframe,Top Realistic / Bottom Technical,Diagonal Split,Center Explode View,Fade Transition)!>>

LEFT/TOP SIDE - PHOTOREALISTIC:
- Fully rendered photorealistic visualization
- Proper materials, textures, and lighting
- Studio-quality rendering
- Complete, finished look

RIGHT/BOTTOM SIDE - TECHNICAL: <<TECHNICAL_STYLE:select(Wireframe Mesh,Blueprint Schematic,X-Ray/Cutaway,Construction Lines,Low-Poly Geometric,Technical Drawing,Exploded Components)!>>

SUBJECT TREATMENT:
- Both views show the SAME subject from the SAME angle
- Seamless transition at the split point
- Technical side should reveal internal structure or construction
- Maintain consistent lighting direction across both halves

COLOR SCHEME FOR TECHNICAL SIDE: <<TECH_COLORS:select(Classic Blue Blueprint,Green Matrix/Tech,Orange Wireframe,White on Black,Cyan/Magenta,Gradient Neon)!>>

OUTPUT: Single image with dramatic split visualization.
Professional quality suitable for portfolio, presentation, or advertising.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '16:9',
    isQuickAccess: true,
    quickAccessLabel: 'SplitView',
    categoryId: 'products',
  },

  // Viral Thumbnail - Eye-catching video thumbnails
  {
    name: 'Viral Thumbnail',
    description: 'Create eye-catching YouTube/TikTok thumbnails with dramatic expressions and text',
    recipeNote: 'Attach a photo of the person. Enter the video title/hook. Choose an emotion style.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a viral-worthy video thumbnail for: "<<VIDEO_TITLE:text!>>"

SUBJECT FROM REFERENCE IMAGE:
- Keep exact facial features and identity
- AMPLIFY the expression for thumbnail impact

EXPRESSION/EMOTION: <<EMOTION:select(Shocked/Surprised (wide eyes open mouth),Excited/Hyped,Curious/Intrigued,Angry/Frustrated,Laughing/Joy,Mind-Blown,Skeptical/Side-Eye,Crying/Emotional)!>>

THUMBNAIL STYLE: <<STYLE:select(YouTube Classic (bold text + face),MrBeast Style (extreme expression),Tech Review (clean + product),Vlog Style (lifestyle),Educational (professional),Gaming/Reaction,Clickbait Maximum)!>>

TEXT TREATMENT:
- Title or hook text: LARGE, BOLD, READABLE
- Maximum 3-5 words visible
- High contrast against background
- Slight outline/shadow for readability

VISUAL ELEMENTS: <<ELEMENTS:select(Arrows and circles pointing at something,Emoji overlays,Before/After split,Money/Numbers,Red X or Green Checkmark,Fire or Explosion effects,Question marks)>>

BACKGROUND: <<BACKGROUND:select(Blurred context,Solid bright color,Gradient,Scene from video,Abstract pattern)!>>

REQUIREMENTS:
- MUST be readable at small size (mobile feed)
- Maximum visual impact in 1 second
- Face should occupy 40-60% of frame
- Text should not cover eyes
- Bright, saturated colors`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '16:9',
    isQuickAccess: true,
    quickAccessLabel: 'Thumbnail',
    categoryId: 'custom',
  },

  // Same Face Different Scenes - Consistent character across locations
  {
    name: 'Same Face Different Scenes',
    description: 'Generate 9 images of the same person in completely different scenes/locations while maintaining perfect likeness',
    recipeNote: 'Attach a photo of the person. The AI will place them in 9 different environments while keeping their face identical.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Analyze the person in the reference image. Generate a 3x3 grid showing this EXACT SAME PERSON in 9 completely different scenes.
IMPORTANT: Separate each cell with a solid BLACK LINE (4-6 pixels wide) for clean extraction.

CRITICAL - ABSOLUTE FACE CONSISTENCY:
- IDENTICAL facial features in every single frame
- Same face shape, eye color, nose, mouth, skin tone
- Same hair color and general style (can be styled differently)
- This must CLEARLY be the same person in all 9 images
- Age consistency - same person, same age throughout

THE 9 SCENES:

ROW 1 - URBAN/MODERN:
1. Coffee Shop: Cozy café setting, warm lighting, casual atmosphere
2. City Street: Urban environment, modern architecture, street style
3. Office/Workspace: Professional setting, clean modern office

ROW 2 - NATURE/OUTDOOR:
4. Beach: Ocean in background, golden hour lighting, relaxed vibe
5. Forest/Mountain: Natural setting, adventure feel, outdoor clothing
6. Garden/Park: Flowers or greenery, peaceful, natural light

ROW 3 - DRAMATIC/SPECIAL:
7. Studio Portrait: Clean background, professional lighting, editorial quality
8. Night Scene: City lights, dramatic lighting, evening atmosphere
9. Fantasy/Creative: <<CREATIVE_SCENE:select(Futuristic sci-fi,Medieval castle,Underwater,Space station,Magical forest,Art gallery,Red carpet event,Sports arena)!>>

CLOTHING: Appropriate for each scene but consistent with person's style.
LIGHTING: Natural and appropriate for each environment.
QUALITY: High-resolution, professional photography quality.

Black grid lines between all 9 cells. No text labels.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'SameFace',
    categoryId: 'characters',
  },

  // Action Figure Box - Turn anyone into a collectible figure
  {
    name: 'Action Figure Box',
    description: 'Transform a person into a collectible action figure in retail packaging',
    recipeNote: 'Attach a photo of the person. Enter their name/title. The AI will create a realistic action figure in packaging.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Transform the person from the reference image into a collectible action figure in retail packaging.

FIGURE NAME: "<<FIGURE_NAME:text!>>"
<<TAGLINE:text>>

PACKAGING STYLE: <<STYLE:select(Classic Action Figure (Hasbro/Mattel style),Funko Pop! Style,Premium Collector Edition,Vintage 80s/90s Retro,Japanese Import (anime style),Designer Art Toy,Sports Card + Figure,Barbie/Fashion Doll Style)!>>

FIGURE REQUIREMENTS:
- Face is a miniature version of the reference person (stylized appropriately)
- Full body figure in dynamic or signature pose
- Realistic figure materials (plastic, vinyl, articulation points visible)
- Detailed accessories and props that suit the character

PACKAGING ELEMENTS:
- Clear plastic bubble/window showing figure
- Cardboard backing with artwork and branding
- Name prominently displayed
- Age rating, brand logo, collector series info
- 2-3 accessories visible in package

BACKGROUND/SETTING: <<SETTING:select(Retail shelf with other toys,Clean product photography white,Collector display case,Toy store environment,Dramatic spotlight)!>>

QUALITY: Photorealistic render of actual product packaging.
Should look like a real toy you could buy in stores.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '3:4',
    isQuickAccess: true,
    quickAccessLabel: 'ActionFig',
    categoryId: 'products',
  },

  // =============================================================================
  // STORYBOOK SYSTEM RECIPES (hidden from regular users, used internally)
  // =============================================================================

  // Storybook Character Sheet - 3-stage pipeline for generating character sheets
  // Stage 0: Isolate character from photo
  // Stage 1: Transform to custom art style
  // Stage 2: Generate character sheet with expressions
  {
    name: 'Storybook Character Sheet',
    description: 'Generate character sheet from photo for storybook using 3-stage pipeline: isolate, stylize, sheet generation',
    recipeNote: 'This recipe is used internally by the Storybook feature. Requires: source photo, style guide image, and character sheet template.',
    stages: [
      // STAGE 0: Isolate character on white background
      {
        id: 'stage_0',
        order: 0,
        template: `Extract the person from this photo as a clean, isolated character portrait.

CRITICAL LIKENESS PRESERVATION:
- Exact facial structure: bone structure, jaw shape, cheekbones, nose shape, eye shape and spacing
- Exact skin tone and undertones
- Exact hair: color, texture, style, length, hairline shape
- Exact body proportions: height, build, posture
- Exact distinguishing features: moles, freckles, scars, dimples, facial hair

OUTPUT:
- Full-body standing pose on clean WHITE background
- Neutral expression, relaxed posture
- Soft studio lighting
- Remove all background elements completely
- Do NOT alter, enhance, or "improve" any facial features
- The isolated character must be IDENTICAL to the input photo`,
        fields: [],
        referenceImages: [],
      },
      // STAGE 1: Transform to custom art style
      {
        id: 'stage_1',
        order: 1,
        template: `Transform this isolated character into <<STYLE_NAME:text!>> style.

CRITICAL INSTRUCTIONS:
- Follow the attached style guide reference EXACTLY
- Do NOT deviate from the style shown in the reference
- The style guide is the definitive visual reference - words are open to interpretation, images are not

ABSOLUTE LIKENESS PRESERVATION (even in stylized form):
- Maintain exact facial proportions and structure
- Keep distinctive features (nose shape, eye spacing, jawline)
- Preserve exact skin tone relationships
- Keep exact hair style, texture, and color
- Maintain body proportions and posture

STYLE TRANSFER FROM REFERENCE:
- Match the color palette and saturation exactly
- Match line quality and rendering approach
- Match level of stylization (how simplified features become)
- Match lighting and shadow style
- Match edge treatment (sharp vs soft)

The result should look like THIS SPECIFIC PERSON drawn in the <<STYLE_NAME:text!>> style.
NOT a generic character that vaguely resembles them.
Output on clean white background.`,
        fields: [],
        referenceImages: [],
      },
      // STAGE 2: Generate character sheet with expressions
      {
        id: 'stage_2',
        order: 2,
        template: `CHARACTER: @<<CHARACTER_NAME:name!>>

Create a professional character reference sheet matching the attached template layout.

CRITICAL: Every view and expression must clearly be the SAME PERSON from previous stages.
Facial structure, proportions, and distinctive features must remain IDENTICAL across all views.

CHARACTER SHEET LAYOUT (21:9 aspect ratio):

LEFT SECTION - FULL BODY:
- Large neutral standing pose, front view (primary reference)
- Smaller side profile view
- Smaller back view (if space permits)
- Color palette strip: skin tone, hair color, eye color, main clothing colors

RIGHT SECTION - EXPRESSIONS (2 rows × 5 columns):
Row 1: Neutral, Happy, Sad, Angry, Surprised
Row 2: Speaking, Shouting, Whispering, Smug/Confident, Scared

TOP: Character name "@<<CHARACTER_NAME:name!>>" prominently displayed

CRITICAL REQUIREMENTS:
- All expressions maintain the SAME face structure - only expression changes
- Maintain EXACT art style from previous stage
- Clean white/light gray background
- Black separator lines between expression cells (4-6 pixels)
- Production-ready layout following the template reference`,
        fields: [],
        referenceImages: [
          {
            id: 'template_charsheet_advanced',
            url: SYSTEM_TEMPLATE_URLS.characterSheetAdvanced,
            name: 'Character Sheet Layout Template',
            aspectRatio: '21:9',
          }
        ],
      },
    ],
    suggestedAspectRatio: '21:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: false,
    categoryId: 'storybook',
    isSystem: true,
    isSystemOnly: true,  // Hidden from regular users - used internally by Storybook
  },

  // Storybook Character Sheet (From Description) - 2-stage pipeline for generating character sheets without photos
  // Stage 0: Generate character appearance from text description
  // Stage 1: Generate character sheet with expressions
  {
    name: 'Storybook Character Sheet (From Description)',
    description: 'Generate character sheet from text description for storybook (no photo required)',
    recipeNote: 'Used when no source photo is available. Generates character appearance from description in the target style, then creates a character sheet.',
    stages: [
      // STAGE 0: Generate character appearance from description
      {
        id: 'stage_desc_0',
        order: 0,
        type: 'generation',
        template: `Generate a character based on this description:

CHARACTER: @<<CHARACTER_NAME:name!>>
ROLE: <<CHARACTER_ROLE:text!>>
DESCRIPTION: <<CHARACTER_DESCRIPTION:text!>>

CRITICAL - PHYSICAL APPEARANCE:
The character's physical appearance MUST match the DESCRIPTION above EXACTLY:
- Hair color, hair style, hair length
- Clothing colors, clothing style
- Age, build, body type
- Skin tone, eye color
- Any distinguishing features mentioned

CRITICAL - ART STYLE ONLY:
The attached style guide reference shows the ART STYLE to use:
- Rendering approach (cartoon style, line quality, edge treatment)
- Color saturation and palette approach
- Level of detail and stylization
- Lighting and shading technique

DO NOT copy the physical appearance, hair, or clothing from the style guide characters.
ONLY use the style guide for the art style/rendering approach.

SETUP:
- Full-body standing pose on clean WHITE background
- Neutral expression, relaxed posture
- Soft studio lighting

Output: Full-body character portrait matching the DESCRIPTION exactly, rendered in the art style shown in the style guide.`,
        fields: [],
        referenceImages: [],  // Style guide attached at runtime
      },
      // STAGE 1: Generate character sheet with expressions
      {
        id: 'stage_desc_1',
        order: 1,
        type: 'generation',
        template: `Universal Character Sheet Template V3 - Precise Generation with Separated Sources

CHARACTER: @<<CHARACTER_NAME:name!>>
STYLE: <<STYLE_NAME:text!>>

INPUT SOURCES:
This generation uses THREE separate reference images:
1. LAYOUT REFERENCE (character sheet template): Use ONLY for structural layout - panel positions, grid lines, labels
2. CHARACTER REFERENCE (previous stage output): Source for character's physical features, clothing, identity
3. STYLE REFERENCE (style guide): Defines the art style/rendering approach for final output

CRITICAL: Do NOT copy the sketch/placeholder art from the template. Only use it for structure.

---

HEADER SECTION:
- Top Left: Display "CHARACTER @<<CHARACTER_NAME:name!>>" prominently
- Top Right: "DESCRIPTION/DETAILS" box (grey background, leave empty)

---

FULL BODY VIEWS (Left Section - Large Grid):
Label: "FULL BODY VIEWS"
Panels (3 columns):
1. Front View - Orthographic neutral standing pose, feet on baseline
2. Side Profile View (Left facing) - Orthographic side view
3. Back View - Orthographic back view

---

EXPRESSIONS & DETAILS (Upper Middle - 3×2 Grid):
Label: "EXPRESSIONS & DETAILS"
Style: Head and shoulders shot, consistent character model

Row 1 (Talking States):
1. TALKING-NEUTRAL: mouth slightly open, neutral brows
2. TALKING-HAPPY: mouth open smiling, eyebrows raised
3. TALKING-ANGRY: mouth open yelling, eyebrows furrowed

Row 2 (Emotions):
4. SAD: mouth closed down-turn, tearful eyes, sad brows
5. SURPRISED: mouth small 'O' shape, eyes wide, brows high
6. SMUG/CONFIDENT: slight smirk, confident gaze

---

TALKING VIEWS (Top Right - 1×3 Grid):
Label: "TALKING VIEWS"
Style: Angled headshots focusing on jaw movement

Panels:
1. 3/4 Rear Left - jawline and back of head while talking
2. 3/4 Front Right - standard dialogue angle
3. Profile Right - side profile talking mouth shape

---

CLOSE-UP DETAILS (Bottom Middle - 1×3 Strip):
Label: "CLOSE-UP DETAILS"
Style: Tight zoom on specific head features

Panels:
1. Front Face (Crop: Chin to Forehead)
2. Side Profile/Ear Detail
3. Rear Neck/Hairline Detail

---

ACCESSORIES (Bottom Right - 3×3 Grid):
Label: "ACCESSORIES"
If character has accessories (hat, glasses, shoes, props), render isolated views here.
If no accessories, leave panels as empty grey placeholders.

CRITICAL: Accessories must match the character reference and be rendered in <<STYLE_NAME:text!>> style.

---

COLOR PALETTE (Bottom Left Strip):
Label: "COLOR PALETTE"
Fill swatches with exact colors from character:
- FRONT: Main body color from front view
- HAPPY: Key highlight from happy expression
- YELLOW: Yellow elements (if present, else neutral grey)
- HAIR: Character hair color
- ANGRY: Shadow/highlight from angry expression
- SAD: Shadow from sad expression
- SURPRISED: Highlight from surprised expression
- SMUG: Color from smug expression

---

CRITICAL REQUIREMENTS:
✓ Every panel shows the SAME CHARACTER from previous stage
✓ Maintain IDENTICAL facial structure, proportions, distinctive features across ALL views
✓ Render entire sheet in <<STYLE_NAME:text!>> art style (from style guide reference)
✓ Follow template layout EXACTLY - match panel positions, grid lines, label positions
✓ Neutral background (white/light grey) - NO texture
✓ Black separator lines between cells (4-6 pixels)
✓ Character name "@<<CHARACTER_NAME:name!>>" clearly visible at top
✓ Production-ready reference sheet for animation/illustration use

FINAL OUTPUT: Complete character sheet with all panels filled, matching template structure, rendered consistently in <<STYLE_NAME:text!>> style.`,
        fields: [],
        referenceImages: [
          {
            id: 'template_charsheet_v3',
            url: SYSTEM_TEMPLATE_URLS.characterSheetV3,
            name: 'Character Sheet V3 Layout Template',
            aspectRatio: '21:9',
          }
        ],
      },
    ],
    suggestedAspectRatio: '21:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: false,
    categoryId: 'storybook',
    isSystem: true,
    isSystemOnly: false,  // Now visible in Shot Creator so users can refine the recipe
  },

  // Storybook Style Guide (system recipe)
  {
    name: 'Storybook Style Guide',
    description: '6-tile visual style guide for children\'s books',
    recipeNote: 'Used by storybook feature to generate art style reference',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `Create a visual style guide as a 6-image grid (2 rows × 3 columns) in <<STYLE_NAME:text!>> style.

CRITICAL: Separate each cell with a SOLID BLACK LINE (4-6 pixels wide).

<<STYLE_DESCRIPTION:text>>

THE 6 TILES (2x3 grid):
1. CHARACTER CLOSE-UP: A child character headshot, warm studio lighting, 3/4 view
2. ACTION SCENE: A different character in dynamic pose, motion blur background
3. ENVIRONMENT DETAIL: Interior scene, afternoon light through windows
4. CHARACTER INTERACTION: Two diverse characters (different ethnicities/appearances) in conversation
5. DYNAMIC POSE: Character in athletic stance, dramatic angle
6. SET/LOCATION DESIGN: Exterior establishing shot with background characters of varied appearances

DIVERSITY REQUIREMENTS:
- Use diverse characters with different ethnicities, skin tones, and appearances
- Show variety in hair colors, styles, and physical features
- Include both male and female characters across the tiles
- Make each character visually distinct and unique

Output a 16:9 image with exactly 6 tiles (2 rows x 3 columns) separated by black lines.
<<STYLE_NAME:text!>> style throughout all tiles.`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: false,
    categoryId: 'storybook',
    isSystem: true,
    isSystemOnly: true,
  },

  // Storybook Page (First) - Optimized for story opening
  {
    name: 'Storybook Page (First)',
    description: 'Generate the opening page illustration for a children\'s book story',
    recipeNote: 'Used by storybook feature for first pages. Optimized for story opening - no previous context needed.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `Create an engaging opening illustration for this children's book story.

STORY OPENING:

Current Page Text (the story begins):
"<<PAGE_TEXT:text!>>"

SCENE DETAILS:
<<SCENE_DESCRIPTION:text>>

MOOD: <<MOOD:select(Happy,Sad,Excited,Calm,Mysterious,Adventurous)!>>

CHARACTERS IN SCENE:
<<CHARACTER_NAMES:text>>

OPENING PAGE STORYTELLING:
- Establish the story's setting and atmosphere immediately
- Create visual intrigue to hook young readers
- Introduce main character(s) with clear, engaging poses
- Set the tone for the entire story
- Use composition to draw the eye to key story elements
- Choose appropriate framing that serves the narrative

CRITICAL STYLE REQUIREMENTS:
- A STYLE GUIDE reference image is attached - analyze it carefully
- Extract the EXACT art style from the style guide (rendering technique, line work, color palette, shading approach)
- Apply this style CONSISTENTLY to the entire illustration
- The style guide shows example illustrations - match that visual aesthetic precisely
- Maintain character consistency using attached character sheets (if provided)
- Characters should have EXACT same appearance, clothing, and features as their character sheets
- If no character sheets are attached, design characters that fit the style guide aesthetic

TECHNICAL REQUIREMENTS:
- No text overlays on image (text will be added separately)
- Age-appropriate for <<TARGET_AGE:text!>> year olds
- Diverse, inclusive representation
- Composition should balance illustration with space for text overlay

QUALITY STANDARDS:
- Professional children's book illustration quality
- Strong focal point that establishes the story's core
- Vibrant, engaging colors appropriate to the mood
- Fine details that reward close inspection
- Inviting composition that makes readers want to turn the page

CRITICAL: Use the attached STYLE GUIDE reference image to determine the exact art style, rendering technique, and visual aesthetic. Match it precisely.`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: false,
    categoryId: 'storybook',
    isSystem: true,
    isSystemOnly: true,
  },

  // Storybook Page (Continuation) - Optimized for story flow
  {
    name: 'Storybook Page (Continuation)',
    description: 'Generate a continuation page illustration for a children\'s book with story flow',
    recipeNote: 'Used by storybook feature for continuation pages. Maintains story continuity from previous page.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `Create an illustration for this children's book page that continues the story flow.

STORY CONTEXT:

Previous Page (what happened before):
<<PREVIOUS_PAGE_TEXT:text!>>

Current Page (what's happening now):
"<<PAGE_TEXT:text!>>"

SCENE DETAILS:
<<SCENE_DESCRIPTION:text>>

MOOD: <<MOOD:select(Happy,Sad,Excited,Calm,Mysterious,Adventurous)!>>

CHARACTERS IN SCENE:
<<CHARACTER_NAMES:text>>

STORYTELLING CONTINUITY:
- Show clear progression from the previous page's events
- Visual flow should feel natural (e.g., if character was walking left, continue that direction)
- Maintain consistent lighting/time of day unless story indicates a change
- Character expressions should reflect the emotional arc from the previous moment
- Background elements should show logical progression from previous scene
- Create visual cause-and-effect relationship with previous illustration
- Pacing should feel like natural story progression (not jarring jumps)
- Use composition that serves narrative progression

CRITICAL STYLE REQUIREMENTS:
- A STYLE GUIDE reference image is attached - analyze it carefully
- Extract the EXACT art style from the style guide (rendering technique, line work, color palette, shading approach)
- Apply this style CONSISTENTLY to the entire illustration
- The style guide shows example illustrations - match that visual aesthetic precisely
- Maintain character consistency using attached character sheets (if provided)
- Characters should have EXACT same appearance, clothing, and features as their character sheets
- If no character sheets are attached, design characters that fit the style guide aesthetic
- Keep the SAME art style as previous pages in the book

TECHNICAL REQUIREMENTS:
- No text overlays on image (text will be added separately)
- Age-appropriate for <<TARGET_AGE:text!>> year olds
- Diverse, inclusive representation
- Composition should balance illustration with space for text overlay

QUALITY STANDARDS:
- Professional children's book illustration quality
- Clear focal point that supports the story
- Vibrant, engaging colors appropriate to the mood
- Fine details that reward close inspection

CRITICAL: Use the attached STYLE GUIDE reference image to determine the exact art style, rendering technique, and visual aesthetic. Match it precisely.`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: false,
    categoryId: 'storybook',
    isSystem: true,
    isSystemOnly: true,
  },

  // Storybook Book Cover
  {
    name: 'Storybook Book Cover',
    description: 'Generate a professional children\'s book cover with title, author, and main character',
    recipeNote: 'Used by storybook feature to generate book covers. Includes embedded text (title + author) and main character illustration.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `Create a professional children's book cover illustration with embedded text.

BOOK INFORMATION:
Title: "<<BOOK_TITLE:text!>>"
Author: <<AUTHOR_NAME:text!>>
Target Age: <<TARGET_AGE:text!>> years old

MAIN CHARACTER:
<<MAIN_CHARACTER_DESCRIPTION:text!>>

COVER LAYOUT REQUIREMENTS:

1. TITLE PLACEMENT (Top third of cover):
   - Display the book title "<<BOOK_TITLE:text!>>" prominently
   - Use large, playful, child-friendly typography
   - Ensure text is readable with good contrast
   - Title should feel magical/whimsical
   - Use colors that complement the illustration

2. ILLUSTRATION (Center 60% of cover):
   - Feature the main character in an engaging pose
   - Show character's personality and energy
   - Dynamic composition that draws the eye
   - Match the art style from the style guide EXACTLY
   - Character should match their character sheet reference
   - Background hints at the story's setting/adventure
   - Age-appropriate for <<TARGET_AGE:text!>> year olds

3. AUTHOR NAME (Bottom of cover):
   - Display "by <<AUTHOR_NAME:text!>>" below the illustration
   - Smaller, elegant font
   - Good readability but doesn't compete with title

4. VISUAL STYLE:
   - Match style guide precisely (use reference image)
   - Bright, inviting colors that appeal to children
   - Professional children's book cover quality
   - Cover should work for both digital and print (high contrast)
   - Add subtle decorative elements (stars, sparkles, borders) if they enhance the design

TECHNICAL SPECS:
- Aspect ratio: 3:4 portrait (standard book cover proportions)
- All text MUST be clearly legible
- Ensure character consistency with attached character sheet
- High visual appeal to attract young readers
- Diverse, inclusive representation

Use reference images to match art style and character appearance exactly.`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '3:4',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: false,
    categoryId: 'storybook',
    isSystem: true,
    isSystemOnly: true,
  },

  // ========================================
  // CINEMATIC GRID RECIPES (10 recipes)
  // ========================================

  // POV Simulation (16:9)
  {
    name: 'POV Simulation (16:9)',
    description: 'First-person perspective grid showing what character sees through their own eyes',
    recipeNote: 'Attach character reference for outfit/appearance. Grid shows character\'s hands, arms, legs, but NOT their face (except in reflections).',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 16:9 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

CHARACTER PERSPECTIVE: First-person POV from @<<CHARACTER_NAME:name!>>'s eyes.
CURRENT ACTIVITY: <<STORY:text!>>

STYLE EXTRACTION: Analyze the style reference image for environmental textures, lighting quality, and color grading.

CAMERA SETTINGS:
- First Person Perspective (POV)
- Wide angle (24mm-35mm equivalent) simulating human vision
- We do NOT see <<CHARACTER_NAME:name!>>'s face (except in reflections)
- We DO see their ARMS, HANDS, LEGS dressed in their outfit

3×3 GRID LAYOUT (Reading order: Left→Right, Top→Bottom):

ROW 1 - INTERACTION:
Panel 1 (Top-Left): POV looking DOWN at @<<CHARACTER_NAME:name!>>'s own torso and outfit, establishing their identity and clothing.
Panel 2 (Top-Center): POV of @<<CHARACTER_NAME:name!>>'s HANDS interacting with a key object from the story (<<STORY:text!>>).
Panel 3 (Top-Right): POV of @<<CHARACTER_NAME:name!>> REACHING OUT to touch a texture or open a door in the environment.

ROW 2 - COMBAT/ACTION POV:
Panel 4 (Middle-Left): POV BLOCKING a light source or incoming attack with @<<CHARACTER_NAME:name!>>'s ARM visible in frame.
Panel 5 (Middle-Center): POV FOCUSING on a target or destination from <<STORY:text!>>. Hands visible in lower frame guiding the way.
Panel 6 (Middle-Right): POV looking at a REFLECTION (mirror/window/water). We FINALLY see @<<CHARACTER_NAME:name!>>'s face clearly in the reflection.

ROW 3 - ENVIRONMENTAL AWARENESS:
Panel 7 (Bottom-Left): POV looking DOWN at @<<CHARACTER_NAME:name!>>'s FEET moving across the specific terrain mentioned in <<STORY:text!>>.
Panel 8 (Bottom-Center): POV checking a TOOL, WEAPON, or PHONE held in @<<CHARACTER_NAME:name!>>'s hands.
Panel 9 (Bottom-Right): POV BLINKING/FADING. Vision is slightly blurred or vignetted, implying fatigue or emotion from <<STORY:text!>>.

CONSISTENCY REQUIREMENTS:
- All panels must show the SAME outfit on <<CHARACTER_NAME:name!>>
- Lighting and color grading from style reference must remain consistent
- Grid cells separated by SOLID BLACK LINES`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'characters',
    isSystem: true,
    isSystemOnly: false,
  },

  // POV Simulation (9:16)
  {
    name: 'POV Simulation (9:16)',
    description: 'First-person perspective grid showing what character sees through their own eyes (portrait)',
    recipeNote: 'Attach character reference for outfit/appearance. Grid shows character\'s hands, arms, legs, but NOT their face (except in reflections).',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 9:16 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

CHARACTER PERSPECTIVE: First-person POV from @<<CHARACTER_NAME:name!>>'s eyes.
CURRENT ACTIVITY: <<STORY:text!>>

STYLE EXTRACTION: Analyze the style reference image for environmental textures, lighting quality, and color grading.

CAMERA SETTINGS:
- First Person Perspective (POV)
- Wide angle (24mm-35mm equivalent) simulating human vision
- We do NOT see <<CHARACTER_NAME:name!>>'s face (except in reflections)
- We DO see their ARMS, HANDS, LEGS dressed in their outfit

3×3 GRID LAYOUT (Reading order: Left→Right, Top→Bottom):

ROW 1 - INTERACTION:
Panel 1 (Top-Left): POV looking DOWN at @<<CHARACTER_NAME:name!>>'s own torso and outfit, establishing their identity and clothing.
Panel 2 (Top-Center): POV of @<<CHARACTER_NAME:name!>>'s HANDS interacting with a key object from the story (<<STORY:text!>>).
Panel 3 (Top-Right): POV of @<<CHARACTER_NAME:name!>> REACHING OUT to touch a texture or open a door in the environment.

ROW 2 - COMBAT/ACTION POV:
Panel 4 (Middle-Left): POV BLOCKING a light source or incoming attack with @<<CHARACTER_NAME:name!>>'s ARM visible in frame.
Panel 5 (Middle-Center): POV FOCUSING on a target or destination from <<STORY:text!>>. Hands visible in lower frame guiding the way.
Panel 6 (Middle-Right): POV looking at a REFLECTION (mirror/window/water). We FINALLY see @<<CHARACTER_NAME:name!>>'s face clearly in the reflection.

ROW 3 - ENVIRONMENTAL AWARENESS:
Panel 7 (Bottom-Left): POV looking DOWN at @<<CHARACTER_NAME:name!>>'s FEET moving across the specific terrain mentioned in <<STORY:text!>>.
Panel 8 (Bottom-Center): POV checking a TOOL, WEAPON, or PHONE held in @<<CHARACTER_NAME:name!>>'s hands.
Panel 9 (Bottom-Right): POV BLINKING/FADING. Vision is slightly blurred or vignetted, implying fatigue or emotion from <<STORY:text!>>.

CONSISTENCY REQUIREMENTS:
- All panels must show the SAME outfit on <<CHARACTER_NAME:name!>>
- Lighting and color grading from style reference must remain consistent
- Grid cells separated by SOLID BLACK LINES`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '9:16',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'characters',
    isSystem: true,
    isSystemOnly: false,
  },

  // Action Sequencer (16:9)
  {
    name: 'Action Sequencer (16:9)',
    description: 'Motion breakdown grid showing action in 3 phases: Wind-Up → Impact → Aftermath',
    recipeNote: 'Best for fight scenes, athletic moves, or any dynamic action. Row 2 features motion blur.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 16:9 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

CHARACTER PERFORMING ACTION: @<<CHARACTER_NAME:name!>>
ACTION NARRATIVE: <<ACTION_STORY:text!>>

STYLE EXTRACTION: Analyze style reference for color palette, film grain, lighting contrast, and render engine style. Apply these EXACT visual parameters to @<<CHARACTER_NAME:name!>>.

CONSISTENCY: @<<CHARACTER_NAME:name!>> MUST maintain consistent facial features and costume details across all 9 panels despite rapid movement blur.

SHUTTER SPEED RULES:
- Rows 1 & 3: CRISP/STATIC (high shutter speed, frozen motion)
- Row 2: DIRECTIONAL MOTION BLUR (low shutter speed, action blur)

3×3 GRID LAYOUT - ACTION BREAKDOWN:

ROW 1 - THE WIND UP (Anticipation):
Panel 1 (Top-Left): @<<CHARACTER_NAME:name!>> shifts weight, tensing muscles. Focus on BODY MECHANICS preparing for the action in <<ACTION_STORY:text!>>.
Panel 2 (Top-Center): CLOSE-UP on @<<CHARACTER_NAME:name!>>'s EYES or HANDS. Intense focus. The moment BEFORE the strike/action.
Panel 3 (Top-Right): THE COIL. @<<CHARACTER_NAME:name!>> in the final frame of preparation, energy stored, ready to release.

ROW 2 - THE IMPACT (Action with Motion Blur):
Panel 4 (Middle-Left): THE RELEASE. @<<CHARACTER_NAME:name!>> EXPLODES into motion. High energy, frozen violence/action. Motion blur begins.
Panel 5 (Middle-Center): THE CONTACT/PEAK. The DEFINING moment of <<ACTION_STORY:text!>>. Maximum dynamic energy. Facial expression of EXERTION. Heavy motion blur.
Panel 6 (Middle-Right): FOLLOW-THROUGH. The limb or body part extends FULLY. Motion blur indicates speed.

ROW 3 - THE AFTERMATH (Reaction):
Panel 7 (Bottom-Left): THE LANDING. @<<CHARACTER_NAME:name!>> regains balance or skids to a halt. Dust/debris settling.
Panel 8 (Bottom-Center): PHYSICAL TOLL. Close-up on @<<CHARACTER_NAME:name!>> breathing hard, sweating, or bleeding (if applicable to <<ACTION_STORY:text!>>).
Panel 9 (Bottom-Right): THE RESOLVE. @<<CHARACTER_NAME:name!>> standing in the aftermath, body language showing the outcome of the action.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Character appearance MUST remain consistent despite motion blur`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'characters',
    isSystem: true,
    isSystemOnly: false,
  },

  // Action Sequencer (9:16)
  {
    name: 'Action Sequencer (9:16)',
    description: 'Motion breakdown grid showing action in 3 phases: Wind-Up → Impact → Aftermath (portrait)',
    recipeNote: 'Best for fight scenes, athletic moves, or any dynamic action. Row 2 features motion blur.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 9:16 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

CHARACTER PERFORMING ACTION: @<<CHARACTER_NAME:name!>>
ACTION NARRATIVE: <<ACTION_STORY:text!>>

STYLE EXTRACTION: Analyze style reference for color palette, film grain, lighting contrast, and render engine style. Apply these EXACT visual parameters to @<<CHARACTER_NAME:name!>>.

CONSISTENCY: @<<CHARACTER_NAME:name!>> MUST maintain consistent facial features and costume details across all 9 panels despite rapid movement blur.

SHUTTER SPEED RULES:
- Rows 1 & 3: CRISP/STATIC (high shutter speed, frozen motion)
- Row 2: DIRECTIONAL MOTION BLUR (low shutter speed, action blur)

3×3 GRID LAYOUT - ACTION BREAKDOWN:

ROW 1 - THE WIND UP (Anticipation):
Panel 1 (Top-Left): @<<CHARACTER_NAME:name!>> shifts weight, tensing muscles. Focus on BODY MECHANICS preparing for the action in <<ACTION_STORY:text!>>.
Panel 2 (Top-Center): CLOSE-UP on @<<CHARACTER_NAME:name!>>'s EYES or HANDS. Intense focus. The moment BEFORE the strike/action.
Panel 3 (Top-Right): THE COIL. @<<CHARACTER_NAME:name!>> in the final frame of preparation, energy stored, ready to release.

ROW 2 - THE IMPACT (Action with Motion Blur):
Panel 4 (Middle-Left): THE RELEASE. @<<CHARACTER_NAME:name!>> EXPLODES into motion. High energy, frozen violence/action. Motion blur begins.
Panel 5 (Middle-Center): THE CONTACT/PEAK. The DEFINING moment of <<ACTION_STORY:text!>>. Maximum dynamic energy. Facial expression of EXERTION. Heavy motion blur.
Panel 6 (Middle-Right): FOLLOW-THROUGH. The limb or body part extends FULLY. Motion blur indicates speed.

ROW 3 - THE AFTERMATH (Reaction):
Panel 7 (Bottom-Left): THE LANDING. @<<CHARACTER_NAME:name!>> regains balance or skids to a halt. Dust/debris settling.
Panel 8 (Bottom-Center): PHYSICAL TOLL. Close-up on @<<CHARACTER_NAME:name!>> breathing hard, sweating, or bleeding (if applicable to <<ACTION_STORY:text!>>).
Panel 9 (Bottom-Right): THE RESOLVE. @<<CHARACTER_NAME:name!>> standing in the aftermath, body language showing the outcome of the action.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Character appearance MUST remain consistent despite motion blur`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '9:16',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'characters',
    isSystem: true,
    isSystemOnly: false,
  },

  // World Building (16:9)
  {
    name: 'World Building (16:9)',
    description: 'Location exploration grid: Interior details → Exterior establishing → Voyeuristic views',
    recipeNote: 'Provide a reference image showing the main location. Grid explores the environment from multiple perspectives.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 16:9 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

LOCATION BEING EXPLORED: <<LOCATION_NAME:name!>>
DESCRIPTION: <<LOCATION_DESCRIPTION:text!>>

STYLE EXTRACTION: Analyze reference image for:
- Primary location type (e.g., dive bar, office, meadow, warehouse)
- Photographic style, lighting quality, film grain
- Color grading and atmospheric mood
- Main subjects (for context only)

CONSISTENCY RULES:
- All panels inhabit the EXACT SAME location
- Lighting and film stock style MUST remain consistent
- In Rows 1 & 3: Main subjects are present but SIGNIFICANTLY OUT OF FOCUS (heavy bokeh/blur)
- Sharp focus on ENVIRONMENTAL DETAILS, not people

3×3 GRID LAYOUT - LOCATION EXPLORATION:

ROW 1 - INTERIOR/INTIMATE CONTEXT (Shallow Depth of Field):
Panel 1 (Top-Left): WIDE ANGLE INTERIOR. A relevant foreground object (coffee cup, tool, hand on table) is INTENSELY SHARP. Any people in mid-ground are EXTREMELY BLURRY.
Panel 2 (Top-Center): MEDIUM SHOT INTERIOR. Looking past a structural element (doorframe, pillar, beam) that is SHARP in foreground. Any people in background are OUT OF FOCUS.
Panel 3 (Top-Right): MACRO DETAIL INTERIOR. Extreme close-up on a texture definitive of <<LOCATION_NAME:name!>> (peeling paint, polished chrome, worn wood grain). Any people are vague shapes in distance.

ROW 2 - EXTERIOR ESTABLISHING (The Reveal):
Panel 4 (Middle-Left): EYE-LEVEL STREET VIEW. Standard wide establishing shot of the EXTERIOR building facade of <<LOCATION_NAME:name!>>.
Panel 5 (Middle-Center): HIGH ANGLE DRONE SHOT. Excessive wide shot showing <<LOCATION_NAME:name!>> situated within its larger geography/cityscape. NO foreground elements.
Panel 6 (Middle-Right): ARCHITECTURAL DETAIL EXTERIOR. Focus on a specific exterior feature that gives character (neon sign, rusted fire escape, ornate doorway).

ROW 3 - EXTERIOR PEEP-HOLE (Voyeuristic View):
Panel 7 (Bottom-Left): THROUGH FOREGROUND ELEMENTS. Looking at the exterior location from distance through SHARP foreground foliage, fence, or rain-streaked glass. The location is SLIGHTLY SOFT.
Panel 8 (Bottom-Center): REFLECTION SHOT. The exterior of <<LOCATION_NAME:name!>> is seen ONLY as a reflection in a puddle, car window, or glossy surface.
Panel 9 (Bottom-Right): LONG LENS COMPRESSION. A telephoto shot from very far away, compressing distance. Heat haze or atmospheric perspective makes the location look distant and embedded in surroundings.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Infer exterior architecture from interior reference`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'environments',
    isSystem: true,
    isSystemOnly: false,
  },

  // World Building (9:16)
  {
    name: 'World Building (9:16)',
    description: 'Location exploration grid: Interior details → Exterior establishing → Voyeuristic views (portrait)',
    recipeNote: 'Provide a reference image showing the main location. Grid explores the environment from multiple perspectives.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 9:16 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

LOCATION BEING EXPLORED: <<LOCATION_NAME:name!>>
DESCRIPTION: <<LOCATION_DESCRIPTION:text!>>

STYLE EXTRACTION: Analyze reference image for:
- Primary location type (e.g., dive bar, office, meadow, warehouse)
- Photographic style, lighting quality, film grain
- Color grading and atmospheric mood
- Main subjects (for context only)

CONSISTENCY RULES:
- All panels inhabit the EXACT SAME location
- Lighting and film stock style MUST remain consistent
- In Rows 1 & 3: Main subjects are present but SIGNIFICANTLY OUT OF FOCUS (heavy bokeh/blur)
- Sharp focus on ENVIRONMENTAL DETAILS, not people

3×3 GRID LAYOUT - LOCATION EXPLORATION:

ROW 1 - INTERIOR/INTIMATE CONTEXT (Shallow Depth of Field):
Panel 1 (Top-Left): WIDE ANGLE INTERIOR. A relevant foreground object (coffee cup, tool, hand on table) is INTENSELY SHARP. Any people in mid-ground are EXTREMELY BLURRY.
Panel 2 (Top-Center): MEDIUM SHOT INTERIOR. Looking past a structural element (doorframe, pillar, beam) that is SHARP in foreground. Any people in background are OUT OF FOCUS.
Panel 3 (Top-Right): MACRO DETAIL INTERIOR. Extreme close-up on a texture definitive of <<LOCATION_NAME:name!>> (peeling paint, polished chrome, worn wood grain). Any people are vague shapes in distance.

ROW 2 - EXTERIOR ESTABLISHING (The Reveal):
Panel 4 (Middle-Left): EYE-LEVEL STREET VIEW. Standard wide establishing shot of the EXTERIOR building facade of <<LOCATION_NAME:name!>>.
Panel 5 (Middle-Center): HIGH ANGLE DRONE SHOT. Excessive wide shot showing <<LOCATION_NAME:name!>> situated within its larger geography/cityscape. NO foreground elements.
Panel 6 (Middle-Right): ARCHITECTURAL DETAIL EXTERIOR. Focus on a specific exterior feature that gives character (neon sign, rusted fire escape, ornate doorway).

ROW 3 - EXTERIOR PEEP-HOLE (Voyeuristic View):
Panel 7 (Bottom-Left): THROUGH FOREGROUND ELEMENTS. Looking at the exterior location from distance through SHARP foreground foliage, fence, or rain-streaked glass. The location is SLIGHTLY SOFT.
Panel 8 (Bottom-Center): REFLECTION SHOT. The exterior of <<LOCATION_NAME:name!>> is seen ONLY as a reflection in a puddle, car window, or glossy surface.
Panel 9 (Bottom-Right): LONG LENS COMPRESSION. A telephoto shot from very far away, compressing distance. Heat haze or atmospheric perspective makes the location look distant and embedded in surroundings.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Infer exterior architecture from interior reference`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '9:16',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'environments',
    isSystem: true,
    isSystemOnly: false,
  },

  // Story Summary - Full Arc (16:9)
  {
    name: 'Story Summary - Full Arc (16:9)',
    description: '9-panel visual narrative showing complete story from beginning to resolution',
    recipeNote: 'Attach character reference for consistent appearance. Grid tells entire story with NO text bubbles.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 16:9 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

PROTAGONIST: @<<CHARACTER_NAME:name!>>
COMPLETE NARRATIVE: <<FULL_STORY:text!>>

STYLE EXTRACTION: Analyze character reference image to define:
- Protagonist's appearance, clothing, physical features
- Overall visual art style and cinematography
- Color palette and lighting approach

CONSISTENCY REQUIREMENTS:
- @<<CHARACTER_NAME:name!>> must look EXACTLY like the reference image in ALL panels
- Cinematographic style must match reference
- NO TEXT BUBBLES or overlaid words
- Story told purely through VISUAL ACTION, composition, and character emotion

NARRATIVE STRUCTURE: Identify the 9 MOST CRUCIAL PLOT POINTS from <<FULL_STORY:text!>> spanning beginning to resolution.

3×3 GRID LAYOUT - FULL STORY ARC:

ROW 1 - ACT 1: Setup and Inciting Incident
Panel 1 (Top-Left): PLOT POINT 1 - The Status Quo / Beginning. Show @<<CHARACTER_NAME:name!>> in their normal world before change.
Panel 2 (Top-Center): PLOT POINT 2 - The Inciting Incident / Disruption. The event that disrupts the status quo from <<FULL_STORY:text!>>.
Panel 3 (Top-Right): PLOT POINT 3 - Locking into the Journey. @<<CHARACTER_NAME:name!>> commits to the path forward.

ROW 2 - ACT 2: Confrontation and Rising Action
Panel 4 (Middle-Left): PLOT POINT 4 - Rising obstacles/challenges. @<<CHARACTER_NAME:name!>> faces first major challenge from <<FULL_STORY:text!>>.
Panel 5 (Middle-Center): PLOT POINT 5 - The Midpoint Climax / Point of No Return. The turning point where stakes are raised.
Panel 6 (Middle-Right): PLOT POINT 6 - The Lowest Point. @<<CHARACTER_NAME:name!>> faces their darkest moment or setup for final confrontation.

ROW 3 - ACT 3: Resolution
Panel 7 (Bottom-Left): PLOT POINT 7 - The Climax / Final Battle. The peak moment of conflict from <<FULL_STORY:text!>>.
Panel 8 (Bottom-Center): PLOT POINT 8 - The Immediate Aftermath / Falling Action. Immediate consequences of the climax.
Panel 9 (Bottom-Right): PLOT POINT 9 - The New Status Quo / Final Image. @<<CHARACTER_NAME:name!>> in their changed world after the journey.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Sequential reading order: left→right, top→bottom
- NO text, purely visual storytelling`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'narrative',
    isSystem: true,
    isSystemOnly: false,
  },

  // Story Summary - Full Arc (9:16)
  {
    name: 'Story Summary - Full Arc (9:16)',
    description: '9-panel visual narrative showing complete story from beginning to resolution (portrait)',
    recipeNote: 'Attach character reference for consistent appearance. Grid tells entire story with NO text bubbles.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 9:16 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

PROTAGONIST: @<<CHARACTER_NAME:name!>>
COMPLETE NARRATIVE: <<FULL_STORY:text!>>

STYLE EXTRACTION: Analyze character reference image to define:
- Protagonist's appearance, clothing, physical features
- Overall visual art style and cinematography
- Color palette and lighting approach

CONSISTENCY REQUIREMENTS:
- @<<CHARACTER_NAME:name!>> must look EXACTLY like the reference image in ALL panels
- Cinematographic style must match reference
- NO TEXT BUBBLES or overlaid words
- Story told purely through VISUAL ACTION, composition, and character emotion

NARRATIVE STRUCTURE: Identify the 9 MOST CRUCIAL PLOT POINTS from <<FULL_STORY:text!>> spanning beginning to resolution.

3×3 GRID LAYOUT - FULL STORY ARC:

ROW 1 - ACT 1: Setup and Inciting Incident
Panel 1 (Top-Left): PLOT POINT 1 - The Status Quo / Beginning. Show @<<CHARACTER_NAME:name!>> in their normal world before change.
Panel 2 (Top-Center): PLOT POINT 2 - The Inciting Incident / Disruption. The event that disrupts the status quo from <<FULL_STORY:text!>>.
Panel 3 (Top-Right): PLOT POINT 3 - Locking into the Journey. @<<CHARACTER_NAME:name!>> commits to the path forward.

ROW 2 - ACT 2: Confrontation and Rising Action
Panel 4 (Middle-Left): PLOT POINT 4 - Rising obstacles/challenges. @<<CHARACTER_NAME:name!>> faces first major challenge from <<FULL_STORY:text!>>.
Panel 5 (Middle-Center): PLOT POINT 5 - The Midpoint Climax / Point of No Return. The turning point where stakes are raised.
Panel 6 (Middle-Right): PLOT POINT 6 - The Lowest Point. @<<CHARACTER_NAME:name!>> faces their darkest moment or setup for final confrontation.

ROW 3 - ACT 3: Resolution
Panel 7 (Bottom-Left): PLOT POINT 7 - The Climax / Final Battle. The peak moment of conflict from <<FULL_STORY:text!>>.
Panel 8 (Bottom-Center): PLOT POINT 8 - The Immediate Aftermath / Falling Action. Immediate consequences of the climax.
Panel 9 (Bottom-Right): PLOT POINT 9 - The New Status Quo / Final Image. @<<CHARACTER_NAME:name!>> in their changed world after the journey.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Sequential reading order: left→right, top→bottom
- NO text, purely visual storytelling`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '9:16',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'narrative',
    isSystem: true,
    isSystemOnly: false,
  },

  // Story Summary - First Half (16:9)
  {
    name: 'Story Summary - First Half (16:9)',
    description: '9-panel visual narrative showing FIRST HALF of story (up to midpoint)',
    recipeNote: 'Attach character reference for consistent appearance. Grid shows story up to midpoint cliffhanger.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 16:9 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

PROTAGONIST: @<<CHARACTER_NAME:name!>>
COMPLETE NARRATIVE: <<FULL_STORY:text!>>

STYLE EXTRACTION: Analyze character reference image to define:
- Protagonist's appearance, clothing, physical features
- Overall visual art style and cinematography
- Color palette and lighting approach

CONSISTENCY REQUIREMENTS:
- @<<CHARACTER_NAME:name!>> must look EXACTLY like the reference image in ALL panels
- Cinematographic style must match reference
- NO TEXT BUBBLES or overlaid words
- Story told purely through VISUAL ACTION, composition, and character emotion

NARRATIVE STRUCTURE:
- Identify the MIDPOINT of <<FULL_STORY:text!>>
- Select 9 CRUCIAL PLOT POINTS leading UP TO the midpoint
- Panel 9 should be the MIDPOINT CLIMAX/CLIFFHANGER

3×3 GRID LAYOUT - FIRST HALF STORY ARC:

ROW 1 - ACT 1: Setup and Inciting Incident
Panel 1 (Top-Left): PLOT POINT 1 - The Status Quo / Beginning. Show @<<CHARACTER_NAME:name!>> in their normal world before change.
Panel 2 (Top-Center): PLOT POINT 2 - The Inciting Incident / Disruption. The event that disrupts the status quo from <<FULL_STORY:text!>>.
Panel 3 (Top-Right): PLOT POINT 3 - Locking into the Journey. @<<CHARACTER_NAME:name!>> commits to the path forward.

ROW 2 - ACT 2A: Early Confrontation
Panel 4 (Middle-Left): PLOT POINT 4 - First obstacle encountered. @<<CHARACTER_NAME:name!>> begins facing challenges.
Panel 5 (Middle-Center): PLOT POINT 5 - Rising stakes. Complications increase from <<FULL_STORY:text!>>.
Panel 6 (Middle-Right): PLOT POINT 6 - Approaching the midpoint. Tension builds toward the turning point.

ROW 3 - MIDPOINT APPROACH
Panel 7 (Bottom-Left): PLOT POINT 7 - Setup for midpoint. Elements converge toward the pivotal moment.
Panel 8 (Bottom-Center): PLOT POINT 8 - Midpoint trigger. The immediate precursor to the major turning point.
Panel 9 (Bottom-Right): PLOT POINT 9 - THE MIDPOINT CLIMAX. The pivotal moment that changes everything. End on a CLIFFHANGER.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Sequential reading order: left→right, top→bottom
- NO text, purely visual storytelling
- Panel 9 MUST be an exciting cliffhanger moment`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '16:9',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'narrative',
    isSystem: true,
    isSystemOnly: false,
  },

  // Story Summary - First Half (9:16)
  {
    name: 'Story Summary - First Half (9:16)',
    description: '9-panel visual narrative showing FIRST HALF of story (up to midpoint) (portrait)',
    recipeNote: 'Attach character reference for consistent appearance. Grid shows story up to midpoint cliffhanger.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `CRITICAL GRID FORMAT: Create a 3×3 grid (9 panels) in 9:16 aspect ratio.
SEPARATE EACH CELL WITH A SOLID BLACK LINE (4-6 pixels wide).

PROTAGONIST: @<<CHARACTER_NAME:name!>>
COMPLETE NARRATIVE: <<FULL_STORY:text!>>

STYLE EXTRACTION: Analyze character reference image to define:
- Protagonist's appearance, clothing, physical features
- Overall visual art style and cinematography
- Color palette and lighting approach

CONSISTENCY REQUIREMENTS:
- @<<CHARACTER_NAME:name!>> must look EXACTLY like the reference image in ALL panels
- Cinematographic style must match reference
- NO TEXT BUBBLES or overlaid words
- Story told purely through VISUAL ACTION, composition, and character emotion

NARRATIVE STRUCTURE:
- Identify the MIDPOINT of <<FULL_STORY:text!>>
- Select 9 CRUCIAL PLOT POINTS leading UP TO the midpoint
- Panel 9 should be the MIDPOINT CLIMAX/CLIFFHANGER

3×3 GRID LAYOUT - FIRST HALF STORY ARC:

ROW 1 - ACT 1: Setup and Inciting Incident
Panel 1 (Top-Left): PLOT POINT 1 - The Status Quo / Beginning. Show @<<CHARACTER_NAME:name!>> in their normal world before change.
Panel 2 (Top-Center): PLOT POINT 2 - The Inciting Incident / Disruption. The event that disrupts the status quo from <<FULL_STORY:text!>>.
Panel 3 (Top-Right): PLOT POINT 3 - Locking into the Journey. @<<CHARACTER_NAME:name!>> commits to the path forward.

ROW 2 - ACT 2A: Early Confrontation
Panel 4 (Middle-Left): PLOT POINT 4 - First obstacle encountered. @<<CHARACTER_NAME:name!>> begins facing challenges.
Panel 5 (Middle-Center): PLOT POINT 5 - Rising stakes. Complications increase from <<FULL_STORY:text!>>.
Panel 6 (Middle-Right): PLOT POINT 6 - Approaching the midpoint. Tension builds toward the turning point.

ROW 3 - MIDPOINT APPROACH
Panel 7 (Bottom-Left): PLOT POINT 7 - Setup for midpoint. Elements converge toward the pivotal moment.
Panel 8 (Bottom-Center): PLOT POINT 8 - Midpoint trigger. The immediate precursor to the major turning point.
Panel 9 (Bottom-Right): PLOT POINT 9 - THE MIDPOINT CLIMAX. The pivotal moment that changes everything. End on a CLIFFHANGER.

CRITICAL:
- Grid cells separated by SOLID BLACK LINES
- Sequential reading order: left→right, top→bottom
- NO text, purely visual storytelling
- Panel 9 MUST be an exciting cliffhanger moment`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '9:16',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: true,
    categoryId: 'narrative',
    isSystem: true,
    isSystemOnly: false,
  },

  // Storybook Dual Page - Generates 2 pages in 1 image for cost savings
  // This recipe creates a DIPTYCH (side-by-side) image that gets split into two separate pages
  // Cost: 20 points for 2 pages instead of 40 points = 50% savings
  {
    name: 'Storybook Dual Page',
    description: 'Generates two story pages as a single diptych image for 50% cost savings',
    recipeNote: 'Creates a 2:1 aspect ratio image with LEFT and RIGHT panels. The image is then split into two separate pages using the grid-split tool.',
    stages: [
      {
        id: generateStageId(),
        order: 0,
        type: 'generation',
        template: `Create a DIPTYCH illustration for a children's book - TWO SCENES side by side.

CRITICAL: This is ONE image split into LEFT PANEL and RIGHT PANEL with a subtle visual divider.

STORY CONTEXT:

Previous Page (for continuity):
<<PREVIOUS_PAGE_TEXT:text>>

LEFT PANEL (Page <<LEFT_PAGE_NUMBER:name!>>):
Text: "<<LEFT_PAGE_TEXT:text!>>"
Scene: <<LEFT_SCENE_DESCRIPTION:text>>

RIGHT PANEL (Page <<RIGHT_PAGE_NUMBER:name!>>):
Text: "<<RIGHT_PAGE_TEXT:text!>>"
Scene: <<RIGHT_SCENE_DESCRIPTION:text>>

CHARACTERS IN SCENES:
<<CHARACTER_NAMES:text>>

MOOD: <<MOOD:select(Happy,Sad,Excited,Calm,Mysterious,Adventurous)!>>

DIPTYCH REQUIREMENTS:

1. VISUAL SEPARATION:
   - Create a CLEAR visual distinction between left and right panels
   - Use a subtle vertical divider (thin line, shadow, or natural scene break)
   - Each panel should work as a standalone illustration when split

2. NARRATIVE CONTINUITY:
   - Both panels share the same art style, lighting, and color palette
   - Show clear story progression from left to right
   - Characters should be consistent across both panels
   - Visual flow should feel natural when reading left to right

3. COMPOSITION FOR EACH PANEL:
   - Leave appropriate space for text overlay in each panel
   - Each panel has its own focal point
   - Balance illustration with text space

4. STORYTELLING:
   - LEFT PANEL: Set up the moment
   - RIGHT PANEL: Show the result, reaction, or next beat
   - Together they should feel like turning a page

CRITICAL STYLE REQUIREMENTS:
- A STYLE GUIDE reference image is attached - analyze it carefully
- Extract the EXACT art style from the style guide (rendering technique, line work, color palette, shading approach)
- Apply this style CONSISTENTLY to BOTH panels
- Maintain character consistency using attached character sheets (if provided)
- Characters should have EXACT same appearance in both panels

TECHNICAL REQUIREMENTS:
- NO text overlays on image (text will be added separately)
- Age-appropriate for <<TARGET_AGE:text!>> year olds
- Diverse, inclusive representation
- EXACT 2:1 aspect ratio (twice as wide as tall)
- Clean separation point at center for splitting

QUALITY STANDARDS:
- Professional children's book illustration quality
- Both panels should work independently when split
- Vibrant, engaging colors appropriate to the mood
- Fine details that reward close inspection

CRITICAL: Use the attached STYLE GUIDE reference image to determine the exact art style, rendering technique, and visual aesthetic. Match it precisely in BOTH panels.`,
        fields: [],
        referenceImages: [],
      },
    ],
    suggestedAspectRatio: '2:1',
    suggestedModel: 'nano-banana-pro',
    isQuickAccess: false,
    categoryId: 'storybook',
    isSystem: true,
    isSystemOnly: true,
  },
]
