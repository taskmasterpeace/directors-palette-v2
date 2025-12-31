/**
 * Storyboard Generation Service
 * Handles batch image generation for storyboard shots
 */

import { imageGenerationService, ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import type { ShotBreakdownSegment, StyleGuide, StoryboardCharacter, StoryboardLocation, GeneratedShotPrompt } from '../types/storyboard.types'

interface GenerationConfig {
    model: 'nano-banana-pro'
    aspectRatio: string
    resolution: '1K' | '2K' | '4K'
}

interface ShotGenerationInput {
    segment: ShotBreakdownSegment
    styleGuide?: StyleGuide
    characters: StoryboardCharacter[]
}

interface GenerationProgress {
    total: number
    current: number
    status: 'idle' | 'generating' | 'completed' | 'failed'
    currentShotNumber?: number
    error?: string
}

export class StoryboardGenerationService {
    private progress: GenerationProgress = {
        total: 0,
        current: 0,
        status: 'idle'
    }

    private onProgressUpdate?: (progress: GenerationProgress) => void

    setProgressCallback(callback: (progress: GenerationProgress) => void) {
        this.onProgressUpdate = callback
    }

    private updateProgress(updates: Partial<GenerationProgress>) {
        this.progress = { ...this.progress, ...updates }
        this.onProgressUpdate?.(this.progress)
    }

    /**
     * Build a prompt for a storyboard shot
     */
    buildShotPrompt(input: ShotGenerationInput): string {
        let prompt = input.segment.text

        // Add style guide if present
        if (input.styleGuide?.style_prompt) {
            prompt = `${prompt}, ${input.styleGuide.style_prompt}`
        }

        // Add character descriptions for characters in this shot
        const characterNames = input.characters
            .filter(c => c.has_reference && c.description)
            .map(c => `${c.name}: ${c.description}`)
            .join(', ')

        if (characterNames) {
            prompt = `${prompt}. Characters: ${characterNames}`
        }

        return prompt
    }

    /**
     * Get reference images for characters mentioned in a shot
     */
    getCharacterReferences(
        shotText: string,
        characters: StoryboardCharacter[]
    ): string[] {
        const references: string[] = []

        for (const character of characters) {
            // Check if character is mentioned in shot text
            if (
                character.has_reference &&
                character.reference_image_url &&
                shotText.toLowerCase().includes(character.name.toLowerCase())
            ) {
                references.push(character.reference_image_url)
            }
        }

        return references
    }

    /**
     * Generate images for a batch of shots
     */
    async generateShots(
        segments: ShotBreakdownSegment[],
        config: GenerationConfig,
        styleGuide?: StyleGuide,
        characters: StoryboardCharacter[] = []
    ): Promise<Array<{ shotNumber: number; predictionId: string; imageUrl?: string; error?: string }>> {
        const results: Array<{ shotNumber: number; predictionId: string; imageUrl?: string; error?: string }> = []

        this.updateProgress({
            total: segments.length,
            current: 0,
            status: 'generating'
        })

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]

            this.updateProgress({
                current: i + 1,
                currentShotNumber: segment.sequence
            })

            try {
                // Build the prompt
                const prompt = this.buildShotPrompt({
                    segment,
                    styleGuide,
                    characters
                })

                // Get character reference images for this shot
                const referenceImages = this.getCharacterReferences(segment.text, characters)

                // Validate input
                const validationResult = ImageGenerationService.validateInput({
                    prompt,
                    model: config.model,
                    modelSettings: {
                        aspectRatio: config.aspectRatio,
                        resolution: config.resolution
                    },
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                    userId: '' // Validation doesn't require actual userId
                })

                if (!validationResult.valid) {
                    results.push({
                        shotNumber: segment.sequence,
                        predictionId: '',
                        error: validationResult.errors.join(', ')
                    })
                    continue
                }

                // Start generation
                const response = await imageGenerationService.generateImage({
                    model: config.model,
                    prompt,
                    modelSettings: {
                        aspectRatio: config.aspectRatio,
                        resolution: config.resolution
                    },
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined
                })

                results.push({
                    shotNumber: segment.sequence,
                    predictionId: response.predictionId
                })
            } catch (error) {
                results.push({
                    shotNumber: segment.sequence,
                    predictionId: '',
                    error: error instanceof Error ? error.message : 'Generation failed'
                })
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        this.updateProgress({
            status: results.some(r => r.error) ? 'failed' : 'completed'
        })

        return results
    }

    /**
     * Generate images from pre-generated AI prompts
     * This is the preferred method - uses prompts that have been transformed by AI
     */
    async generateShotsFromPrompts(
        prompts: GeneratedShotPrompt[],
        config: GenerationConfig,
        styleGuide?: StyleGuide,
        _characters: StoryboardCharacter[] = [],
        _locations: StoryboardLocation[] = [],
        abortSignal?: AbortSignal
    ): Promise<Array<{ shotNumber: number; predictionId: string; imageUrl?: string; error?: string }>> {
        const results: Array<{ shotNumber: number; predictionId: string; imageUrl?: string; error?: string }> = []

        this.updateProgress({
            total: prompts.length,
            current: 0,
            status: 'generating'
        })

        for (let i = 0; i < prompts.length; i++) {
            // Check for abort before each shot
            if (abortSignal?.aborted) {
                const abortError = new Error('Generation cancelled')
                abortError.name = 'AbortError'
                throw abortError
            }

            const shot = prompts[i]

            this.updateProgress({
                current: i + 1,
                currentShotNumber: shot.sequence
            })

            try {
                // Use the AI-generated prompt directly (already enhanced)
                let finalPrompt = shot.prompt

                // Append style guide if present (prompt may already include style, but this ensures consistency)
                if (styleGuide?.style_prompt) {
                    finalPrompt = `${finalPrompt}, ${styleGuide.style_prompt}`
                }

                // Get reference images from the shot's characterRefs
                const referenceImages: string[] = []

                // Helper to validate image URL format
                const isValidImageUrl = (url: string): boolean => {
                    try {
                        const parsed = new URL(url)
                        return parsed.protocol === 'https:' || parsed.protocol === 'http:'
                    } catch {
                        return false
                    }
                }

                // Add character reference images (with URL validation)
                for (const charRef of shot.characterRefs) {
                    if (charRef.reference_image_url && isValidImageUrl(charRef.reference_image_url)) {
                        referenceImages.push(charRef.reference_image_url)
                    } else if (charRef.reference_image_url) {
                        console.warn(`[StoryboardGeneration] Invalid character reference URL: ${charRef.reference_image_url}`)
                    }
                }

                // Add location reference image if present (with URL validation)
                if (shot.locationRef?.reference_image_url) {
                    if (isValidImageUrl(shot.locationRef.reference_image_url)) {
                        referenceImages.push(shot.locationRef.reference_image_url)
                    } else {
                        console.warn(`[StoryboardGeneration] Invalid location reference URL: ${shot.locationRef.reference_image_url}`)
                    }
                }

                // Validate input
                const validationResult = ImageGenerationService.validateInput({
                    prompt: finalPrompt,
                    model: config.model,
                    modelSettings: {
                        aspectRatio: config.aspectRatio,
                        resolution: config.resolution
                    },
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                    userId: '' // Validation doesn't require actual userId
                })

                if (!validationResult.valid) {
                    results.push({
                        shotNumber: shot.sequence,
                        predictionId: '',
                        error: validationResult.errors.join(', ')
                    })
                    continue
                }

                // Start generation with the AI-enhanced prompt
                const response = await imageGenerationService.generateImage({
                    model: config.model,
                    prompt: finalPrompt,
                    modelSettings: {
                        aspectRatio: config.aspectRatio,
                        resolution: config.resolution
                    },
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined
                })

                results.push({
                    shotNumber: shot.sequence,
                    predictionId: response.predictionId,
                    imageUrl: response.imageUrl // Include imageUrl from polling response
                })
            } catch (error) {
                results.push({
                    shotNumber: shot.sequence,
                    predictionId: '',
                    error: error instanceof Error ? error.message : 'Generation failed'
                })
            }

            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        this.updateProgress({
            status: results.some(r => r.error) ? 'failed' : 'completed'
        })

        return results
    }

    getProgress(): GenerationProgress {
        return this.progress
    }

    resetProgress() {
        this.progress = {
            total: 0,
            current: 0,
            status: 'idle'
        }
        this.onProgressUpdate?.(this.progress)
    }
}

export const storyboardGenerationService = new StoryboardGenerationService()
