/**
 * Model Configuration System
 * Defines capabilities and parameters for each AI model in Shot Creator
 */

/**
 * Standard target sizes for image resizing
 * Based on best practices for Replicate API
 */
export const ASPECT_RATIO_SIZES: Record<string, { width: number; height: number }> = {
    // nano-banana-pro supported ratios
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
export type ModelId = 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-2512' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' | 'seedream-4.5'

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
    }
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
    'nano-banana': {
        id: 'nano-banana',
        name: 'nano-banana',
        displayName: 'Nano Banana',
        type: 'generation',
        icon: '🍌',
        description: 'Fast generation, good for quick iterations. Great value.',
        badge: 'Fast',
        badgeColor: 'bg-yellow-600',
        textColor: 'text-yellow-300',
        endpoint: 'google/nano-banana',
        costPerImage: 0.08, // 8 points = 8 cents (100% margin on $0.04 cost)
        supportedParameters: ['outputFormat', 'aspectRatio'],
        parameters: {
            outputFormat: MODEL_PARAMETERS.outputFormat,
            aspectRatio: MODEL_PARAMETERS.aspectRatio
        },
        maxReferenceImages: 10
    },
    'nano-banana-pro': {
        id: 'nano-banana-pro',
        name: 'nano-banana-pro',
        displayName: 'Nano Banana Pro',
        type: 'generation',
        icon: '🔥',
        description: 'SOTA quality with accurate text rendering, 4K support, and advanced editing capabilities',
        badge: 'Pro',
        badgeColor: 'bg-amber-600',
        textColor: 'text-amber-300',
        endpoint: 'google/nano-banana-pro',
        costPerImage: 0.25, // Default price (1K/2K) - 25 pts = $0.25
        costByResolution: {
            '1K': 0.25,  // 25 pts - Replicate cost $0.15 (66% margin)
            '2K': 0.25,  // 25 pts - Replicate cost $0.15 (66% margin)
            '4K': 0.45,  // 45 pts - Replicate cost $0.30 (50% margin)
        },
        supportedParameters: ['outputFormat', 'aspectRatio', 'resolution', 'safetyFilterLevel'],
        parameters: {
            outputFormat: MODEL_PARAMETERS.outputFormat,
            aspectRatio: MODEL_PARAMETERS.aspectRatio,
            resolution: MODEL_PARAMETERS.nanoBananaProResolution,
            safetyFilterLevel: MODEL_PARAMETERS.safetyFilterLevel
        },
        maxReferenceImages: 14
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
    'qwen-image-2512': {
        id: 'qwen-image-2512',
        name: 'qwen-image-2512',
        displayName: 'Qwen Image 2512',
        type: 'generation',
        icon: '🚀',
        description: 'Fast, high-quality image generation with image-to-image support.',
        badge: 'Fast',
        badgeColor: 'bg-cyan-600',
        textColor: 'text-cyan-300',
        endpoint: 'qwen/qwen-image-2512',
        costPerImage: 0.04, // 4 points = 4 cents ($0.02 cost, 100% margin)
        supportedParameters: ['outputFormat', 'aspectRatio', 'qwenGuidance', 'qwenSteps', 'negativePrompt', 'goFast'],
        parameters: {
            outputFormat: MODEL_PARAMETERS.outputFormat,
            aspectRatio: MODEL_PARAMETERS.aspectRatio,
            guidance: MODEL_PARAMETERS.qwenGuidance,
            num_inference_steps: MODEL_PARAMETERS.qwenSteps,
            negative_prompt: MODEL_PARAMETERS.negativePrompt,
            goFast: MODEL_PARAMETERS.goFast
        },
        maxReferenceImages: 1 // Supports single image for i2i
    },
    // OpenAI GPT Image 1.5 - Low Quality (Budget option)
    'gpt-image-low': {
        id: 'gpt-image-low',
        name: 'gpt-image-low',
        displayName: 'GPT Image Low',
        type: 'generation',
        icon: '🎨',
        description: 'OpenAI GPT Image - Budget quality. Fast & affordable for drafts.',
        badge: 'Budget',
        badgeColor: 'bg-green-600',
        textColor: 'text-green-300',
        endpoint: 'openai/gpt-image-1.5',
        costPerImage: 0.03, // 3 tokens = 3 cents (~130% margin on $0.013)
        supportedParameters: ['gptImageAspectRatio', 'gptImageOutputFormat', 'gptImageBackground', 'gptImageNumImages', 'gptImageInputFidelity'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.gptImageAspectRatio,
            outputFormat: MODEL_PARAMETERS.gptImageOutputFormat,
            background: MODEL_PARAMETERS.gptImageBackground,
            numImages: MODEL_PARAMETERS.gptImageNumImages,
            inputFidelity: MODEL_PARAMETERS.gptImageInputFidelity
        },
        maxReferenceImages: 10 // Supports input_images parameter
    },
    // OpenAI GPT Image 1.5 - Medium Quality
    'gpt-image-medium': {
        id: 'gpt-image-medium',
        name: 'gpt-image-medium',
        displayName: 'GPT Image',
        type: 'generation',
        icon: '🎨',
        description: 'OpenAI GPT Image - Standard quality. Excellent text rendering.',
        badge: 'Standard',
        badgeColor: 'bg-blue-600',
        textColor: 'text-blue-300',
        endpoint: 'openai/gpt-image-1.5',
        costPerImage: 0.10, // 10 tokens = 10 cents (100% margin on $0.05)
        supportedParameters: ['gptImageAspectRatio', 'gptImageOutputFormat', 'gptImageBackground', 'gptImageNumImages', 'gptImageInputFidelity'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.gptImageAspectRatio,
            outputFormat: MODEL_PARAMETERS.gptImageOutputFormat,
            background: MODEL_PARAMETERS.gptImageBackground,
            numImages: MODEL_PARAMETERS.gptImageNumImages,
            inputFidelity: MODEL_PARAMETERS.gptImageInputFidelity
        },
        maxReferenceImages: 10 // Supports input_images parameter
    },
    // OpenAI GPT Image 1.5 - High Quality
    'gpt-image-high': {
        id: 'gpt-image-high',
        name: 'gpt-image-high',
        displayName: 'GPT Image HD',
        type: 'generation',
        icon: '✨',
        description: 'OpenAI GPT Image - Highest quality. Best for final renders & detailed work.',
        badge: 'Premium',
        badgeColor: 'bg-violet-600',
        textColor: 'text-violet-300',
        endpoint: 'openai/gpt-image-1.5',
        costPerImage: 0.27, // 27 tokens = 27 cents (~100% margin on $0.136)
        supportedParameters: ['gptImageAspectRatio', 'gptImageOutputFormat', 'gptImageBackground', 'gptImageNumImages', 'gptImageInputFidelity'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.gptImageAspectRatio,
            outputFormat: MODEL_PARAMETERS.gptImageOutputFormat,
            background: MODEL_PARAMETERS.gptImageBackground,
            numImages: MODEL_PARAMETERS.gptImageNumImages,
            inputFidelity: MODEL_PARAMETERS.gptImageInputFidelity
        },
        maxReferenceImages: 10 // Supports input_images parameter
    },
    'seedream-4.5': {
        id: 'seedream-4.5',
        name: 'seedream-4.5',
        displayName: 'Seedream 4.5',
        type: 'generation',
        icon: '🌱',
        description: 'High quality generation with 4K support and sequential image generation.',
        badge: 'Quality',
        badgeColor: 'bg-emerald-600',
        textColor: 'text-emerald-300',
        endpoint: 'bytedance/seedream-4.5',
        costPerImage: 0.06, // 6 points = 6 cents ($0.04 cost, 50% margin)
        // Note: Seedream does NOT support outputFormat - always outputs JPG
        supportedParameters: ['aspectRatio', 'seedreamResolution', 'maxImages', 'sequentialGeneration'],
        parameters: {
            aspectRatio: MODEL_PARAMETERS.aspectRatio,
            resolution: MODEL_PARAMETERS.seedreamResolution,
            maxImages: MODEL_PARAMETERS.maxImages,
            sequentialGeneration: MODEL_PARAMETERS.sequentialGeneration
        },
        maxReferenceImages: 14
    }
}

export function getModelConfig(modelId: ModelId): ModelConfig {
    return MODEL_CONFIGS[modelId] || MODEL_CONFIGS['nano-banana']
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