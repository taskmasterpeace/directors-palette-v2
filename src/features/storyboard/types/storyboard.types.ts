/**
 * Type definitions for Storyboard feature
 */

import type { ModelId } from '@/config'

// =============================================================================
// CINEMATOGRAPHY TYPES
// =============================================================================

export type MediumCategory = 'live-action' | '2d-animation' | '3d-animation' | 'stop-motion' | 'puppetry' | 'mixed-media'

export interface CameraSetup {
    shotBracket: 'close' | 'medium' | 'wide'
    cameraBody: string            // "ARRI Alexa Mini"
    lens: string                  // "40mm Cooke S4 anamorphic"
    filmStock?: string            // "Kodak Vision3 500T" (live-action only)
    depthOfField: string          // "shallow", "medium", "deep focus"
    perspectiveTranslation: string // Image-model-safe version
}

export interface DirectorCameraRig {
    setups: CameraSetup[]         // 2-3 setups indexed by shot bracket
    defaultMedium: MediumCategory
}

export interface StyleTechnicalAttributes {
    cameraRenderType: string      // "Super 16mm film camera"
    lensPerspective: string       // "anamorphic Panavision"
    stockMedium: string           // "Kodak Color Reversal"
    colorPalette: string          // "high-contrast saturated"
    texture: string               // "heavy film grain"
    medium: MediumCategory
}

// Status types
export type StoryboardStatus = 'draft' | 'extracting' | 'ready' | 'generating' | 'completed'
export type ShotStatus = 'pending' | 'ready' | 'generating' | 'completed' | 'failed'
export type ContactSheetStatus = 'pending' | 'generating' | 'completed' | 'failed'
export type GenerationQueueStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed'

// Shot breakdown levels
export type BreakdownLevel = 1 | 2 | 3 // 1=comma+period, 2=sentence, 3=two sentences

// Cinematic angles for 3x3 contact sheet
export type CinematicAngle =
    | 'wide_distant'
    | 'wide_full_body'
    | 'wide_medium_long'
    | 'core_waist_up'
    | 'core_chest_up'
    | 'core_tight_face'
    | 'detail_macro'
    | 'detail_low_angle'
    | 'detail_high_angle'

// B-roll shot types for 3x3 grid
export type BRollShotType =
    | 'env_establishing'
    | 'env_foreground'
    | 'env_background'
    | 'detail_object'
    | 'detail_texture'
    | 'detail_action'
    | 'atmo_ambient'
    | 'atmo_symbol'
    | 'atmo_context'

/**
 * B-roll prompt patterns for visual continuity
 * Each includes a description and cinematic hint
 */
export const BROLL_PROMPTS: Record<BRollShotType, { description: string; cinematicHint: string }> = {
    env_establishing: {
        description: 'the complete environment scene with no people, showing the full space where the action takes place',
        cinematicHint: 'extreme wide shot, establishing view'
    },
    env_foreground: {
        description: 'a close detail of a foreground element, something in the near space of the scene',
        cinematicHint: 'close-up, shallow depth of field, foreground emphasis'
    },
    env_background: {
        description: 'a background element with shallow depth of field, showing what lies behind the main action',
        cinematicHint: 'medium shot, background focus, atmospheric depth'
    },
    detail_object: {
        description: 'an extreme close-up of a key object or prop from the scene',
        cinematicHint: 'extreme close-up, object hero shot, studio-like focus'
    },
    detail_texture: {
        description: 'a macro shot of a texture or material surface from the environment',
        cinematicHint: 'macro close-up, tactile detail, surface quality'
    },
    detail_action: {
        description: 'hands or feet in motion, showing a specific action or gesture',
        cinematicHint: 'close-up, action insert, dynamic motion'
    },
    atmo_ambient: {
        description: 'ambient background activity, people or elements moving in the periphery',
        cinematicHint: 'medium-wide shot, background action, environmental life'
    },
    atmo_symbol: {
        description: 'a symbolic element that reflects the emotional tone of the scene',
        cinematicHint: 'close-up, symbolic framing, thematic emphasis'
    },
    atmo_context: {
        description: 'an architectural element framing the space - a doorway, window, or threshold',
        cinematicHint: 'medium shot, architectural framing, spatial context'
    }
}

