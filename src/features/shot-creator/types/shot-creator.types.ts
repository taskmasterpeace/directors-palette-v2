import { Category } from "../components/CategorySelectDialog"
import type { ModelId } from '@/config'

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

export type QuickMode = 'none' | 'style-transfer' | 'character-sheet'

export interface ShotCreatorSettings {
    aspectRatio: string
    resolution: string
    seed?: number
    model?: ModelId
    rawPromptMode?: boolean // Skip bracket/pipe/wildcard parsing, send prompt as-is
    // Granular syntax controls (when rawPromptMode is false)
    disablePipeSyntax?: boolean // Treat | as literal text, not separator
    disableBracketSyntax?: boolean // Treat [...] as literal text, not options
    disableWildcardSyntax?: boolean // Treat _word_ as literal text, not wildcard
    enableAnchorTransform?: boolean // Enable Anchor Transform: use first ref image to transform remaining images
    // Quick mode for one-click workflows
    quickMode?: QuickMode
    // Nano-Banana-2 specific settings
    safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high' | 'block_none'
    personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all'
    googleSearch?: boolean // Use Google Web Search grounding
    imageSearch?: boolean // Use Google Image Search grounding
    // Output settings
    outputFormat?: string // webp, jpg, png
    // Style injection (supports preset IDs like 'claymation' or custom IDs like 'custom-123...')
    selectedStyle?: string | null // Selected style ID for auto-injection (preset or custom)
    // Seedream-specific settings
    sequentialGeneration?: boolean // Enable sequential image generation mode
    maxImages?: number // Max images when sequential generation is enabled (1-15)
    // Slot Machine syntax settings
    disableSlotMachineSyntax?: boolean // Treat {text} as literal, don't expand to variations
    slotMachineVariationCount?: number // Number of variations to generate (2-5, default 3)
    // Z-Image Turbo / LoRA settings
    guidanceScale?: number // Guidance scale (0-20, default 0, auto-set to 1 when LoRA active)
    loraScale?: number // LoRA strength (0-2, default 1.0)
    img2imgStrength?: number // Img2img strength (0-1, default 0.6) — controls how much reference image is transformed
    // Batch generation
    batchCount?: number // Number of times to repeat generation (1 or 5, default 1)
    // Auto-enhance prompt at generation time (model-aware LLM enhancement)
    autoEnhance?: boolean
    // Camera angle control (Qwen Image Edit)
    cameraAzimuth?: number      // 0-360 degrees (horizontal rotation)
    cameraElevation?: number    // -30 to 60 degrees (vertical tilt)
    cameraDistance?: number     // 0-10 (zoom: 0=wide, 10=close-up)
    cameraEnabled?: boolean     // Whether camera angle control is active
}