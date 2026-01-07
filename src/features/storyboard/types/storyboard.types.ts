/**
 * Type definitions for Storyboard feature
 */

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

/**
 * Preset Style (built-in styles)
 */
export type PresetStyleId = 'none' | 'claymation' | 'muppet' | 'comic' | 'action-figure'

export interface PresetStyle {
    id: PresetStyleId
    name: string
    description: string
    imagePath: string
    stylePrompt: string
}

export const PRESET_STYLES: PresetStyle[] = [
    {
        id: 'none',
        name: 'None (Realistic)',
        description: 'Real-life, no stylization',
        imagePath: '',
        stylePrompt: ''
    },
    {
        id: 'claymation',
        name: 'Claymation',
        description: 'Stop-motion clay animation style',
        imagePath: '/storyboard-assets/styles/claymation.png',
        stylePrompt: 'in the Claymation style of the reference image'
    },
    {
        id: 'muppet',
        name: 'Muppet',
        description: 'Jim Henson-style puppets',
        imagePath: '/storyboard-assets/styles/muppet.webp',
        stylePrompt: 'in the Muppet style of the reference image'
    },
    {
        id: 'comic',
        name: 'Comic Book',
        description: 'Bold comic book style',
        imagePath: '/storyboard-assets/styles/comic.webp',
        stylePrompt: 'in the Comic Book style of the reference image'
    },
    {
        id: 'action-figure',
        name: 'Action Figure',
        description: 'Realistic action figure photography',
        imagePath: '/storyboard-assets/styles/action-figure.webp',
        stylePrompt: 'in the Action Figure style of the reference image'
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
    model: string  // Image generation model (e.g., 'nano-banana-pro')
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
export interface ExtractionResult {
    characters: Array<{
        name: string
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
    // OpenAI Models (all support tool calling)
    {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        description: 'Fast, cheap, great for most tasks',
        costPer1M: { input: 0.15, output: 0.60 }
    },
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        description: 'Most capable OpenAI model',
        costPer1M: { input: 2.50, output: 10.00 }
    },
    {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        description: 'Previous flagship, reliable',
        costPer1M: { input: 10.00, output: 30.00 }
    },
    // Anthropic Models (all support tool calling)
    {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        description: 'Best balance of speed and capability',
        costPer1M: { input: 3.00, output: 15.00 }
    },
    {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        description: 'Fastest Claude, very cheap',
        costPer1M: { input: 0.25, output: 1.25 }
    },
    {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        description: 'Most capable Claude',
        costPer1M: { input: 15.00, output: 75.00 }
    },
    // Google Models (support tool calling)
    {
        id: 'google/gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        description: '1M context, very fast',
        costPer1M: { input: 0.10, output: 0.40 }
    },
    {
        id: 'google/gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 1000000,
        description: '1M context, most capable Gemini',
        costPer1M: { input: 2.50, output: 10.00 }
    },
    {
        id: 'google/gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        description: '1M context, fast and cheap',
        costPer1M: { input: 0.075, output: 0.30 }
    },
    // Meta Llama Models (support tool calling)
    {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B',
        contextWindow: 128000,
        description: 'Open source, very capable',
        costPer1M: { input: 0.52, output: 0.75 }
    },
    {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B',
        contextWindow: 128000,
        description: 'Open source, fast and cheap',
        costPer1M: { input: 0.055, output: 0.055 }
    },
    // Qwen Models (support tool calling, very affordable)
    {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B',
        contextWindow: 128000,
        description: 'Alibaba flagship, very capable',
        costPer1M: { input: 0.35, output: 0.40 }
    },
    {
        id: 'qwen/qwen-2.5-32b-instruct',
        name: 'Qwen 2.5 32B',
        contextWindow: 128000,
        description: 'Balanced Qwen model',
        costPer1M: { input: 0.20, output: 0.20 }
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