/**
 * Default B-roll grid configuration
 */
export const DEFAULT_BROLL_CONFIG = {
    grid_layout: '3x3' as const,
    rows: {
        row_1: ['env_establishing', 'env_foreground', 'env_background'] as BRollShotType[],
        row_2: ['detail_object', 'detail_texture', 'detail_action'] as BRollShotType[],
        row_3: ['atmo_ambient', 'atmo_symbol', 'atmo_context'] as BRollShotType[]
    }
}

/**
 * Friendly names for B-roll shot types
 */
export const BROLL_NAMES: Record<BRollShotType, string> = {
    env_establishing: 'Establishing',
    env_foreground: 'Foreground',
    env_background: 'Background',
    detail_object: 'Object Detail',
    detail_texture: 'Texture',
    detail_action: 'Action Insert',
    atmo_ambient: 'Ambient Life',
    atmo_symbol: 'Symbol',
    atmo_context: 'Context Frame'
}

/**
 * Preset Style (built-in styles)
 */
export type PresetStyleId = 'none' | 'claymation' | 'muppet' | 'comic' | 'action-figure' | 'black-dynamite' | 'blade-runner' | 'mr-robot' | 'toy-story' | 'gi-joe'

export interface PresetStyle {
    id: PresetStyleId
    name: string
    description: string
    imagePath: string
    stylePrompt: string
    technicalAttributes?: StyleTechnicalAttributes
}

