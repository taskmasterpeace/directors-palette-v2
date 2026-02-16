/**
 * Shot Animation Service
 *
 * Builds dual-layer animation prompts combining:
 * 1. Story Action - what's happening in the scene
 * 2. Director Camera Move - how the camera captures it
 *
 * Then dispatches video generation via the existing /api/generation/video endpoint.
 */

import type { ShotType } from '../types/storyboard.types'
import type { DirectorFingerprint } from '@/features/music-lab/types/director.types'

export type AnimationModel = 'seedance-lite' | 'seedance-pro'

/**
 * Motion bias token → video-model-friendly description
 */
const MOTION_BIAS_MAP: Record<string, string> = {
    measured_push: 'slow push-in',
    slow_follow: 'gentle following movement',
    imperceptible_push: 'barely perceptible forward drift',
    locked_precision: 'locked-off static frame',
    whip_pan: 'fast whip pan',
    dolly_track_lateral: 'smooth lateral tracking',
    fast_tracking: 'fast tracking shot',
    crane_swoop: 'sweeping crane movement',
    slow_drift: 'slow atmospheric drift',
    orbital: 'slow orbital movement around subject',
    handheld_subtle: 'subtle handheld movement',
    handheld_energetic: 'energetic handheld shake',
    steadicam_glide: 'smooth steadicam glide',
    static_locked: 'perfectly static locked frame',
    zoom_creep: 'slow creeping zoom',
    rack_focus: 'shifting focal plane',
}

/**
 * Default camera moves per shot type when no director is specified
 */
const DEFAULT_CAMERA_BY_SHOT_TYPE: Record<string, string> = {
    establishing: 'slow pan across the scene',
    wide: 'gentle drift with subtle ambient motion',
    medium: 'gentle zoom with subtle ambient motion',
    'close-up': 'slow push-in with shallow depth shift',
    detail: 'subtle breathing movement, shallow focus shift',
    unknown: 'gentle camera drift',
}

/**
 * Pacing modifiers based on director motion frequency
 */
const PACING_MODIFIERS: Record<string, string> = {
    rare: 'with glacial patience',
    occasional: 'at a measured pace',
    frequent: 'with dynamic energy',
    constant: 'with relentless momentum',
}

/**
 * Common action verbs to extract from story text
 */
const ACTION_VERBS = [
    'walks', 'runs', 'stands', 'sits', 'turns', 'looks', 'opens', 'closes',
    'reaches', 'grabs', 'holds', 'drops', 'throws', 'catches', 'falls',
    'rises', 'enters', 'exits', 'leaves', 'arrives', 'storms', 'dances',
    'fights', 'screams', 'whispers', 'cries', 'laughs', 'smiles', 'frowns',
    'stares', 'gazes', 'watches', 'waits', 'moves', 'steps', 'climbs',
    'jumps', 'flies', 'drives', 'rides', 'swims', 'crawls', 'kneels',
    'embraces', 'kisses', 'pushes', 'pulls', 'lifts', 'carries',
    'points', 'waves', 'nods', 'shakes', 'trembles', 'shivers',
]

export class ShotAnimationService {
    /**
     * Build animation prompt from story context + director motion style.
     *
     * Output format: "[Story action]. [Director camera move], [pacing modifier]."
     */
    static buildAnimationPrompt(
        originalText: string,
        shotPrompt: string,
        shotType: ShotType,
        director?: DirectorFingerprint
    ): string {
        const storyAction = this.extractStoryAction(originalText, shotPrompt)
        const cameraMove = director
            ? this.translateMotionBias(
                director.cameraMotionProfile.motionBias,
                shotType,
                director.cameraMotionProfile.motionFrequency
            )
            : DEFAULT_CAMERA_BY_SHOT_TYPE[shotType] || DEFAULT_CAMERA_BY_SHOT_TYPE.unknown

        return `${storyAction}. ${cameraMove}.`
    }

