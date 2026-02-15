import { StoryboardShot, GeneratedShotPrompt, DirectorPitch } from '../types/storyboard.types'
import type { ShotType } from '../types/storyboard.types'
import { DirectorFingerprint } from '@/features/music-lab/types/director.types'
import { EquipmentTranslationService } from './equipment-translation.service'
import type { ModelId } from '@/config'

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
        director: DirectorFingerprint,
        modelId?: ModelId
    ): StoryboardShot {
        const enhancedPrompt = this.enhancePrompt(shot.prompt, director, undefined, modelId)

        return {
            ...shot,
            director_id: director.id,
            prompt: enhancedPrompt,
            metadata: {
                ...shot.metadata,
                edited: true,
            }
        }
    }

    /**
     * Batch process a list of shots
     */
    static applyDirectorToShots(
        shots: StoryboardShot[],
        director: DirectorFingerprint,
        modelId?: ModelId
    ): StoryboardShot[] {
        return shots.map(shot => this.applyDirectorToShot(shot, director, modelId))
    }

    /**
     * Batch process generated prompts (UI state)
     */
    static enhanceGeneratedPrompts(
        prompts: GeneratedShotPrompt[],
        director: DirectorFingerprint,
        modelId?: ModelId
    ): GeneratedShotPrompt[] {
        return prompts.map(p => {
            const newPrompt = this.enhancePrompt(p.prompt, director, p.shotType, modelId)
            return {
                ...p,
                prompt: newPrompt,
                edited: true,
                metadata: {
                    ...p.metadata,
                    directorId: director.id,
                    rating: 0,
                    isGreenlit: false
                }
            }
        })
    }

    /**
     * Construct the prompt modifiers based on Director DNA
     * Translates director fingerprint into actual VISUAL language (not credits or descriptions)
     *
     * Now uses MORE fingerprint fields for richer enhancement:
     * - cameraPhilosophy (existing)
     * - emotionalLanguage (existing)
     * - coreIntent (existing)
     * - spectacleProfile (NEW)
     * - actorDirection (NEW)
     * - visualDecisionBiases (NEW)
     * - rhythmAndPacing (NEW - for pacing hints)
     */
    private static enhancePrompt(
        basePrompt: string,
        director: DirectorFingerprint,
        shotType?: ShotType,
        modelId?: ModelId
    ): string {
        const visualModifiers: string[] = []

        // Camera foundation from director's camera rig
        let cameraFoundation = ''
        if (director.cameraRig && director.cameraRig.setups.length > 0) {
            const setup = EquipmentTranslationService.findSetup(
                director.cameraRig.setups,
                shotType
            )
            if (setup) {
                const effectiveModelId = modelId || 'nano-banana-pro' as ModelId
                cameraFoundation = EquipmentTranslationService.buildCameraFoundation(
                    setup,
                    effectiveModelId,
                    director.cameraRig.defaultMedium
                )
            }
        }

        // 1. Camera/Framing (from cameraPhilosophy)
        const framing = director.cameraPhilosophy.framingInstinct
        if (framing.length > 0) {
            const framingTerms = framing.map(f => {
                switch (f) {
                    case 'intimacy': return 'intimate close framing'
                    case 'presence': return 'subject presence emphasized'
                    case 'compressed': return 'compressed perspective'
                    case 'symmetrical': return 'symmetrical composition'
                    case 'symmetry': return 'symmetrical composition'
                    case 'distance': return 'observational distance'
                    case 'centered': return 'centered framing'
                    case 'center-framed': return 'centered framing'
                    case 'geometric': return 'geometric composition'
                    case 'heroic': return 'heroic low angle'
                    case 'extreme': return 'extreme framing'
                    case 'tableaux': return 'tableau composition'
                    case 'distortion': return 'lens distortion'
                    case 'fisheye': return 'fisheye lens distortion'
                    case 'low-angle': return 'low angle heroic shot'
                    case 'eye-level engagement': return 'eye-level intimate shot'
                    default: return f + ' framing'
                }
            })
            visualModifiers.push(framingTerms[0])
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

        // 3. Emotional Tone (from emotionalLanguage)
        const emotions = director.emotionalLanguage.preferredEmotionalStates
        if (emotions && emotions.length > 0) {
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

        // 5. Movement/Stillness hint
        const movement = director.cameraPhilosophy.stillnessVsMovement
        if (movement === 'stillness-dominant') {
            visualModifiers.push('static composed frame')
        } else if (movement === 'movement-dominant') {
            visualModifiers.push('dynamic energy')
        } else if (movement === 'static-or-tracking') {
            visualModifiers.push('precise controlled movement')
        }

        // 6. POV hint
        const pov = director.cameraPhilosophy.pointOfViewBias
        if (pov === 'subjective') {
            visualModifiers.push('subjective intimate perspective')
        } else if (pov === 'objective') {
            visualModifiers.push('observational detached perspective')
        } else if (pov === 'heroic') {
            visualModifiers.push('heroic empowering angle')
        } else if (pov === 'observational') {
            visualModifiers.push('documentary-style observation')
        }

        // 7. NEW: Spectacle Profile - VFX and visual style hints
        if (director.spectacleProfile) {
            const vfx = director.spectacleProfile.vfxTolerance
            if (vfx === 'maximum' || vfx === 'stylized') {
                visualModifiers.push('stylized visual effects')
            } else if (vfx === 'none' || vfx === 'subtle') {
                visualModifiers.push('grounded naturalistic look')
            }

            const surreal = director.spectacleProfile.surrealTendency
            if (surreal === 'dreamlike' || surreal === 'surreal' || surreal === 'high') {
                visualModifiers.push('dreamlike surreal quality')
            } else if (surreal === 'stylized') {
                visualModifiers.push('heightened stylized reality')
            }

            // Add a signature moment hint if available
            if (director.spectacleProfile.signatureMoments?.length > 0) {
                const signature = director.spectacleProfile.signatureMoments[0]
                if (signature.includes('symmetr')) {
                    visualModifiers.push('perfectly symmetrical')
                } else if (signature.includes('slow') || signature.includes('slo-mo')) {
                    visualModifiers.push('slow-motion quality')
                } else if (signature.includes('fisheye')) {
                    visualModifiers.push('fisheye distortion')
                }
            }
        }

        // 8. NEW: Actor Direction - performance style hints
        if (director.actorDirection) {
            const delivery = director.actorDirection.lineDeliveryBias
            if (delivery === 'stylized') {
                visualModifiers.push('stylized theatrical presence')
            } else if (delivery === 'flat') {
                visualModifiers.push('deadpan understated expression')
            } else if (delivery === 'energetic') {
                visualModifiers.push('energetic dynamic presence')
            }

            const mode = director.actorDirection.directionMode
            if (mode === 'choreographed') {
                visualModifiers.push('precisely choreographed positioning')
            } else if (mode === 'performance_focused') {
                visualModifiers.push('performance-driven energy')
            }
        }

        // 9. NEW: Visual Decision Biases - composition complexity
        if (director.visualDecisionBiases) {
            const complexity = director.visualDecisionBiases.complexityPreference
            if (complexity === 'minimal') {
                visualModifiers.push('minimal sparse composition')
            } else if (complexity === 'dense' || complexity === 'layered') {
                visualModifiers.push('layered detailed composition')
            } else if (complexity === 'curated') {
                visualModifiers.push('meticulously curated details')
            } else if (complexity === 'high-contrast') {
                visualModifiers.push('bold high-contrast composition')
            }

            const iconic = director.visualDecisionBiases.iconicFrameTendency
            if (iconic === 'constant' || iconic === 'always') {
                visualModifiers.push('poster-worthy iconic framing')
            }
        }

        // 10. NEW: Rhythm hints for pacing feel
        if (director.rhythmAndPacing) {
            const pacing = director.rhythmAndPacing.baselinePacing
            if (pacing === 'frantic') {
                visualModifiers.push('frenetic energy')
            } else if (pacing === 'snappy') {
                visualModifiers.push('punchy dynamic feel')
            } else if (pacing === 'measured') {
                visualModifiers.push('contemplative measured mood')
            }
        }

        // Build final prompt with camera foundation prepended
        const parts: string[] = []

        // Prepend camera foundation before base prompt
        if (cameraFoundation) {
            parts.push(cameraFoundation)
        }

        parts.push(basePrompt)

        // Check if already enhanced (avoid double-enhancing)
        if (visualModifiers.length > 0 && !visualModifiers.some(mod => basePrompt.toLowerCase().includes(mod.toLowerCase()))) {
            parts.push(visualModifiers.join(', '))
        }

        return parts.join(', ')
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
                enhanced: this.enhancePrompt(prompts[0]?.prompt || "Original prompt", director, prompts[0]?.shotType)
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