export const PRESET_STYLES: PresetStyle[] = [
    {
        id: 'none',
        name: 'None (Realistic)',
        description: 'Real-life, no stylization',
        imagePath: '',
        stylePrompt: '',
        technicalAttributes: {
            cameraRenderType: 'Digital cinema camera',
            lensPerspective: 'Standard prime lens',
            stockMedium: 'Digital RAW',
            colorPalette: 'Natural balanced color',
            texture: 'Clean digital',
            medium: 'live-action'
        }
    },
    {
        id: 'claymation',
        name: 'Claymation',
        description: 'Stop-motion clay animation style',
        imagePath: '/storyboard-assets/styles/claymation.png',
        stylePrompt: 'in the Claymation style of the reference image',
        technicalAttributes: {
            cameraRenderType: 'Stop-motion animation camera',
            lensPerspective: 'Macro lens, shallow focus',
            stockMedium: 'Clay sculpture on miniature set',
            colorPalette: 'Warm earthy tones',
            texture: 'Visible fingerprints, imperfect clay surfaces',
            medium: 'stop-motion'
        }
    },
    {
        id: 'muppet',
        name: 'Puppet Theater',
        description: 'Handcrafted felt puppets on practical miniature sets',
        imagePath: '/storyboard-assets/styles/muppet.webp',
        stylePrompt: 'handcrafted felt and foam puppet characters on a practical miniature set, physical puppetry photography with warm studio lighting, characters built from soft colorful felt fabric with visible stitching and seam lines and button eyes or simple glossy bead eyes, expressive open-mouth puppet faces with hinged jaws and arched felt eyebrows conveying emotion, bodies made of stuffed foam wrapped in dyed felt with simple mitten-like hands and no individual fingers, warm tungsten stage lighting with soft fill and gentle shadows on a detailed miniature practical set built from real wood and fabric and miniature props, shallow depth of field with the puppet sharp and background softly blurred, rich saturated color palette with warm amber tones and cozy theatrical atmosphere, every surface has tactile handmade texture you can almost feel, the scene looks like a real photograph of a physical puppet on a miniature stage set, NOT a cartoon NOT an illustration NOT animated NOT CGI NOT a drawing, do NOT depict real human people or realistic human skin or human faces, all characters must be clearly recognizable as physical hand-built fabric puppets, do NOT reference or depict any copyrighted puppet characters',
        technicalAttributes: {
            cameraRenderType: 'Studio photography camera on practical puppet stage',
            lensPerspective: 'Wide angle low camera position at puppet eye-level, shallow depth of field, warm soft fill lighting',
            stockMedium: 'Felt and foam puppet on practical miniature set, real wood and fabric props, tangible handmade surfaces',
            colorPalette: 'Warm saturated primaries, amber tungsten glow, cozy theatrical tones, rich dyed felt colors',
            texture: 'Soft felt fabric with visible stitching and seams, stuffed foam bodies, button and bead eyes, miniature handcrafted set details',
            medium: 'puppetry'
        }
    },
    {
        id: 'comic',
        name: 'Comic Book',
        description: 'Bold comic book style',
        imagePath: '/storyboard-assets/styles/comic.webp',
        stylePrompt: 'in the Comic Book style of the reference image',
        technicalAttributes: {
            cameraRenderType: 'Flat illustration rendering',
            lensPerspective: 'Dynamic foreshortened perspective',
            stockMedium: 'Ink and digital color on paper',
            colorPalette: 'Bold saturated primaries, halftone dots',
            texture: 'Heavy ink outlines, Ben-Day dot shading',
            medium: '2d-animation'
        }
    },
    {
        id: 'action-figure',
        name: 'Action Figure',
        description: 'Realistic action figure photography',
        imagePath: '/storyboard-assets/styles/action-figure.webp',
        stylePrompt: 'in the Action Figure style of the reference image',
        technicalAttributes: {
            cameraRenderType: 'Macro photography camera',
            lensPerspective: 'Macro lens, forced perspective',
            stockMedium: 'Plastic action figure on diorama',
            colorPalette: 'Glossy plastic, studio lit',
            texture: 'Smooth plastic joints, miniature scale',
            medium: 'stop-motion'
        }
    },
    // ---- NEW FILM PRESETS ----
    {
        id: 'black-dynamite',
        name: 'Street Fury',
        description: '70s exploitation cinema with raw gritty energy and retro grain',
        imagePath: '/storyboard-assets/styles/black-dynamite.webp',
        stylePrompt: '1970s exploitation cinema still photograph aesthetic, Super 16mm Color Reversal film stock with heavy visible grain structure and high contrast saturated color, low-angle heroic composition shooting upward making protagonists appear larger than life and dominant in the frame, amber and brown warm color grading with oversaturated reds and golds bleeding at highlight edges, practical location lighting using harsh available sunlight and bare interior tungsten bulbs with no diffusion creating hard unflattering shadows, urban street compositions framing subjects against concrete walls and hand-painted signage and neon, high-contrast silhouettes in doorways and alleys with strong hard backlight rimming figures, soft focus and slight halation around bright highlights from uncoated vintage lens elements, shallow depth of field with nervous bokeh from fast vintage primes wide open, visible film grain texture with color noise especially in shadow areas, slightly faded and yellowed color shift as if aged film stock, subjects framed tight against gritty textured environments like peeling paint brick walls and linoleum floors, double exposure and kaleidoscopic superimposition layering for stylized compositions',
        technicalAttributes: {
            cameraRenderType: 'Super 16mm film camera',
            lensPerspective: 'Low-angle heroic looking upward, tight framing against gritty environments, uncoated vintage lens with halation',
            stockMedium: 'Kodak Color Reversal Super 16mm, heavy grain, high contrast, slight age yellowing',
            colorPalette: 'Oversaturated amber and brown warmth, hot reds and golds bleeding at highlights, faded aged color shift',
            texture: 'Heavy film grain with color noise in shadows, soft halation around highlights, vintage uncoated lens character',
            medium: 'live-action'
        }
    },
    {
        id: 'blade-runner',
        name: 'Neon Noir',
        description: 'Rain-soaked dystopian noir with atmospheric haze and neon reflections',
        imagePath: '/storyboard-assets/styles/blade-runner.webp',
        stylePrompt: 'neon-noir dystopian still photograph, frame bathed in darkness with bold theatrical color choices contrasting sterile cool blue interiors against warm amber-cast exteriors, xenon spotlight shafts cutting through dense atmospheric smoke and haze creating visible volumetric light beams in the air, venetian blind shadow patterns fragmenting illumination across walls and faces in sharp parallel lines, horizontal anamorphic lens flare streaks from bright practicals in frame, rain-soaked streets and surfaces creating mirror-like reflective neon pools of teal and amber on wet pavement, warm soft uplight illuminating foreground subjects from below combined with hard backlight and layered smoke in the background, deep shadow with faces half-lit by practical light sources and neon signage spilling colored light, push-processed film stock with elevated grain structure and crushed deep blacks, silhouetted figures backlit against rain-streaked window glass, glowing bright eye-level catch lights in close-ups creating an unsettling almost supernatural quality, oppressive urban density with layered architectural depth receding into smoky atmospheric haze, wet reflective surfaces everywhere doubling every light source in the composition',
        technicalAttributes: {
            cameraRenderType: 'Panavision Panaflex with anamorphic lenses',
            lensPerspective: 'Anamorphic with horizontal flare streaks, layered depth receding into haze, faces half-lit by practicals',
            stockMedium: 'Eastman 5293 push-processed, elevated grain, crushed deep blacks',
            colorPalette: 'Sterile cool blue interiors vs warm amber exteriors, neon teal and amber reflected on wet surfaces, bold theatrical color, deep shadow',
            texture: 'Dense atmospheric smoke and haze, rain-soaked mirror-like reflective surfaces, venetian blind light patterns, volumetric xenon light shafts',
            medium: 'live-action'
        }
    },
    {
        id: 'mr-robot',
        name: 'Digital Paranoia',
        description: 'Oppressive off-center framing, cold clinical precision, surveillance aesthetic',
        imagePath: '/storyboard-assets/styles/mr-robot.webp',
        stylePrompt: 'cinematic digital paranoia aesthetic, characters pushed to extreme edges or bottom of the frame leaving large oppressive empty spaces above or beside them to suggest emotional smallness, shortsighted framing that places subjects on the near edge breaking classical leading-room rules creating tense disorienting conversations, wide lenses used close to faces with slight distortion emphasizing large expressive eyes drawing viewers into an interior subjective world, shallow depth of field isolating subjects from surroundings so backgrounds fall out of focus and figures appear to float in space, under-lit high-contrast lighting with strong practicals like lamps windows and screens creating pools of light in otherwise shadowy environments, silhouettes and backlit figures obscuring faces reinforcing secrecy and mistrust, cool desaturated color palette with fluorescent green tint for corporate and urban spaces deepening technological and emotional coldness, clinical digital precision, balanced centered framing reserved only for moments of relative stability or introspection as a deliberate contrast to the dominant off-center compositions',
        technicalAttributes: {
            cameraRenderType: 'ARRI Alexa Mini',
            lensPerspective: 'Wide angle close to face with slight distortion, extreme off-center shortsighted framing, shallow depth of field isolating subjects',
            stockMedium: 'Digital ProRes 4444',
            colorPalette: 'Cool desaturated tones, fluorescent green tint, high-contrast pools of light in shadow, silhouetted backlit figures',
            texture: 'Clean clinical digital, under-lit environments, strong practicals casting isolated light pools',
            medium: 'live-action'
        }
    },
    {
        id: 'toy-story',
        name: 'Plastic World',
        description: 'Saturated 3D animation with toy-scale perspective and glossy plastic surfaces',
        imagePath: '/storyboard-assets/styles/toy-story.webp',
        stylePrompt: 'premium 3D animated render, low-angle perspective shot from toy-scale height looking upward at an oversized world making everyday objects appear monumental, smooth glossy plastic surface rendering with specular highlights and visible seam lines and ball-joint articulation on characters, bright saturated primary color palette with slightly caricatured proportions and tangible realistic surface textures, soft ambient occlusion darkening corners and crevices where surfaces meet grounding objects in their environment, global illumination with radiosity causing colored light to bounce between nearby brightly colored surfaces tinting adjacent areas, subsurface scattering on translucent and skin-like materials creating warm inner glow where light passes through thin edges, contact shadows soft and precise beneath every object sitting on a surface, subtle barrel distortion from a wide-angle virtual lens, shallow depth of field with creamy circular bokeh softly dissolving the background, warm interior lighting with soft diffused window light and colorful bounce fill from surrounding toys and objects, clean anti-aliased edges with no jaggies, smooth phong and blinn specular reflections on plastic and metallic toy surfaces, slight environmental reflection on glossy materials showing the surrounding room, rim light separating characters from backgrounds with a thin bright edge outline',
        technicalAttributes: {
            cameraRenderType: 'Virtual 3D render camera',
            lensPerspective: 'Wide-angle with subtle barrel distortion, low toy-scale angle looking upward, shallow DOF with circular bokeh',
            stockMedium: '3D render with global illumination, radiosity, subsurface scattering, ambient occlusion',
            colorPalette: 'Bright saturated primaries, colored radiosity bounce between surfaces, warm interior fill light',
            texture: 'Glossy smooth plastic with specular highlights and visible seams, soft ambient occlusion in crevices, subsurface glow on translucent materials, environmental reflections on glossy surfaces',
            medium: '3d-animation'
        }
    },
    {
        id: 'gi-joe',
        name: 'GI Joe',
        description: '80s hand-drawn cel animation style',
        imagePath: '/storyboard-assets/styles/gi-joe.webp',
        stylePrompt: 'in the style of 1980s hand-drawn cel animation, bold flat colors, clean ink outlines, limited shading, action line framing, vintage cartoon aesthetic',
        technicalAttributes: {
            cameraRenderType: 'Hand-drawn cel animation',
            lensPerspective: 'Flat perspective, action line framing',
            stockMedium: 'Ink and paint on acetate cel',
            colorPalette: 'Bold flat primaries, hard shadows',
            texture: 'Clean outlines, limited shading',
            medium: '2d-animation'
        }
    }
]

