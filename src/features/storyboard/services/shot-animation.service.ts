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

export type AnimationModel = 'seedance-lite' | 'seedance-pro' | 'p-video'

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
 * Dynamic action verbs (character does something visible on screen).
 * Ordered by visual impact — search prefers the first match,
 * so high-motion verbs come first.
 */
const DYNAMIC_ACTION_VERBS = [
    'storms', 'runs', 'fights', 'dances', 'jumps', 'falls', 'climbs',
    'flies', 'swims', 'crawls', 'drives', 'rides', 'throws', 'catches',
    'walks', 'enters', 'exits', 'leaves', 'arrives', 'turns', 'steps',
    'moves', 'pushes', 'pulls', 'lifts', 'carries', 'grabs', 'reaches',
    'opens', 'closes', 'drops', 'embraces', 'kisses', 'kneels',
    'screams', 'whispers', 'cries', 'laughs', 'points', 'waves',
    'nods', 'shakes', 'trembles', 'shivers', 'rises',
]

/**
 * Static/ambient verbs — used as fallback when no dynamic verb found.
 * These describe posture or gaze rather than visible movement.
 */
const STATIC_VERBS = [
    'stands', 'sits', 'looks', 'stares', 'gazes', 'watches', 'waits',
    'holds', 'smiles', 'frowns',
]

export class ShotAnimationService {
    /**
     * Build animation prompt from story context + director motion style.
     *
     * Output format: "[Camera move] as [subject action]"
     * Camera-first ordering — video models interpret prompts front-to-back,
     * so the camera instruction needs to lead.
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

        // Camera-first: "Slow push-in as she walks through the door"
        const cameraSentence = cameraMove.charAt(0).toUpperCase() + cameraMove.slice(1)
        return `${cameraSentence} as ${storyAction.toLowerCase()}`
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
     * Find the first verb from a list that appears as a whole word in the text.
     * Uses word-boundary matching to avoid false positives like
     * "stands" matching "understands" or "holds" matching "household".
     */
    private static findVerbInText(text: string, verbs: string[]): string | null {
        const textLower = text.toLowerCase()
        for (const verb of verbs) {
            const pattern = new RegExp(`\\b${verb}\\b`, 'i')
            if (pattern.test(textLower)) {
                return verb
            }
        }
        return null
    }

    /**
     * Extract action/motion from story text.
     * Prefers dynamic action verbs (walks, runs, storms) over static ones (stands, sits).
     * Uses word-boundary matching to avoid false positives.
     */
    static extractStoryAction(originalText: string, shotPrompt: string): string {
        // Extract a subject hint from the shot prompt (first noun phrase, roughly)
        const subjectMatch = shotPrompt.match(/^([^,]+)/)
        const subject = subjectMatch
            ? subjectMatch[1].slice(0, 60).trim()
            : 'subject'

        // Prefer dynamic verbs, fall back to static
        const primaryVerb =
            this.findVerbInText(originalText, DYNAMIC_ACTION_VERBS) ||
            this.findVerbInText(originalText, STATIC_VERBS)

        if (primaryVerb) {
            // Find the sentence containing the verb for more context
            const sentences = originalText.split(/[.!?]+/).filter(s => s.trim())
            const verbPattern = new RegExp(`\\b${primaryVerb}\\b`, 'i')
            const actionSentence = sentences.find(s => verbPattern.test(s))

            if (actionSentence) {
                const cleaned = actionSentence.trim()
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
                    resolution: '720p',
                    fps: 24,
                    cameraFixed: false,
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
