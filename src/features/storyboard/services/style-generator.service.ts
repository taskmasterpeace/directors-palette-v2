/**
 * Style Guide Generator Service
 * Generates style guide images using Nano Banana Pro
 */

import { imageGenerationService, ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'

// Default prompt template for style guide generation
export const DEFAULT_STYLE_GUIDE_PROMPT = `A professional style guide reference sheet for <STYLE_NAME> visual style, showcasing the key aesthetic elements, color palette, lighting characteristics, texture qualities, and mood. Based on the reference image style. Cinematic composition, high quality reference sheet layout.`

export interface StyleGuideGenerationConfig {
    styleName: string
    prompt: string
    referenceImageUrl?: string
    aspectRatio?: string
}

export interface StyleGuideGenerationResult {
    success: boolean
    predictionId?: string
    galleryId?: string
    status?: string
    error?: string
}

export class StyleGeneratorService {
    /**
     * Build the final prompt with variables applied
     */
    buildPrompt(template: string, styleName: string): string {
        return template.replace(/<STYLE_NAME>/g, styleName)
    }

    /**
     * Generate a style guide image
     */
    async generateStyleGuide(config: StyleGuideGenerationConfig): Promise<StyleGuideGenerationResult> {
        try {
            const finalPrompt = this.buildPrompt(config.prompt, config.styleName)

            // Validate input
            const validationResult = ImageGenerationService.validateInput({
                prompt: finalPrompt,
                model: 'nano-banana-pro',
                modelSettings: {
                    aspectRatio: config.aspectRatio || '21:9',
                    resolution: '2K'
                },
                referenceImages: config.referenceImageUrl ? [config.referenceImageUrl] : undefined,
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
                model: 'nano-banana-pro',
                prompt: finalPrompt,
                modelSettings: {
                    aspectRatio: config.aspectRatio || '21:9',
                    resolution: '2K'
                },
                referenceImages: config.referenceImageUrl ? [config.referenceImageUrl] : undefined
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
                error: error instanceof Error ? error.message : 'Style guide generation failed'
            }
        }
    }

    /**
     * Get the default prompt template
     */
    getDefaultPrompt(): string {
        return DEFAULT_STYLE_GUIDE_PROMPT
    }

    /**
     * Extract variable names from a prompt template
     */
    extractVariables(prompt: string): string[] {
        const matches = prompt.match(/<([A-Z_]+)>/g) || []
        return [...new Set(matches.map(m => m.slice(1, -1)))]
    }
}

export const styleGeneratorService = new StyleGeneratorService()