/**
 * LLM Settings (per user)
 */
export interface LLMSettings {
    id: string
    user_id: string
    provider: string
    model: string
    api_key?: string
    created_at: string
    updated_at: string
}

export interface CreateLLMSettingsInput {
    provider?: string
    model?: string
    api_key?: string
}

export interface UpdateLLMSettingsInput {
    provider?: string
    model?: string
    api_key?: string
}

/**
 * Style Guide
 */
export interface StyleGuide {
    id: string
    user_id: string
    name: string
    description?: string
    reference_gallery_id?: string
    reference_image_url?: string // Populated from join
    style_prompt?: string
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface CreateStyleGuideInput {
    name: string
    description?: string
    reference_gallery_id?: string
    style_prompt?: string
}

export interface UpdateStyleGuideInput {
    name?: string
    description?: string
    reference_gallery_id?: string
    style_prompt?: string
}

/**
 * Storyboard (main project)
 */
export interface StoryboardMetadata {
    extraction_model?: string
    total_shots?: number
    generation_settings?: {
        model: string
        aspectRatio?: string
        resolution?: string
    }
}

export interface Storyboard {
    id: string
    user_id: string
    title: string
    story_text: string
    style_guide_id?: string
    style_guide?: StyleGuide // Populated from join
    director_id?: string
    status: StoryboardStatus
    breakdown_level: BreakdownLevel
    metadata: StoryboardMetadata
    created_at: string
    updated_at: string
}

export interface CreateStoryboardInput {
    title: string
    story_text: string
    style_guide_id?: string
    breakdown_level?: BreakdownLevel
    metadata?: Partial<StoryboardMetadata>
}

export interface UpdateStoryboardInput {
    title?: string
    story_text?: string
    style_guide_id?: string
    status?: StoryboardStatus
    breakdown_level?: BreakdownLevel
    metadata?: Partial<StoryboardMetadata>
}

/**
 * Storyboard Character (auto-extracted)
 */
export interface StoryboardCharacter {
    id: string
    storyboard_id: string
    name: string
    role?: CharacterRole
    mentions: number
    has_reference: boolean
    reference_gallery_id?: string
    reference_image_url?: string // Populated from join
    description?: string
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface CreateCharacterInput {
    storyboard_id: string
    name: string
    mentions?: number
    has_reference?: boolean
    reference_gallery_id?: string
    description?: string
}

export interface UpdateCharacterInput {
    name?: string
    mentions?: number
    has_reference?: boolean
    reference_gallery_id?: string
    description?: string
}

/**
 * Storyboard Location
 */
export interface StoryboardLocation {
    id: string
    storyboard_id: string
    name: string
    tag: string
    mentions: number
    has_reference: boolean
    reference_gallery_id?: string
    reference_image_url?: string // Populated from join
    description?: string
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface CreateLocationInput {
    storyboard_id: string
    name: string
    tag: string
    mentions?: number
    has_reference?: boolean
    reference_gallery_id?: string
    description?: string
}

export interface UpdateLocationInput {
    name?: string
    tag?: string
    mentions?: number
    has_reference?: boolean
    reference_gallery_id?: string
    description?: string
}

/**
 * Storyboard Shot
 */
export interface ShotMetadata {
    edited?: boolean
    ai_generated?: boolean
    error?: string
    generated_at?: string
    rating?: number
    isGreenlit?: boolean
}

export interface StoryboardShot {
    id: string
    storyboard_id: string
    sequence_number: number
    original_text: string
    prompt: string
    character_names: string[]
    location_name?: string
    gallery_id?: string
    generated_image_url?: string // Populated from join
    status: ShotStatus
    start_index?: number
    end_index?: number
    color?: string
    metadata: ShotMetadata
    created_at: string
    updated_at: string
    contact_sheet_variants?: ContactSheetVariant[]

