/**
 * Model Configuration System
 * Defines capabilities and parameters for each AI model in Shot Creator
 */

/**
 * Standard target sizes for image resizing
 * Based on best practices for Replicate API
 */
export const ASPECT_RATIO_SIZES: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
  '21:9': { width: 1344, height: 576 },
  '3:2': { width: 1152, height: 768 },
  '2:3': { width: 768, height: 1152 },
};

export type ModelType = 'generation' | 'editing'
export type ModelId = 'nano-banana' | 'nano-banana-pro'

export interface ModelParameter {
    id: string
    label: string
    type: 'select' | 'number' | 'boolean' | 'slider' | 'string'
    options?: { value: string; label: string }[]
    min?: number
    max?: number
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
            { value: '1K', label: '1K (1024px)' },
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
        default: 3,
        description: 'Image generation guidance (0-10)'
    },
    qwenSteps: {
        id: 'num_inference_steps',
        label: 'Inference Steps',
        type: 'slider',
        min: 10,
        max: 50,
        default: 30,
        description: 'Number of denoising steps (10-50)'
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
            { value: '1K', label: '1K (20 tokens)' },
            { value: '2K', label: '2K (20 tokens) - Recommended' },
            { value: '4K', label: '4K (35 tokens) - Premium' }
        ],
        description: 'Higher resolution = better quality but increased cost'
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
        costPerImage: 0.06, // Price we charge users (6 pts = $0.06)
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
        costPerImage: 0.20, // Price we charge users (20 pts = $0.20)
        supportedParameters: ['outputFormat', 'aspectRatio', 'resolution', 'safetyFilterLevel'],
        parameters: {
            outputFormat: MODEL_PARAMETERS.outputFormat,
            aspectRatio: MODEL_PARAMETERS.aspectRatio,
            resolution: MODEL_PARAMETERS.nanoBananaProResolution,
            safetyFilterLevel: MODEL_PARAMETERS.safetyFilterLevel
        },
        maxReferenceImages: 14
    }
}

export function getModelConfig(modelId: ModelId): ModelConfig {
    return MODEL_CONFIGS[modelId] || MODEL_CONFIGS['nano-banana']
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