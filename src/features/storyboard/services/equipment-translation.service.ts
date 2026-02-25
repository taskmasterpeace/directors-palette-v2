/**
 * Equipment Translation Service
 *
 * Translates real-world camera equipment specs into image-model-safe
 * perspective language. Video models can understand equipment names;
 * image models need visual descriptions instead.
 */

import type { ModelId } from '@/config'
import type { CameraSetup, MediumCategory, ShotType } from '../types/storyboard.types'

// Image-only models that don't understand motion/equipment terms
const IMAGE_ONLY_MODELS: ModelId[] = [
    'nano-banana',
    'nano-banana-pro',
    'z-image-turbo',
    'seedream-5-lite',
    'riverflow-2-pro'
]

// Motion terms that should be stripped for image models
const MOTION_TERMS = [
    /\b(dolly|pan|tilt|crane|steadicam|tracking shot|rack focus|pull focus|zoom in|zoom out|push in|pull back|follow shot|whip pan|dutch tilt|jib|gimbal|handheld movement|camera movement|camera motion)\b/gi
]

export class EquipmentTranslationService {
    /**
     * Check if a model is image-only (vs video)
     */
    static isImageModel(modelId: ModelId): boolean {
        return IMAGE_ONLY_MODELS.includes(modelId)
    }

    /**
     * Map shot type to bracket (close/medium/wide)
     */
    static shotTypeToBracket(shotType?: ShotType): 'close' | 'medium' | 'wide' {
        switch (shotType) {
            case 'close-up':
            case 'detail':
                return 'close'
            case 'medium':
                return 'medium'
            case 'wide':
            case 'establishing':
                return 'wide'
            case 'unknown':
            default:
                return 'medium'
        }
    }

    /**
     * Build camera foundation text from a setup
     *
     * For video models: includes equipment names (camera body, lens, film stock)
     * For image models: uses perspectiveTranslation (visual descriptions)
     */
    static buildCameraFoundation(
        setup: CameraSetup,
        modelId: ModelId,
        medium: MediumCategory
    ): string {
        if (this.isImageModel(modelId)) {
            // Image models get visual perspective language
            return setup.perspectiveTranslation
        }

        // Video models get full equipment specs
        const parts: string[] = []

        if (medium === 'live-action') {
            parts.push(`shot on ${setup.cameraBody}`)
            parts.push(setup.lens)
            if (setup.filmStock) {
                parts.push(setup.filmStock)
            }
            parts.push(`${setup.depthOfField} depth of field`)
        } else {
            // For animation/CG mediums, use perspective translation even for video
            return setup.perspectiveTranslation
        }

        return parts.join(', ')
    }

    /**
     * Strip motion/camera-movement terms from a prompt
     * Used when targeting image models to avoid confusing them
     */
    static stripMotionTerms(prompt: string): string {
        let cleaned = prompt
        for (const pattern of MOTION_TERMS) {
            cleaned = cleaned.replace(pattern, '')
        }
        // Clean up double commas and extra spaces from removals
        cleaned = cleaned.replace(/,\s*,/g, ',')
        cleaned = cleaned.replace(/\s{2,}/g, ' ')
        cleaned = cleaned.replace(/,\s*$/g, '')
        cleaned = cleaned.replace(/^\s*,/g, '')
        return cleaned.trim()
    }

    /**
     * Find the best matching camera setup for a shot type
     */
    static findSetup(
        setups: CameraSetup[],
        shotType?: ShotType
    ): CameraSetup | undefined {
        const bracket = this.shotTypeToBracket(shotType)
        return setups.find(s => s.shotBracket === bracket) || setups[0]
    }
}
