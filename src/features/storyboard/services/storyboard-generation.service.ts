/**
 * Storyboard Generation Service
 * Handles batch image generation for storyboard shots
 */

import { imageGenerationService, ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import type { ModelId } from '@/config'
import type { ShotBreakdownSegment, StyleGuide, StoryboardCharacter, StoryboardLocation, GeneratedShotPrompt, PresetStyle } from '../types/storyboard.types'
import { EquipmentTranslationService } from './equipment-translation.service'
import { logger } from '@/lib/logger'

interface GenerationConfig {
    model: ModelId
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

                // Add style guide reference image
                if (styleGuide?.reference_image_url) {
                    const url = styleGuide.reference_image_url
                    if (url.startsWith('/') || url.startsWith('http')) {
                        referenceImages.push(url)
                    }
                }

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
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                    waitForResult: true
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
     * Validate image URL format (accepts http/https URLs, local paths, and data URIs)
     */
    private isValidImageUrl(url: string): boolean {
        if (url.startsWith('/')) return true
        if (url.startsWith('data:image/')) return true
        try {
            const parsed = new URL(url)
            return parsed.protocol === 'https:' || parsed.protocol === 'http:'
        } catch {
            return false
        }
    }

    /**
     * Prepare a single shot for generation: build prompt, collect references, validate
     */
    private prepareShotForGeneration(
        shot: GeneratedShotPrompt,
        config: GenerationConfig,
        styleGuide?: StyleGuide,
        presetStyle?: PresetStyle
    ): { finalPrompt: string; referenceImages: string[] } | { error: string } {
        let finalPrompt = shot.prompt

        if (styleGuide?.style_prompt) {
            finalPrompt = `${finalPrompt}, ${styleGuide.style_prompt}`
        }

        if (presetStyle?.technicalAttributes) {
            const ta = presetStyle.technicalAttributes
            finalPrompt = `${finalPrompt}, ${ta.colorPalette}, ${ta.texture}`
        }

        if (EquipmentTranslationService.isImageModel(config.model)) {
            finalPrompt = EquipmentTranslationService.stripMotionTerms(finalPrompt)
        }

        const referenceImages: string[] = []

        for (const charRef of shot.characterRefs) {
            if (charRef.reference_image_url && this.isValidImageUrl(charRef.reference_image_url)) {
                referenceImages.push(charRef.reference_image_url)
            } else if (charRef.reference_image_url) {
                logger.storyboard.warn('Invalid character reference URL', { name: charRef.name, url: charRef.reference_image_url })
            } else if (charRef.has_reference && !charRef.reference_image_url) {
                logger.storyboard.warn('Character has has_reference=true but no reference_image_url', { name: charRef.name })
            }
        }

        if (shot.locationRef?.reference_image_url) {
            if (this.isValidImageUrl(shot.locationRef.reference_image_url)) {
                referenceImages.push(shot.locationRef.reference_image_url)
            } else {
                logger.storyboard.warn('Invalid location reference URL', { url: shot.locationRef.reference_image_url })
            }
        }

        if (styleGuide?.reference_image_url && this.isValidImageUrl(styleGuide.reference_image_url)) {
            referenceImages.push(styleGuide.reference_image_url)
        }
        if (presetStyle?.imagePath && this.isValidImageUrl(presetStyle.imagePath)) {
            if (!referenceImages.includes(presetStyle.imagePath)) {
                referenceImages.push(presetStyle.imagePath)
            }
        }

        const validationResult = ImageGenerationService.validateInput({
            prompt: finalPrompt,
            model: config.model,
            modelSettings: {
                aspectRatio: config.aspectRatio,
                resolution: config.resolution
            },
            referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            userId: ''
        })

        if (!validationResult.valid) {
            return { error: validationResult.errors.join(', ') }
        }

        return { finalPrompt, referenceImages }
    }

    /**
     * Generate a single shot image
     */
    private async generateSingleShot(
        shot: GeneratedShotPrompt,
        config: GenerationConfig,
        styleGuide?: StyleGuide,
        presetStyle?: PresetStyle
    ): Promise<{ shotNumber: number; predictionId: string; imageUrl?: string; error?: string }> {
        const prepared = this.prepareShotForGeneration(shot, config, styleGuide, presetStyle)

        if ('error' in prepared) {
            return { shotNumber: shot.sequence, predictionId: '', error: prepared.error }
        }

        const response = await imageGenerationService.generateImage({
            model: config.model,
            prompt: prepared.finalPrompt,
            modelSettings: {
                aspectRatio: config.aspectRatio,
                resolution: config.resolution
            },
            referenceImages: prepared.referenceImages.length > 0 ? prepared.referenceImages : undefined,
            waitForResult: true
        })

        return {
            shotNumber: shot.sequence,
            predictionId: response.predictionId,
            imageUrl: response.imageUrl
        }
    }

    /**
     * Generate images from pre-generated AI prompts
     * Uses batched parallel generation (3 concurrent) for faster throughput
     */
    async generateShotsFromPrompts(
        prompts: GeneratedShotPrompt[],
        config: GenerationConfig,
        styleGuide?: StyleGuide,
        _characters: StoryboardCharacter[] = [],
        _locations: StoryboardLocation[] = [],
        abortSignal?: AbortSignal,
        getPauseState?: () => boolean,
        presetStyle?: PresetStyle,
        onShotComplete?: (result: { shotNumber: number; predictionId: string; imageUrl?: string; error?: string }) => void
    ): Promise<Array<{ shotNumber: number; predictionId: string; imageUrl?: string; error?: string }>> {
        const results: Array<{ shotNumber: number; predictionId: string; imageUrl?: string; error?: string }> = []
        const BATCH_SIZE = 3

        this.updateProgress({
            total: prompts.length,
            current: 0,
            status: 'generating'
        })

        for (let batchStart = 0; batchStart < prompts.length; batchStart += BATCH_SIZE) {
            // Check for abort before each batch
            if (abortSignal?.aborted) {
                const abortError = new Error('Generation cancelled')
                abortError.name = 'AbortError'
                throw abortError
            }

            // Wait while paused
            if (getPauseState) {
                while (getPauseState() && !abortSignal?.aborted) {
                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            }

            const batch = prompts.slice(batchStart, batchStart + BATCH_SIZE)

            this.updateProgress({
                current: batchStart + 1,
                currentShotNumber: batch[0].sequence
            })

            // Generate all shots in this batch concurrently
            const batchPromises = batch.map(async (shot) => {
                try {
                    return await this.generateSingleShot(shot, config, styleGuide, presetStyle)
                } catch (error) {
                    return {
                        shotNumber: shot.sequence,
                        predictionId: '',
                        error: error instanceof Error ? error.message : 'Generation failed'
                    }
                }
            })

            const batchResults = await Promise.all(batchPromises)

            for (const result of batchResults) {
                results.push(result)
                onShotComplete?.(result)
            }

            // Update progress after batch completes
            this.updateProgress({
                current: Math.min(batchStart + BATCH_SIZE, prompts.length),
                currentShotNumber: batch[batch.length - 1].sequence
            })

            // Small delay between batches to avoid rate limiting
            if (batchStart + BATCH_SIZE < prompts.length) {
                await new Promise(resolve => setTimeout(resolve, 300))
            }
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
