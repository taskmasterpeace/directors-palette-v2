/**
 * Character Sheet Generator Service
 * Generates 2-sided character model sheets using Nano Banana Pro
 */

import { imageGenerationService, ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'

// Default prompt templates
export const DEFAULT_SIDE1_PROMPT = `Professional character model sheet for <CHARACTER_NAME>, full body reference, front view, side view, back view, 3/4 view. <STYLE_NAME> art style. Clean white background, character turnaround, consistent proportions, professional character design reference sheet.`

export const DEFAULT_SIDE2_PROMPT = `Professional character expression sheet for <CHARACTER_NAME>, face close-ups, multiple emotions: neutral, happy, sad, angry, surprised, thinking. <STYLE_NAME> art style. Clean white background, expression reference, consistent facial features, professional character design reference sheet.`

export interface CharacterSheetConfig {
    characterName: string
    styleName: string
    side1Prompt: string
    side2Prompt: string
    characterReferenceUrl?: string
    styleReferenceUrl?: string
    aspectRatio?: string
}

export interface CharacterSheetResult {
    side1: {
        success: boolean
        predictionId?: string
        galleryId?: string
        status?: string
        error?: string
    }
    side2: {
        success: boolean
        predictionId?: string
        galleryId?: string
        status?: string
        error?: string
    }
}

export class CharacterSheetService {
    /**
     * Build the final prompt with variables applied
     */
    buildPrompt(template: string, characterName: string, styleName: string): string {
        return template
            .replace(/<CHARACTER_NAME>/g, characterName)
            .replace(/<STYLE_NAME>/g, styleName)
    }

    /**
     * Generate a single side of the character sheet
     */
    private async generateSide(
        prompt: string,
        characterName: string,
        styleName: string,
        referenceImages: string[],
        aspectRatio: string,
        _side: 'side1' | 'side2'
    ): Promise<{ success: boolean; predictionId?: string; galleryId?: string; status?: string; error?: string }> {
        try {
            const finalPrompt = this.buildPrompt(prompt, characterName, styleName)

            // Validate input
            const validationResult = ImageGenerationService.validateInput({
                prompt: finalPrompt,
                model: 'nano-banana-2',
                modelSettings: {
                    aspectRatio,
                    resolution: '2K'
                },
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                userId: '' // Validation doesn't require actual userId
            })

            if (!validationResult.valid) {
                return {
                    success: false,
                    error: validationResult.errors.join(', ')
                }
            }

            // Start generation
            const response = await imageGenerationService.generateImage({
                model: 'nano-banana-2',
                prompt: finalPrompt,
                modelSettings: {
                    aspectRatio,
                    resolution: '2K'
                },
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                extraMetadata: {
                    source: 'storyboard',
                    type: 'character-turnaround',
                    characterName,
                },
            })

            return {
                success: true,
                predictionId: response.predictionId,
                galleryId: response.galleryId,
                status: response.status
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Generation failed'
            }
        }
    }

    /**
     * Generate both sides of the character sheet
     */
    async generateCharacterSheet(config: CharacterSheetConfig): Promise<CharacterSheetResult> {
        const referenceImages: string[] = []
        if (config.characterReferenceUrl) {
            referenceImages.push(config.characterReferenceUrl)
        }
        if (config.styleReferenceUrl) {
            referenceImages.push(config.styleReferenceUrl)
        }

        const aspectRatio = config.aspectRatio || '16:9'

        // Generate both sides sequentially
        const side1Result = await this.generateSide(
            config.side1Prompt,
            config.characterName,
            config.styleName,
            referenceImages,
            aspectRatio,
            'side1'
        )

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500))

        const side2Result = await this.generateSide(
            config.side2Prompt,
            config.characterName,
            config.styleName,
            referenceImages,
            aspectRatio,
            'side2'
        )

        return {
            side1: side1Result,
            side2: side2Result
        }
    }

    /**
     * Get default prompt templates
     */
    getDefaultPrompts(): { side1: string; side2: string } {
        return {
            side1: DEFAULT_SIDE1_PROMPT,
            side2: DEFAULT_SIDE2_PROMPT
        }
    }

    /**
     * Extract variable names from a prompt template
     */
    extractVariables(prompt: string): string[] {
        const matches = prompt.match(/<([A-Z_]+)>/g) || []
        return [...new Set(matches.map(m => m.slice(1, -1)))]
    }
}

export const characterSheetService = new CharacterSheetService()
