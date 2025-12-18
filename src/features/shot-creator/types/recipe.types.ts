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
  name: string                  // Display name
  aspectRatio?: string          // Detected aspect ratio
}

// A single stage in a multi-pipe recipe
export interface RecipeStage {
  id: string
  order: number                 // Stage order (0, 1, 2...)
  template: string              // The prompt template for this stage
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
  quickAccessLabel?: string     // 1-word label for quick access bar
  isQuickAccess: boolean        // Whether it's in quick access
  categoryId?: string           // Optional category
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
}

// Default recipe categories
export const DEFAULT_RECIPE_CATEGORIES: RecipeCategory[] = [
  { id: 'characters', name: 'Characters', icon: '👤', isDefault: true },
  { id: 'scenes', name: 'Scenes', icon: '🎬', isDefault: true },
  { id: 'styles', name: 'Style Transfers', icon: '🎨', isDefault: true },
  { id: 'products', name: 'Products', icon: '📦', isDefault: true },
  { id: 'custom', name: 'Custom', icon: '✨', isDefault: true },
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
        if (id.includes(field.name.toLowerCase()) && val) {
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
 * Build all stage prompts from a recipe
 * Uses deduplicated fields so same field name = same value across stages
 */
export function buildRecipePrompts(
  stages: RecipeStage[],
  values: RecipeFieldValues
): string[] {
  const uniqueFields = getAllFields(stages)
  return stages.map(stage => buildStagePrompt(stage.template, stage.fields, values, uniqueFields))
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
 * Sample recipes for initial setup
 */
export const SAMPLE_RECIPES: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Style Guide Grid - 6 tile visual style guide
  {
    name: 'Style Guide Grid',
    description: 'Create a 2x3 visual style guide with 6 example tiles',
    recipeNote: 'Attach a style reference image. The model will generate 6 tiles demonstrating the style across different subjects and scenarios.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `Create a visual style guide as a 6-image grid (2 rows × 3 columns) titled "<<STYLE_NAME:text!>> – Style Guide".

The guide must generate its own characters and should not rely on any user-provided characters.

GLOBAL STYLE RULES:
- Match the reference image's color palette, contrast, saturation
- Maintain identical rendering style across all 6 tiles (painterly, illustrative, photoreal, 3D, claymation, etc.)
- Match line quality, edge sharpness/softness, and detail level
- Match lighting style, time of day, shadow softness, and mood
- Match depth of field, framing, focal length feel, and sense of motion
- All images must evoke the same mood and genre

THE 6 TILES:
1. Character Close-Up: Dramatic close-up portrait showing skin texture, emotion, and style rendering
2. Action Scene: Dynamic action moment with consistent camera language and color palette
3. Environment Detail: Richly detailed environment element showing materials, lighting, atmosphere
4. Multi-Character Interaction: Two characters (one Black man, one White man) interacting naturally, demonstrating consistent skin tone rendering
5. Dynamic Pose: Full-body action-oriented pose showing anatomy and silhouette in this style
6. Set/Location Design: Wide location shot showcasing worldbuilding and atmosphere

No labels, text overlays, or captions in the final image. Only clean cinematic imagery arranged in a 2×3 grid.`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '3:2',
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
      referenceImages: [],
    }],
    suggestedAspectRatio: '21:9',
    isQuickAccess: true,
    quickAccessLabel: 'CharSheet',
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

  // Story to 9 Frames
  {
    name: 'Story to 9 Frames',
    description: 'Analyze a story and create 9 key frames featuring your character',
    recipeNote: 'Attach a character reference sheet. Enter the story text and character name. The model will create 9 key moments.',
    stages: [{
      id: 'stage_0',
      order: 0,
      template: `CHARACTER: <<CHARACTER_NAME:name!>>
Follow the provided character sheet for consistent character appearance.

STORY:
<<STORY:text!>>

TASK:
Analyze this story and identify 9 key visual moments that tell the narrative arc.

Create a 3x3 cinematic storyboard grid with these 9 frames:
- Each frame captures a pivotal moment from the story
- Maintain perfect character consistency across all frames (same face, body, clothing unless story indicates change)
- Vary camera angles and shot types to create visual interest
- Use lighting and color to reflect the emotional tone of each moment
- Ensure clear visual storytelling - each frame should be understandable

ROW 1: Setup and introduction (frames 1-3)
ROW 2: Rising action and conflict (frames 4-6)
ROW 3: Climax and resolution (frames 7-9)

No text, labels, or captions in the frames. Clean cinematic imagery only.<<STYLE:select(,Render in claymation style,Render in anime style,Render in watercolor style,Render in oil painting style,Render in 3D animated style,Render in graphic novel style)>>`,
      fields: [],
      referenceImages: [],
    }],
    suggestedAspectRatio: '1:1',
    isQuickAccess: true,
    quickAccessLabel: 'StoryFrames',
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
        template: `Transform the character from the previous image into <<ART_STYLE:select(claymation,watercolor,cartoon,anime,3D animated,illustrated,storybook,Disney-style,Pixar-style)!>> style.

CRITICAL - ABSOLUTE LIKENESS PRESERVATION:
Even in stylized form, the character MUST be recognizable as the same person:
- Maintain exact facial proportions and structure
- Keep distinctive features (nose shape, eye spacing, jawline)
- Preserve exact skin tone relationships
- Keep exact hair style, texture, and color
- Maintain body proportions and posture

STYLE TRANSFER (use attached style guide):
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
      referenceImages: [],
    }],
    suggestedAspectRatio: '16:9',
    isQuickAccess: true,
    quickAccessLabel: 'Wardrobe',
    categoryId: 'characters',
  },
]
