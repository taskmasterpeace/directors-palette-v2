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
    // Nano-Banana-Pro specific settings
    safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high'
    // Output settings
    outputFormat?: string // webp, jpg, png
    // Style injection (supports preset IDs like 'claymation' or custom IDs like 'custom-123...')
    selectedStyle?: string | null // Selected style ID for auto-injection (preset or custom)
    // Seedream-specific settings
    sequentialGeneration?: boolean // Enable sequential image generation mode
    maxImages?: number // Max images when sequential generation is enabled (1-15)
}