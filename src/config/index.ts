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
export type ModelId = 'nano-banana-2' | 'flux-2-klein-9b' | 'firered-image-edit' | 'qwen-image-edit'

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
    estimatedSeconds?: number // Estimated generation time in seconds (shown as countdown timer)
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
    maxImages: {
        id: 'maxImages',
        label: 'Number of Images',
        type: 'slider',
        min: 1,
        max: 15,
        default: 1,
        description: 'Generate multiple images (1-15)'
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
            { value: '21:9', label: '21:9 Ultrawide' },
            { value: '3:2', label: '3:2 Photo' },
            { value: '2:3', label: '2:3 Photo Portrait' },
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
    // Nano Banana 2 resolution (1K default, 2K higher quality)
    nanoBanana2Resolution: {
        id: 'resolution',
        label: 'Resolution',
        type: 'select',
        default: '1K',
        options: [
            { value: '1K', label: '1K (1024px) - Default' },
            { value: '2K', label: '2K (2048px) - Higher quality' }
        ],
        description: 'Higher resolution takes longer to generate'
    },
    googleSearch: {
        id: 'googleSearch',
        label: 'Google Web Search',
        type: 'boolean',
        default: false,
        description: 'Use real-time web info (weather, scores, recent events)'
    },
    imageSearch: {
        id: 'imageSearch',
        label: 'Google Image Search',
        type: 'boolean',
        default: false,
        description: 'Use web images as visual context (also enables web search)'
    },
    // FireRed Image Edit parameters
    fireRedCfgScale: {
        id: 'trueCfgScale',
        label: 'CFG Scale',
        type: 'slider',
        min: 0,
        max: 20,
        step: 0.5,
        default: 4,
        description: 'Guidance strength. Higher = more faithful to prompt.'
    },
    fireRedInferenceSteps: {
        id: 'numInferenceSteps',
        label: 'Inference Steps',
        type: 'slider',
        min: 1,
        max: 100,
        default: 40,
        description: 'Number of denoising steps. Higher = better quality, slower.'
    },
    fireRedAspectRatio: {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        default: 'match_input_image',
        options: [
            { value: 'match_input_image', label: 'Match Input Image' },
            { value: '1:1', label: '1:1 Square' },
            { value: '16:9', label: '16:9 Landscape' },
            { value: '9:16', label: '9:16 Portrait' },
            { value: '4:3', label: '4:3 Classic' },
            { value: '3:4', label: '3:4 Portrait' },
        ]
    },
    // Qwen Image Edit parameters
    qwenTrueCfgScale: {
        id: 'trueCfgScale',
        label: 'CFG Scale',
        type: 'slider',
        min: 1,
        max: 20,
        step: 0.5,
        default: 4.5,
        description: 'Guidance strength. Higher = more faithful to prompt.'
    },
    qwenInferenceSteps: {
        id: 'numInferenceSteps',
        label: 'Inference Steps',
        type: 'slider',
        min: 1,
        max: 50,
        default: 28,
        description: 'Number of denoising steps. Higher = better quality, slower.'
    },
    qwenLoraScale: {
        id: 'loraScale',
        label: 'Camera LoRA Strength',
        type: 'slider',
        min: 0,
        max: 2,
        step: 0.1,
        default: 1.25,
        description: 'Strength of camera angle control. 1.25 recommended.'
    },
    qwenAspectRatio: {
        id: 'aspectRatio',
        label: 'Aspect Ratio',
        type: 'select',
        default: 'match_input_image',
        options: [
            { value: 'match_input_image', label: 'Match Input Image' },
            { value: '1:1', label: '1:1 Square' },
            { value: '16:9', label: '16:9 Landscape' },
            { value: '9:16', label: '9:16 Portrait' },
            { value: '4:3', label: '4:3 Classic' },
            { value: '3:4', label: '3:4 Portrait' },
        ]
    },
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
    'nano-banana-2': {
        id: 'nano-banana-2',
        name: 'nano-banana-2',
        displayName: 'Nano Banana 2',
        type: 'generation',
        icon: '🍌',
        description: 'Best for text rendering, Google search grounding, and high-quality reference image editing. Handles up to 14 reference images.',
        badge: 'Premium',
        badgeColor: 'bg-green-600',
        textColor: 'text-green-300',
        endpoint: 'google/nano-banana-2',
        costPerImage: 0.10, // 10 pts = $0.10 — default (1K) rate
        costByResolution: {
            '1K': 0.10, // 10 pts — actual cost $0.067, margin ~33%
            '2K': 0.15, // 15 pts — actual cost $0.101, margin ~33%
        },
        supportedParameters: ['aspectRatio', 'resolution', 'outputFormat', 'safetyFilterLevel', 'personGeneration', 'googleSearch', 'imageSearch'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.nanoBanana2AspectRatio,
            resolution: MODEL_PARAMETERS.nanoBanana2Resolution,
            outputFormat: MODEL_PARAMETERS.outputFormat,
            safetyFilterLevel: MODEL_PARAMETERS.nanoBanana2SafetyFilter,
            personGeneration: MODEL_PARAMETERS.personGeneration,
            googleSearch: MODEL_PARAMETERS.googleSearch,
            imageSearch: MODEL_PARAMETERS.imageSearch,
        },
        maxReferenceImages: 14,
        estimatedSeconds: 60,
    },
    'flux-2-klein-9b': {
        id: 'flux-2-klein-9b',
        name: 'flux-2-klein-9b',
        displayName: 'Flux 2',
        type: 'generation',
        icon: '🔥',
        description: 'High-quality generation with LoRA support and image-to-image. Supports up to 5 reference images.',
        badge: 'Flux 2',
        badgeColor: 'bg-violet-600',
        textColor: 'text-violet-300',
        endpoint: 'black-forest-labs/flux-2-klein-9b',
        costPerImage: 0.04, // 4 pts = $0.04
        supportedParameters: ['outputFormat', 'aspectRatio'],
        parameters: {
            outputFormat: MODEL_PARAMETERS.outputFormat,
            aspectRatio: MODEL_PARAMETERS.aspectRatio,
        },
        maxReferenceImages: 5,
        estimatedSeconds: 15,
    },
    'firered-image-edit': {
        id: 'firered-image-edit',
        name: 'firered-image-edit',
        displayName: 'Edit Image',
        type: 'editing',
        icon: '✏️',
        description: 'Instruction-based image editing. Add/remove objects, change backgrounds, swap styles, fix details. Requires an input image.',
        badge: 'Edit',
        badgeColor: 'bg-orange-600',
        textColor: 'text-orange-300',
        endpoint: 'prunaai/firered-image-edit',
        costPerImage: 0.04, // 4 pts = $0.04 (~$0.015 Replicate cost, ~62% margin)
        supportedParameters: ['aspectRatio', 'outputFormat', 'trueCfgScale', 'numInferenceSteps'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.fireRedAspectRatio,
            outputFormat: MODEL_PARAMETERS.outputFormat,
            trueCfgScale: MODEL_PARAMETERS.fireRedCfgScale,
            numInferenceSteps: MODEL_PARAMETERS.fireRedInferenceSteps,
        },
        maxReferenceImages: 1,
        requiresInputImage: true,
        estimatedSeconds: 12,
    },
    'qwen-image-edit': {
        id: 'qwen-image-edit',
        name: 'qwen-image-edit',
        displayName: 'Camera Angle',
        type: 'editing',
        icon: '🎥',
        description: 'Control camera angle with 3D gizmo. Upload an image, choose your angle, and re-render from any viewpoint.',
        badge: 'Camera',
        badgeColor: 'bg-cyan-600',
        textColor: 'text-cyan-300',
        endpoint: 'qwen/qwen-image-edit-plus-lora',
        costPerImage: 0.05, // 5 pts = $0.05 (~$0.03 Replicate cost)
        supportedParameters: ['aspectRatio', 'outputFormat', 'trueCfgScale', 'numInferenceSteps', 'loraScale'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.qwenAspectRatio,
            outputFormat: MODEL_PARAMETERS.outputFormat,
            trueCfgScale: MODEL_PARAMETERS.qwenTrueCfgScale,
            numInferenceSteps: MODEL_PARAMETERS.qwenInferenceSteps,
            loraScale: MODEL_PARAMETERS.qwenLoraScale,
        },
        maxReferenceImages: 1, // Camera Angle: one subject image to rotate around
        requiresInputImage: true,
        estimatedSeconds: 30,
    },
}

/** Map deprecated model IDs to their current replacements */
const DEPRECATED_MODEL_MAP: Record<string, ModelId> = {
    'nano-banana': 'nano-banana-2',
    'nano-banana-pro-exp': 'nano-banana-2',
    'nano-banana-pro': 'nano-banana-2',
    'riverflow-2-pro': 'nano-banana-2',
    'seedream-5-lite': 'nano-banana-2',
}

/** Migrate a potentially deprecated model ID to its current equivalent */
export function migrateModelId(modelId: string): ModelId {
    if (modelId in MODEL_CONFIGS) return modelId as ModelId
    if (modelId in DEPRECATED_MODEL_MAP) return DEPRECATED_MODEL_MAP[modelId]
    return 'nano-banana-2' // Default fallback
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

export function getAvailableModels(): ModelConfig[] {
    return Object.values(MODEL_CONFIGS)
}