    // Director Integration
    director_id?: string
    rating?: number // 0-5
    is_greenlit?: boolean
}

export interface CreateShotInput {
    storyboard_id: string
    sequence_number: number
    original_text: string
    prompt: string
    character_names?: string[]
    location_name?: string
    start_index?: number
    end_index?: number
    color?: string
}

export interface UpdateShotInput {
    sequence_number?: number
    original_text?: string
    prompt?: string
    character_names?: string[]
    location_name?: string
    gallery_id?: string
    status?: ShotStatus
    start_index?: number
    end_index?: number
    color?: string
    metadata?: Partial<ShotMetadata>
}

/**
 * Contact Sheet Variant (3x3 grid)
 */
export interface ContactSheetVariant {
    id: string
    storyboard_shot_id: string
    position: number // 1-9
    angle_type: CinematicAngle
    prompt: string
    gallery_id?: string
    generated_image_url?: string // Populated from join
    status: ContactSheetStatus
    created_at: string
}

export interface CreateContactSheetVariantInput {
    storyboard_shot_id: string
    position: number
    angle_type: CinematicAngle
    prompt: string
}

/**
 * B-Roll Shot
 */
export interface BRollShot {
    id: string
    storyboard_id: string
    context_text?: string
    prompt: string
    gallery_id?: string
    generated_image_url?: string // Populated from join
    status: ShotStatus
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
}

export interface CreateBRollInput {
    storyboard_id: string
    context_text?: string
    prompt: string
}

export interface UpdateBRollInput {
    context_text?: string
    prompt?: string
    gallery_id?: string
    status?: ShotStatus
}

/**
 * Storyboard Generation Queue
 */
export interface StoryboardGenerationQueue {
    id: string
    user_id: string
    storyboard_id: string
    shot_ids: string[]
    status: GenerationQueueStatus
    progress: number // 0-100
    current_shot_index: number
    error_message?: string
    created_at: string
    updated_at: string
}

export interface CreateGenerationQueueInput {
    storyboard_id: string
    shot_ids: string[]
}

export interface QueueProgressUpdate {
    status: GenerationQueueStatus
    progress: number
    current_shot_index: number
    error_message?: string
}

/**
 * Shot breakdown result from slider
 */
export interface ShotBreakdownSegment {
    sequence: number
    text: string
    start_index: number
    end_index: number
    color: string
}

export interface ShotBreakdownResult {
    segments: ShotBreakdownSegment[]
    total_count: number
    level: BreakdownLevel
}

/**
 * Shot type for cinematic prompts
 */
export type ShotType = 'establishing' | 'wide' | 'medium' | 'close-up' | 'detail' | 'unknown'

/**
 * Generated shot prompt (AI-transformed from story segment)
 */
export interface GeneratedShotPrompt {
    sequence: number
    originalText: string           // The story segment that drove this shot
    prompt: string                 // AI-generated cinematic prompt
    shotType: ShotType             // Type of shot (establishing, wide, medium, close-up, detail)
    characterRefs: StoryboardCharacter[]  // Characters with refs mentioned in this shot
    locationRef?: StoryboardLocation      // Location if mentioned
    edited: boolean                // User modified the prompt
    imageUrl?: string              // Generated image URL (preview)
    metadata?: {
        originalPromptWithWildcards?: string    // Original prompt before wildcard expansion
        appliedWildcards?: Record<string, string>  // Which wildcards were applied and their values
        directorId?: string
        rating?: number
        isGreenlit?: boolean
        layoutData?: Record<string, unknown> // Fabric.js canvas data
    }
}

/**
 * Documentary Mode — Segment classification
 */
export type SegmentClassification = 'action' | 'narration' | 'transition'

/**
 * Enhanced segment with documentary classification
 */
export interface ClassifiedSegment extends ShotBreakdownSegment {
    classification: SegmentClassification
    brollCategoryId?: string  // Linked B-roll pool category for narration segments
}

/**
 * B-Roll pool prompt variant
 */
export interface BRollPoolPrompt {
    id: string
    prompt: string           // Full cinematic prompt ready for image generation
    imageUrl?: string        // Generated image URL
    status: 'pending' | 'generating' | 'completed' | 'failed'
    selected: boolean        // Active variant for display in timeline
}

/**
 * Themed B-Roll pool category (e.g., "Ohio Winter Atmosphere")
 */
export interface BRollPoolCategory {
    id: string
    theme: string            // Human-readable theme name
    chapterIndex: number
    prompts: BRollPoolPrompt[]       // 4 prompt variants
    assignedSegments: number[]       // Segment sequence numbers this covers
}

/**
 * Chapter title card
 */
export interface TitleCard {
    chapterIndex: number
    chapterName: string      // "Four Doors in the Snow"
    prompt: string           // Full image generation prompt
    imageUrl?: string
    status: 'pending' | 'generating' | 'completed' | 'failed'
}

/**
 * Documentary chapter (enhanced from StoryChapter)
 */
export interface DocumentaryChapter {
    index: number
    name: string             // LLM-generated cinematic arc name
    nameEdited: boolean      // User renamed?
    startIndex: number       // Text position start
    endIndex: number         // Text position end
    titleCard: TitleCard
    brollPool: BRollPoolCategory[]
    segments: ClassifiedSegment[]
}

/**
 * Style guide reference for metadata
 */
export interface StyleGuideRef {
    id: string
    name: string
    isPreset: boolean
    presetId?: string  // Can be PresetStyleId or custom style ID
}

/**
 * Generation configuration for metadata
 */
export interface GenerationConfig {
    aspectRatio: string
    resolution: '1K' | '2K' | '4K'
    model: ModelId
}

/**
 * Enhanced metadata for generated images
 */
export interface GeneratedImageData {
    // Generation tracking
    predictionId: string
    imageUrl?: string
    status: 'pending' | 'generating' | 'completed' | 'failed'
    error?: string

