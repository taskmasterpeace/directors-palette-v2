/**
 * Model Configuration System
 * Defines capabilities and parameters for each AI model in Shot Creator
 */

/**
 * Standard target sizes for image resizing
 * Based on best practices for Replicate API
 */
export const ASPECT_RATIO_SIZES: Record<string, { width: number; height: number }> = {
    // Standard aspect ratio sizes
    '1:1': { width: 1024, height: 1024 },   // Square page ✅
    '4:5': { width: 1024, height: 1280 },   // Portrait page ✅
    '5:4': { width: 1280, height: 1024 },
    '16:9': { width: 1280, height: 720 },
    '9:16': { width: 720, height: 1280 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
    '21:9': { width: 1344, height: 576 },   // For spread blending
    '3:2': { width: 1152, height: 768 },
    '2:3': { width: 768, height: 1152 },
};

export type ModelType = 'generation' | 'editing'
export type ModelId = 'nano-banana-2' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro'

export interface ModelParameter {
    id: string
    label: string
    type: 'select' | 'number' | 'boolean' | 'slider' | 'string'
    options?: { value: string; label: string }[]
    min?: number
    max?: number
    step?: number
    default?: string | number | boolean
    description?: string
}

export interface ModelConfig {
    id: ModelId
    name: string
    displayName: string
    type: ModelType
    icon: string
    description: string
    badge: string
    badgeColor: string
    textColor: string
    endpoint: string
    costPerImage: number
    costByResolution?: Record<string, number> // For tiered pricing (e.g., nano-banana-pro)
    supportedParameters: string[]
    parameters: Record<string, ModelParameter>
    maxReferenceImages?: number
    requiresInputImage?: boolean
    // Riverflow-specific limits
    maxDetailRefs?: number // For logo cleanup refs
    maxFonts?: number
    fontCostPerFile?: number // Cost per font file in dollars
}

export const MODEL_PARAMETERS: Record<string, ModelParameter> = {
    aspectRatio: {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        default: '16:9',
        options: [
            { value: '16:9', label: '16:9 Landscape' },
            { value: '9:16', label: '9:16 Portrait' },
            { value: '1:1', label: '1:1 Square' },
            { value: '4:3', label: '4:3 Classic' },
            { value: '3:4', label: '3:4 Portrait' },
            { value: '21:9', label: '21:9 Ultrawide' },
            { value: '3:2', label: '3:2 Photo' },
            { value: '2:3', label: '2:3 Photo Portrait' },
            { value: 'match_input_image', label: 'Match Input Image' }
        ]
    },
    gen4AspectRatio: {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        default: '16:9',
        options: [
            { value: '16:9', label: '16:9 Landscape' },
            { value: '9:16', label: '9:16 Portrait' },
            { value: '1:1', label: '1:1 Square' },
            { value: '4:3', label: '4:3 Classic' },
            { value: '3:4', label: '3:4 Portrait' },
            { value: '21:9', label: '21:9 Ultrawide' }
        ]
    },
    resolution: {
        id: 'resolution',
        label: 'Resolution',
        type: 'select',
        default: '1080p',
        options: [
            { value: '720p', label: '720p' },
            { value: '1080p', label: '1080p' }
        ]
    },
    seedreamResolution: {
        id: 'resolution',
        label: 'Resolution',
        type: 'select',
        default: '2K',
        options: [
            { value: '2K', label: '2K (2048px) - Default quality' },
            { value: '4K', label: '4K (4096px) - High quality' },
            { value: 'custom', label: 'Custom dimensions' }
        ]
    },
    seedream5Resolution: {
        id: 'resolution',
        label: 'Resolution',
        type: 'select',
        default: '2K',
        options: [
            { value: '2K', label: '2K (2048px) - Default quality' },
            { value: '3K', label: '3K (3072px) - High quality' }
        ]
    },
    seed: {
        id: 'seed',
        label: 'Seed (Optional)',
        type: 'number',
        description: 'Set a seed for reproducible results'
    },
    maxImages: {
        id: 'maxImages',
        label: 'Number of Images',
        type: 'slider',
        min: 1,
        max: 15,
        default: 1,
        description: 'Generate multiple images (1-15)'
    },
    customWidth: {
        id: 'customWidth',
        label: 'Custom Width',
        type: 'number',
        min: 1024,
        max: 4096,
        default: 2048
    },
    customHeight: {
        id: 'customHeight',
        label: 'Custom Height',
        type: 'number',
        min: 1024,
        max: 4096,
        default: 2048
    },
    sequentialGeneration: {
        id: 'sequentialGeneration',
        label: 'Sequential Generation',
        type: 'boolean',
        default: false,
        description: 'Generate related image variations for storytelling'
    },
    outputFormat: {
        id: 'outputFormat',
        label: 'Output Format',
        type: 'select',
        default: 'webp',
        options: [
            { value: 'webp', label: 'WebP (Recommended)' },
            { value: 'jpg', label: 'JPG' },
            { value: 'png', label: 'PNG' }
        ]
    },
    outputQuality: {
        id: 'outputQuality',
        label: 'Output Quality',
        type: 'slider',
        min: 50,
        max: 100,
        default: 95,
        description: 'Image quality (50-100)'
    },
    goFast: {
        id: 'goFast',
        label: 'Fast Mode',
        type: 'boolean',
        default: true,
        description: 'Enable faster processing'
    },
    qwenGuidance: {
        id: 'guidance',
        label: 'Guidance',
        type: 'slider',
        min: 0,
        max: 10,
        default: 4,
        description: 'Image generation guidance (0-10)'
    },
    qwenSteps: {
        id: 'num_inference_steps',
        label: 'Inference Steps',
        type: 'slider',
        min: 20,
        max: 50,
        default: 40,
        description: 'Number of denoising steps (20-50)'
    },
    negativePrompt: {
        id: 'negative_prompt',
        label: 'Negative Prompt',
        type: 'string',
        description: 'Things to avoid in the image'
    },
    nanoBananaProResolution: {
        id: 'resolution',
        label: 'Resolution',
        type: 'select',
        default: '2K',
        options: [
            { value: '1K', label: '1K (1024px)' },
            { value: '2K', label: '2K (2048px) - Recommended' },
            { value: '4K', label: '4K (4096px) - Premium' }
        ],
        description: 'Higher resolution = better quality'
    },
    safetyFilterLevel: {
        id: 'safetyFilterLevel',
        label: 'Safety Filter',
        type: 'select',
        default: 'block_only_high',
        options: [
            { value: 'block_low_and_above', label: 'Strict (Block low & above)' },
            { value: 'block_medium_and_above', label: 'Moderate (Block medium & above)' },
            { value: 'block_only_high', label: 'Minimal (Block only high)' }
        ],
        description: 'Content safety filtering level'
    },
    nanoBanana2AspectRatio: {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        default: '16:9',
        options: [
            { value: '16:9', label: '16:9 Landscape' },
            { value: '9:16', label: '9:16 Portrait' },
            { value: '1:1', label: '1:1 Square' },
            { value: '4:3', label: '4:3 Classic' },
            { value: '3:4', label: '3:4 Portrait' },
            { value: 'match_input_image', label: 'Match Input Image' }
        ]
    },
    nanoBanana2SafetyFilter: {
        id: 'safetyFilterLevel',
        label: 'Safety Filter',
        type: 'select',
        default: 'block_only_high',
        options: [
            { value: 'block_low_and_above', label: 'Strict (Block low & above)' },
            { value: 'block_medium_and_above', label: 'Moderate (Block medium & above)' },
            { value: 'block_only_high', label: 'Minimal (Block only high)' },
            { value: 'block_none', label: 'None (No filter)' }
        ],
        description: 'Content safety filtering level'
    },
    personGeneration: {
        id: 'personGeneration',
        label: 'Person Generation',
        type: 'select',
        default: 'allow_all',
        options: [
            { value: 'dont_allow', label: "Don't Allow" },
            { value: 'allow_adult', label: 'Allow Adult Only' },
            { value: 'allow_all', label: 'Allow All' }
        ],
        description: 'Control person generation in images'
    },
    // Z-Image Turbo parameters (Replicate API: 1-50 steps, 0-20 guidance, defaults per API docs)
    numInferenceSteps: {
        id: 'numInferenceSteps',
        label: 'Inference Steps',
        type: 'slider',
        min: 1,
        max: 50,
        default: 8,
        description: 'Number of denoising steps (1-50). Lower = faster.'
    },
    guidanceScale: {
        id: 'guidanceScale',
        label: 'Guidance Scale',
        type: 'slider',
        min: 0,
        max: 20,
        step: 0.5,
        default: 0,
        description: 'Guidance scale. Use 0 for Turbo models.'
    },
    // GPT Image specific parameters
    gptImageAspectRatio: {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        default: '3:2',
        options: [
            { value: '1:1', label: '1:1 Square' },
            { value: '3:2', label: '3:2 Landscape' },
            { value: '2:3', label: '2:3 Portrait' }
        ]
    },
    gptImageBackground: {
        id: 'background',
        label: 'Background',
        type: 'select',
        default: 'opaque',
        options: [
            { value: 'opaque', label: 'Opaque (Standard)' },
            { value: 'transparent', label: 'Transparent (PNG only)' },
            { value: 'auto', label: 'Auto' }
        ],
        description: 'Transparent backgrounds are only available with PNG format'
    },
    gptImageOutputFormat: {
        id: 'outputFormat',
        label: 'Output Format',
        type: 'select',
        default: 'webp',
        options: [
            { value: 'webp', label: 'WebP (Recommended)' },
            { value: 'png', label: 'PNG (Supports transparency)' },
            { value: 'jpeg', label: 'JPEG' }
        ]
    },
    gptImageNumImages: {
        id: 'numImages',
        label: 'Number of Images',
        type: 'slider',
        min: 1,
        max: 10,
        default: 1,
        description: 'Generate multiple images in one request (1-10). Cost multiplied by count.'
    },
    gptImageInputFidelity: {
        id: 'inputFidelity',
        label: 'Reference Matching',
        type: 'select',
        default: 'low',
        options: [
            { value: 'low', label: 'Low (More creative freedom)' },
            { value: 'high', label: 'High (Match reference closely)' }
        ],
        description: 'How closely the model should match reference image features like faces'
    },
    // Riverflow 2.0 Pro parameters
    riverflowResolution: {
        id: 'resolution',
        label: 'Resolution',
        type: 'select',
        default: '2K',
        options: [
            { value: '1K', label: '1K (1024px) - 27 pts' },
            { value: '2K', label: '2K (2048px) - 27 pts' },
            { value: '4K', label: '4K (4096px) - 60 pts' }
        ],
        description: 'Output resolution - 4K is premium quality'
    },
    riverflowTransparency: {
        id: 'transparency',
        label: 'Transparent Background',
        type: 'boolean',
        default: false,
        description: 'Output PNG with transparent background'
    },
    riverflowEnhancePrompt: {
        id: 'enhancePrompt',
        label: 'AI Prompt Enhancement',
        type: 'boolean',
        default: true,
        description: 'Let AI improve your prompt for better results'
    },
    riverflowMaxIterations: {
        id: 'maxIterations',
        label: 'Reasoning Depth',
        type: 'select',
        default: '3',
        options: [
            { value: '1', label: 'Quick (1 iteration)' },
            { value: '2', label: 'Balanced (2 iterations)' },
            { value: '3', label: 'Thorough (3 iterations)' }
        ],
        description: 'More iterations = better quality but slower'
    },
    riverflowAspectRatio: {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        default: '1:1',
        options: [
            { value: '1:1', label: '1:1 Square' },
            { value: '4:3', label: '4:3 Classic' },
            { value: '3:4', label: '3:4 Portrait' },
            { value: '16:9', label: '16:9 Landscape' },
            { value: '9:16', label: '9:16 Portrait' },
            { value: '3:2', label: '3:2 Photo' },
            { value: '2:3', label: '2:3 Photo Portrait' }
        ]
    }
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
    'nano-banana-2': {
        id: 'nano-banana-2',
        name: 'nano-banana-2',
        displayName: 'Nano Banana 2',
        type: 'generation',
        icon: '🍌',
        description: 'Latest generation model. Fast, high quality. Currently free.',
        badge: 'New',
        badgeColor: 'bg-green-600',
        textColor: 'text-green-300',
        endpoint: 'google/nano-banana-2',
        costPerImage: 0, // Currently free — update when pricing announced
        supportedParameters: ['nanoBanana2AspectRatio', 'nanoBanana2SafetyFilter', 'personGeneration'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.nanoBanana2AspectRatio,
            safetyFilterLevel: MODEL_PARAMETERS.nanoBanana2SafetyFilter,
            personGeneration: MODEL_PARAMETERS.personGeneration
        },
        maxReferenceImages: 1 // nano-banana-2 accepts single `image` input
    },
    'z-image-turbo': {
        id: 'z-image-turbo',
        name: 'z-image-turbo',
        displayName: 'Z-Image Turbo',
        type: 'generation',
        icon: '⚡',
        description: 'Ultra-fast image generation for rapid visualization.',
        badge: 'Turbo',
        badgeColor: 'bg-purple-600',
        textColor: 'text-purple-300',
        endpoint: 'prunaai/z-image-turbo',
        costPerImage: 0.03, // 3 points = 3 cents
        supportedParameters: ['outputFormat', 'aspectRatio', 'numInferenceSteps', 'guidanceScale'],
        parameters: {
            outputFormat: MODEL_PARAMETERS.outputFormat,
            aspectRatio: MODEL_PARAMETERS.aspectRatio,
            numInferenceSteps: MODEL_PARAMETERS.numInferenceSteps,
            guidanceScale: MODEL_PARAMETERS.guidanceScale
        },
        maxReferenceImages: 0 // Text-to-image only - no image input support
    },
    'seedream-5-lite': {
        id: 'seedream-5-lite',
        name: 'seedream-5-lite',
        displayName: 'Seedream 5 Lite',
        type: 'generation',
        icon: '🌿',
        description: 'Deep thinking image generation with reasoning, web search, and editing capabilities.',
        badge: 'New',
        badgeColor: 'bg-green-600',
        textColor: 'text-green-300',
        endpoint: 'bytedance/seedream-5-lite',
        costPerImage: 0.04, // 4 points = 4 cents ($0.035 cost, ~14% margin)
        supportedParameters: ['aspectRatio', 'seedream5Resolution', 'maxImages', 'sequentialGeneration', 'outputFormat'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.aspectRatio,
            resolution: MODEL_PARAMETERS.seedream5Resolution,
            maxImages: MODEL_PARAMETERS.maxImages,
            sequentialGeneration: MODEL_PARAMETERS.sequentialGeneration,
            outputFormat: MODEL_PARAMETERS.outputFormat
        },
        maxReferenceImages: 14
    },
    'riverflow-2-pro': {
        id: 'riverflow-2-pro',
        name: 'riverflow-2-pro',
        displayName: 'Riverflow Pro',
        type: 'generation',
        icon: '🌊',
        description: 'Product photography with brand fonts, logo cleanup, and infographics. Upload custom fonts.',
        badge: 'Fonts',
        badgeColor: 'bg-blue-600',
        textColor: 'text-blue-300',
        endpoint: 'sourceful/riverflow-2.0-pro',
        costPerImage: 0.27, // Default price (1K/2K) - 27 pts = $0.27
        costByResolution: {
            '1K': 0.27,  // 27 pts - Replicate cost $0.135 (100% margin)
            '2K': 0.27,  // 27 pts - Replicate cost $0.135 (100% margin)
            '4K': 0.60,  // 60 pts - Replicate cost $0.297 (~100% margin)
        },
        supportedParameters: ['riverflowAspectRatio', 'riverflowResolution', 'riverflowTransparency', 'riverflowEnhancePrompt', 'riverflowMaxIterations', 'outputFormat'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.riverflowAspectRatio,
            resolution: MODEL_PARAMETERS.riverflowResolution,
            transparency: MODEL_PARAMETERS.riverflowTransparency,
            enhancePrompt: MODEL_PARAMETERS.riverflowEnhancePrompt,
            maxIterations: MODEL_PARAMETERS.riverflowMaxIterations,
            outputFormat: MODEL_PARAMETERS.outputFormat
        },
        maxReferenceImages: 10,  // init_images (product photos)
        maxDetailRefs: 4,        // super_resolution_refs (logo cleanup)
        maxFonts: 2,
        fontCostPerFile: 0.05   // 5 pts per font file
    }
}

export function getModelConfig(modelId: ModelId): ModelConfig {
    return MODEL_CONFIGS[modelId] || MODEL_CONFIGS['nano-banana-2']
}

/**
 * Get the cost for a model, considering resolution for tiered pricing
 * @param modelId - The model ID
 * @param resolution - Optional resolution (e.g., '1K', '2K', '4K')
 * @returns Cost in dollars (e.g., 0.25 for 25 cents)
 */
export function getModelCost(modelId: ModelId, resolution?: string): number {
    const config = getModelConfig(modelId)

    // If model has tiered pricing and resolution is specified, use that
    if (config.costByResolution && resolution && config.costByResolution[resolution]) {
        return config.costByResolution[resolution]
    }

    // Fall back to default cost
    return config.costPerImage
}

export function getModelsByType(type: ModelType): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter(model => model.type === type)
}

export function isParameterSupported(modelId: ModelId, parameterId: string): boolean {
    const config = getModelConfig(modelId)
    return config.supportedParameters.includes(parameterId)
}

export function getAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS)
}