    /**
     * Translate director motionBias tokens to video-model-friendly language.
     * Selects the most appropriate bias for the shot type and combines with pacing.
     */
    static translateMotionBias(
        motionBias: string[],
        shotType: ShotType,
        frequency: string
    ): string {
        if (!motionBias || motionBias.length === 0) {
            return DEFAULT_CAMERA_BY_SHOT_TYPE[shotType] || DEFAULT_CAMERA_BY_SHOT_TYPE.unknown
        }

        // Select bias most appropriate for shot type
        let selectedBias: string
        if (shotType === 'close-up' || shotType === 'detail') {
            // For close shots, prefer subtle movements
            selectedBias = motionBias.find(b =>
                b.includes('push') || b.includes('imperceptible') || b.includes('locked') || b.includes('drift')
            ) || motionBias[0]
        } else if (shotType === 'establishing' || shotType === 'wide') {
            // For wide shots, prefer tracking/panning movements
            selectedBias = motionBias.find(b =>
                b.includes('track') || b.includes('follow') || b.includes('crane') || b.includes('orbital')
            ) || motionBias[0]
        } else {
            selectedBias = motionBias[0]
        }

        const translated = MOTION_BIAS_MAP[selectedBias] || selectedBias.replace(/_/g, ' ')
        const pacing = PACING_MODIFIERS[frequency] || ''

        return pacing ? `${translated}, ${pacing}` : translated
    }

    /**
     * Extract action/motion from story text.
     * Pulls out verbs and movement descriptions, combines with subject from prompt.
     */
    static extractStoryAction(originalText: string, shotPrompt: string): string {
        const textLower = originalText.toLowerCase()

        // Find action verbs in original text
        const foundVerbs = ACTION_VERBS.filter(v => textLower.includes(v))

        // Extract a subject hint from the shot prompt (first noun phrase, roughly)
        const subjectMatch = shotPrompt.match(/^([^,]+)/)
        const subject = subjectMatch
            ? subjectMatch[1].slice(0, 60).trim()
            : 'Subject'

        if (foundVerbs.length > 0) {
            // Build action from found verbs
            const primaryVerb = foundVerbs[0]
            // Find the sentence containing the verb for more context
            const sentences = originalText.split(/[.!?]+/).filter(s => s.trim())
            const actionSentence = sentences.find(s => s.toLowerCase().includes(primaryVerb))

            if (actionSentence) {
                const cleaned = actionSentence.trim()
                // Keep it concise - max ~80 chars
                return cleaned.length > 80 ? cleaned.slice(0, 77) + '...' : cleaned
            }
            return `${subject} ${primaryVerb}`
        }

        // Fallback: use a shortened version of originalText
        const cleaned = originalText.trim()
        if (cleaned.length > 80) {
            return cleaned.slice(0, 77) + '...'
        }
        return cleaned || subject
    }

    /**
     * Start video generation for a shot via the existing video API.
     * Returns the prediction ID and gallery ID for polling.
     */
    static async animateShot(params: {
        sequence: number
        imageUrl: string
        animationPrompt: string
        model?: AnimationModel
        duration?: number
    }): Promise<{ predictionId: string; galleryId: string }> {
        const {
            imageUrl,
            animationPrompt,
            model = 'seedance-lite',
            duration = 5,
        } = params

        const response = await fetch('/api/generation/video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: animationPrompt,
                image: imageUrl,
                modelSettings: {
                    duration,
                    aspectRatio: '16:9',
                },
                extraMetadata: {
                    source: 'storyboard-animation',
                    shotSequence: params.sequence,
                    animationPrompt,
                },
            }),
        })

        if (!response.ok) {
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Video generation failed (HTTP ${response.status})`)
            }
            throw new Error(`Video generation failed (HTTP ${response.status})`)
        }

        const data = await response.json()
        return {
            predictionId: data.predictionId,
            galleryId: data.galleryId,
        }
    }
}
