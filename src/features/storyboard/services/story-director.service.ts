import { StoryboardShot, GeneratedShotPrompt, DirectorPitch } from '../types/storyboard.types'
import { DirectorFingerprint } from '@/features/music-lab/types/director.types'

/**
 * Story Director Service
 * 
 * Manages the application of Director Persona styles to Storyboard shots.
 * Functions as the "Commissioning" engine for the Storyboard module.
 */
export class StoryDirectorService {

    /**
     * Rewrite a shot's prompt to match the Director's visual signature
     */
    static applyDirectorToShot(
        shot: StoryboardShot,
        director: DirectorFingerprint
    ): StoryboardShot {
        const enhancedPrompt = this.enhancePrompt(shot.prompt, director)

        return {
            ...shot,
            director_id: director.id,
            prompt: enhancedPrompt,
            metadata: {
                ...shot.metadata,
                edited: true, // Mark as edited so it regenerates
                // Store original prompt in case of revert?
                // metadata in types has originalPromptWithWildcards, we can use that or add field.
                // For now, prompt is overwritten.
            }
        }
    }

    /**
     * Batch process a list of shots
     */
    static applyDirectorToShots(
        shots: StoryboardShot[],
        director: DirectorFingerprint
    ): StoryboardShot[] {
        return shots.map(shot => this.applyDirectorToShot(shot, director))
    }

    /**
     * Batch process generated prompts (UI state)
     */
    static enhanceGeneratedPrompts(
        prompts: GeneratedShotPrompt[],
        director: DirectorFingerprint
    ): GeneratedShotPrompt[] {
        return prompts.map(p => {
            const newPrompt = this.enhancePrompt(p.prompt, director)
            return {
                ...p,
                prompt: newPrompt,
                edited: true,
                metadata: {
                    ...p.metadata,
                    directorId: director.id,
                    rating: 0, // Reset rating on new commission
                    isGreenlit: false
                }
            }
        })
    }

    /**
     * Construct the prompt modifiers based on Director DNA
     * Translates director fingerprint into actual VISUAL language (not credits or descriptions)
     */
    private static enhancePrompt(basePrompt: string, director: DirectorFingerprint): string {
        const visualModifiers: string[] = []

        // 1. Camera/Framing (from cameraPhilosophy)
        const framing = director.cameraPhilosophy.framingInstinct
        if (framing.length > 0) {
            // Convert framing instincts to visual terms
            const framingTerms = framing.map(f => {
                switch (f) {
                    case 'intimacy': return 'intimate close framing'
                    case 'presence': return 'subject presence emphasized'
                    case 'compressed': return 'compressed perspective'
                    case 'symmetrical': return 'symmetrical composition'
                    case 'distance': return 'observational distance'
                    case 'centered': return 'centered framing'
                    case 'geometric': return 'geometric composition'
                    case 'heroic': return 'heroic low angle'
                    case 'extreme': return 'extreme framing'
                    default: return f + ' framing'
                }
            })
            visualModifiers.push(framingTerms[0]) // Use primary framing
        }

        // 2. Distance/Shot Size (from distanceBias)
        const distance = director.cameraPhilosophy.distanceBias
        if (distance) {
            switch (distance) {
                case 'intimate': visualModifiers.push('close-up shot'); break
                case 'mid-range': visualModifiers.push('medium shot'); break
                case 'detached': visualModifiers.push('medium-wide shot'); break
                case 'wide': visualModifiers.push('wide shot'); break
                case 'extreme': visualModifiers.push('extreme wide or extreme close'); break
            }
        }

        // 3. Emotional Tone (from emotionalLanguage - translate to visual mood)
        const emotions = director.emotionalLanguage.preferredEmotionalStates
        if (emotions && emotions.length > 0) {
            // Pick most relevant emotion and make it visual
            const primaryEmotion = emotions[0]
            visualModifiers.push(`evoking ${primaryEmotion}`)
        }

        // 4. Lighting/Atmosphere (from emotionalTemperature)
        const temp = director.coreIntent.emotionalTemperature
        if (temp === 'warm') {
            visualModifiers.push('warm golden lighting')
        } else if (temp === 'cool') {
            visualModifiers.push('cool desaturated tones')
        } else if (temp === 'neutral') {
            visualModifiers.push('neutral balanced lighting')
        } else if (temp === 'warm_but_distant') {
            visualModifiers.push('warm but detached lighting')
        } else if (temp === 'electric') {
            visualModifiers.push('high contrast dramatic lighting')
        }

        // 5. Movement/Stillness hint (affects composition feeling)
        const movement = director.cameraPhilosophy.stillnessVsMovement
        if (movement === 'stillness-dominant') {
            visualModifiers.push('static composed frame')
        } else if (movement === 'movement-dominant') {
            visualModifiers.push('dynamic energy')
        }

        // 6. POV hint (subjective vs objective affects framing)
        const pov = director.cameraPhilosophy.pointOfViewBias
        if (pov === 'subjective') {
            visualModifiers.push('subjective intimate perspective')
        } else if (pov === 'objective') {
            visualModifiers.push('observational detached perspective')
        } else if (pov === 'heroic') {
            visualModifiers.push('heroic empowering angle')
        }

        // Build final prompt - only add visual modifiers, no fluff
        if (visualModifiers.length === 0) {
            return basePrompt
        }

        // Check if already enhanced
        if (visualModifiers.some(mod => basePrompt.toLowerCase().includes(mod.toLowerCase()))) {
            return basePrompt
        }

        return `${basePrompt}, ${visualModifiers.join(', ')}`
    }

    /**
     * Generate a full Director Pitch/Treatment
     */
    static generateDirectorPitch(prompts: GeneratedShotPrompt[], director: DirectorFingerprint): DirectorPitch {
        return {
            id: crypto.randomUUID(),
            directorId: director.id,
            directorName: director.name,
            visualStyle: this.getDirectorStyleString(director),
            colorPalette: [], // Placeholder
            pacing: director.rhythmAndPacing?.baselinePacing === 'frantic' || director.rhythmAndPacing?.baselinePacing === 'snappy' ? "Fast-paced" : "Measured",
            exampleEnhancement: {
                original: prompts[0]?.prompt || "Original prompt",
                enhanced: this.enhancePrompt(prompts[0]?.prompt || "Original prompt", director)
            }
        }
    }

    private static getDirectorStyleString(director: DirectorFingerprint): string {
        const elements: string[] = []

        // Framing approach
        if (director.cameraPhilosophy.framingInstinct.length > 0) {
            elements.push(director.cameraPhilosophy.framingInstinct.slice(0, 2).join(' + ') + ' framing')
        }

        // Emotional tone
        if (director.emotionalLanguage.preferredEmotionalStates.length > 0) {
            elements.push(director.emotionalLanguage.preferredEmotionalStates[0])
        }

        // Lighting
        const temp = director.coreIntent.emotionalTemperature
        if (temp === 'warm') elements.push('warm lighting')
        else if (temp === 'cool') elements.push('cool tones')
        else if (temp === 'electric') elements.push('high contrast')

        return elements.join(', ')
    }
}
