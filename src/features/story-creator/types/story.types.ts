/**
 * Type definitions for Story Creator feature
 */

export type StoryProjectStatus = 'draft' | 'extracting' | 'ready' | 'generating' | 'completed'
export type ShotStatus = 'pending' | 'ready' | 'generating' | 'completed' | 'failed'
export type GenerationQueueStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'failed'

/**
 * Extracted entity from story text
 */
export interface ExtractedEntity {
    type: 'character' | 'location' | 'prop'
    name: string
    tag: string // e.g., "tsu_surf", "courtroom"
    description?: string
    referenceImageUrl?: string
    firstMention?: number // Line/sentence where first mentioned
}

/**
 * Story project metadata
 */
export interface StoryProjectMetadata {
    extractedEntities?: ExtractedEntity[]
    chapterTitles?: string[]
    totalShots?: number
    generationSettings?: {
        model: string
        aspectRatio?: string
        resolution?: string
    }
}

/**
 * Story project from database
 */
export interface StoryProject {
    id: string
    user_id: string
    title: string
    story_text: string
    status: StoryProjectStatus
    metadata: StoryProjectMetadata
    created_at: string
    updated_at: string
}

/**
 * Create story project input
 */
export interface CreateStoryProjectInput {
    title: string
    story_text: string
    metadata?: Partial<StoryProjectMetadata>
}

/**
 * Update story project input
 */
export interface UpdateStoryProjectInput {
    title?: string
    story_text?: string
    status?: StoryProjectStatus
    metadata?: Partial<StoryProjectMetadata>
}

/**
 * Shot metadata
 */
export interface ShotMetadata {
    chapter?: string
    scene?: string
    originalText?: string
    aiGenerated?: boolean
    mergedShots?: string[] // IDs of shots merged with brackets
    generated_at?: string
    gallery_ids?: string[] // All gallery IDs when bracket variations are used
    variation_count?: number
    error?: string
}

/**
 * Story shot from database
 */
export interface StoryShot {
    id: string
    project_id: string
    sequence_number: number
    chapter?: string
    prompt: string
    reference_tags: string[]
    gallery_id?: string
    status: ShotStatus
    metadata: ShotMetadata
    created_at: string
    updated_at: string
}

/**
 * Create shot input
 */
export interface CreateShotInput {
    project_id: string
    sequence_number: number
    chapter?: string
    prompt: string
    reference_tags?: string[]
    metadata?: Partial<ShotMetadata>
}

/**
 * Update shot input
 */
export interface UpdateShotInput {
    sequence_number?: number
    chapter?: string
    prompt?: string
    reference_tags?: string[]
    gallery_id?: string
    status?: ShotStatus
    metadata?: Partial<ShotMetadata>
}

/**
 * Generation queue from database
 */
export interface GenerationQueue {
    id: string
    user_id: string
    project_id: string
    shot_ids: string[]
    status: GenerationQueueStatus
    progress: number // 0-100
    current_shot_index: number
    error_message?: string
    created_at: string
    updated_at: string
}

/**
 * Create generation queue input
 */
export interface CreateGenerationQueueInput {
    project_id: string
    shot_ids: string[]
}

/**
 * Generation queue progress update
 */
export interface QueueProgressUpdate {
    status: GenerationQueueStatus
    progress: number
    current_shot_index: number
    error_message?: string
}

/**
 * Parsed story result from AI
 */
export interface ParsedStoryResult {
    entities: ExtractedEntity[]
    shots: {
        sequence: number
        chapter?: string
        text: string
        prompt: string
        referenceTags: string[]
    }[]
    chapters: string[]
}

/**
 * Shot grouping suggestion
 */
export interface ShotGroupingSuggestion {
    shotIds: string[]
    mergedPrompt: string
    reason: string
    confidence: number // 0-1
}
