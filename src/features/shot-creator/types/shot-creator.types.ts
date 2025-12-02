import { Category } from "../components/CategorySelectDialog"

export interface GalleryImage {
    id?: string
    url: string
    prompt: string
    timestamp: number
    model?: string
    creditsUsed?: number
    source?: string
    reference?: string
    seed?: number
    metadata?: Record<string, unknown>
}

export interface ShotCreatorReferenceImage {
    id: string
    file?: File
    preview: string
    tags: string[]
    detectedAspectRatio?: string
    url?: string
    width?: number
    height?: number
    persistentTag?: string // Saved tag that persists across sessions
}

export interface ShotCreatorGeneration {
    id: string
    prompt: string
    referenceImages: ShotCreatorReferenceImage[]
    settings: ShotCreatorSettings
    status: 'idle' | 'processing' | 'completed' | 'failed'
    outputUrl?: string
    error?: string
    timestamp: number
    category?: Category
}

export interface ShotCreatorSettings {
    aspectRatio: string
    resolution: string
    seed?: number
    model?: 'nano-banana' | 'nano-banana-pro' | 'gen4-image' | 'gen4-image-turbo' | 'seedream-4' | 'qwen-image' | 'qwen-image-edit'
    rawPromptMode?: boolean // Skip bracket/pipe/wildcard parsing, send prompt as-is
    // Granular syntax controls (when rawPromptMode is false)
    disablePipeSyntax?: boolean // Treat | as literal text, not separator
    disableBracketSyntax?: boolean // Treat [...] as literal text, not options
    disableWildcardSyntax?: boolean // Treat _word_ as literal text, not wildcard
    // Nano-Banana-Pro specific settings
    safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high'
    // Seedream-4 specific settings
    maxImages?: number // 1-15 for seedream-4
    customWidth?: number // 1024-4096 when resolution is 'custom'
    customHeight?: number // 1024-4096 when resolution is 'custom'
    sequentialGeneration?: boolean // for seedream-4 auto mode
    // Qwen-Image specific settings
    guidance?: number // 0-10 for image generation guidance
    num_inference_steps?: number // 10-50 denoising steps
    negative_prompt?: string // Things to avoid in the image
    strength?: number // 0-1 for img2img modification strength
    // Qwen-Image-Edit specific settings
    outputFormat?: string // webp, jpg, png
    outputQuality?: number // 50-100 quality
    goFast?: boolean // Enable faster processing
    // Gen4 specific
    gen4AspectRatio?: string // Gen4-specific aspect ratio
}