    // Chapter context
    chapterIndex?: number
    chapterTitle?: string

    // Prompt context
    originalPrompt?: string
    finalPrompt?: string
    appliedWildcards?: Record<string, string>

    // Generation configuration
    styleGuideUsed?: StyleGuideRef
    generationConfig?: GenerationConfig

    // Timestamps
    generationTimestamp?: string
    generationDurationMs?: number

    // Animation/video fields
    videoUrl?: string
    videoStatus?: 'idle' | 'generating' | 'completed' | 'failed'
    videoPredictionId?: string
    videoError?: string
    animationPrompt?: string
}

/**
 * Text highlight for shot preview
 */
export interface TextHighlight {
    start: number
    end: number
    color: string
    shot_number: number
}

/**
 * Extraction result from OpenRouter
 */
export type CharacterRole = 'main' | 'supporting' | 'background'

export interface ExtractionResult {
    characters: Array<{
        name: string
        aliases?: string[]
        role: CharacterRole
        mentions: number
        description?: string
    }>
    locations: Array<{
        name: string
        tag: string
        mentions: number
        description?: string
    }>
}

/**
 * 3x3 Contact Sheet Configuration
 */
export interface ContactSheetConfig {
    grid_layout: '3x3'
    rows: {
        row_1: CinematicAngle[] // Wide shots
        row_2: CinematicAngle[] // Core shots
        row_3: CinematicAngle[] // Detail shots
    }
}

/**
 * Angle descriptions for prompt enhancement
 */
export const ANGLE_PROMPTS: Record<CinematicAngle, string> = {
    wide_distant: 'extreme wide shot, distant view, establishing shot',
    wide_full_body: 'wide shot, full body visible, environmental context',
    wide_medium_long: 'medium-long shot, knee-up framing',
    core_waist_up: 'medium shot, waist-up framing, conversational',
    core_chest_up: 'medium close-up, chest-up, intimate',
    core_tight_face: 'close-up, face filling frame, emotional',
    detail_macro: 'extreme close-up, macro detail shot',
    detail_low_angle: 'low angle shot, looking up, heroic perspective',
    detail_high_angle: 'high angle shot, looking down, vulnerable perspective'
}

/**
 * Default contact sheet configuration
 */
export const DEFAULT_CONTACT_SHEET_CONFIG: ContactSheetConfig = {
    grid_layout: '3x3',
    rows: {
        row_1: ['wide_distant', 'wide_full_body', 'wide_medium_long'],
        row_2: ['core_waist_up', 'core_chest_up', 'core_tight_face'],
        row_3: ['detail_macro', 'detail_low_angle', 'detail_high_angle']
    }
}

/**
 * OpenRouter model options
 * Only models with TOOL CALLING support (for structured outputs)
 */
export interface OpenRouterModel {
    id: string
    name: string
    contextWindow: number
    description?: string
    costPer1M?: { input: number; output: number }
}

export const DEFAULT_OPENROUTER_MODELS: OpenRouterModel[] = [
    // OpenAI Models
    {
        id: 'openai/gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        contextWindow: 1047576,
        description: 'Fast, cheap, great for most tasks',
        costPer1M: { input: 0.40, output: 1.60 }
    },
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        description: 'Most capable OpenAI model',
        costPer1M: { input: 2.50, output: 10.00 }
    },
    // Anthropic Models
    {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        description: 'Best balance of speed and capability',
        costPer1M: { input: 3.00, output: 15.00 }
    },
    {
        id: 'anthropic/claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        description: 'Fastest Claude, very cheap',
        costPer1M: { input: 0.80, output: 4.00 }
    },
    {
        id: 'anthropic/claude-opus-4',
        name: 'Claude Opus 4',
        contextWindow: 200000,
        description: 'Most capable Claude',
        costPer1M: { input: 15.00, output: 75.00 }
    },
    // Google Models
    {
        id: 'google/gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        description: '1M context, very fast',
        costPer1M: { input: 0.10, output: 0.40 }
    },
    {
        id: 'google/gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        contextWindow: 1000000,
        description: '1M context, most capable Gemini',
        costPer1M: { input: 1.25, output: 10.00 }
    },
    {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1000000,
        description: '1M context, fast and cheap',
        costPer1M: { input: 0.15, output: 0.60 }
    },
    // Meta Llama Models
    {
        id: 'meta-llama/llama-4-maverick',
        name: 'Llama 4 Maverick',
        contextWindow: 128000,
        description: 'Open source, very capable',
        costPer1M: { input: 0.50, output: 0.70 }
    },
    {
        id: 'meta-llama/llama-4-scout',
        name: 'Llama 4 Scout',
        contextWindow: 128000,
        description: 'Open source, fast and cheap',
        costPer1M: { input: 0.15, output: 0.15 }
    },
    // Qwen Models
    {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        contextWindow: 128000,
        description: 'Alibaba flagship, very capable',
        costPer1M: { input: 0.35, output: 0.40 }
    }
]

/**
 * Director Pitch for approval workflow
 */
export interface DirectorPitch {
    id?: string
    directorId?: string
    directorName: string
    visualStyle?: string
    colorPalette?: string[]
    pacing?: string
    exampleEnhancement?: {
        original: string
        enhanced: string
    }
    // Dialog-specific fields
    logline?: string
    visualStrategy?: string
    thematicFocus?: string
    note?: string
    style?: string
}
