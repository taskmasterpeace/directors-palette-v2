import { DirectorFingerprint } from '../types/director.types'
import { imageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import type { ZImageTurboSettings, ImageGenerationRequest } from '@/features/shot-creator/types/image-generation.types'

/**
 * Director Vision Service
 * 
 * Generates rapid visualizations for director concepts using z-image-turbo.
 * Used for:
 * - Proposal Headers (Director Vibe)
 * - Timeline Block Previews
 * - Texture Generation
 */
export class DirectorVisionService {

    /**
     * Generate a "Vibe" image for a director
     * Useful for header backgrounds or style referencing.
     */
    async generateDirectorVibeImage(director: DirectorFingerprint, contextPrompt: string): Promise<string | null> {
        // Construct prompt using director's visual style keywords
        const styleKeywords = [
            director.coreIntent.controlVsSpontaneity,
            director.coreIntent.emotionalTemperature,
            ...director.coreIntent.primaryFocus,
            director.spectacleProfile.vfxTolerance === 'maximum' ? 'vfx heavy' : '',
            director.spectacleProfile.budgetAssumption === 'blockbuster' ? 'cinematic, high budget' : 'indie style'
        ].filter(Boolean).join(', ')

        const fullPrompt = `Cinematic still frame, ${styleKeywords} style. ${contextPrompt}. High quality, detailed.`

        try {
            // Call the generation API (client-side directly calling the internal service/API route)
            // Ideally we fetch from /api/generation/image, but we can reuse the service wrapper if valid
            // imageGenerationService makes fetch calls to /api/generation/image

            const settings: ZImageTurboSettings = {
                numInferenceSteps: 2, // Turbo speed
                guidanceScale: 1.0,   // Low guidance for speed/creativity
                aspectRatio: '16:9'
            }

            const request: ImageGenerationRequest = {
                model: 'z-image-turbo',
                prompt: fullPrompt,
                modelSettings: settings,
                referenceImages: []
            }

            const response = await imageGenerationService.generateImage(request)

            // Poll for result or get from response if Z-Image is fast enough to return immediately? 
            // The API route currently returns 'predictionId' and 'status'.
            // If it polls (no webhook), it returns imageUrl.

            if (response.imageUrl) {
                return response.imageUrl
            }

            if (response.status === 'failed') {
                throw new Error('Generation failed')
            }

            return null // Pending

        } catch (error) {
            console.error('Director Vision Generation Failed:', error)
            return null
        }
    }
}

export const directorVisionService = new DirectorVisionService()
