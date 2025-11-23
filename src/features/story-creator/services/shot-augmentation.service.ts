/**
 * Shot Augmentation Service
 * Generates additional shots using bracket syntax for bulk variations
 */

import type { ExtractedEntity } from '../types/story.types'

export interface ShotTemplate {
    type: 'establishing' | 'close-up' | 'action' | 'reaction' | 'dialogue'
    template: string
    variations: string[]
}

/**
 * Shot templates with bracket syntax for bulk generation
 * Each template uses brackets to create multiple variations
 */
const SHOT_TEMPLATES: Record<ShotTemplate['type'], ShotTemplate> = {
    establishing: {
        type: 'establishing',
        template: '{entity} in {location}, [wide shot, establishing shot, aerial view, panoramic view], showing the environment',
        variations: ['wide shot', 'establishing shot', 'aerial view', 'panoramic view']
    },
    'close-up': {
        type: 'close-up',
        template: '{entity} in {location}, close-up [facial expression, eyes, hands, detailed features], [happy, sad, angry, determined, confused, excited]',
        variations: ['facial expression + emotion combinations']
    },
    action: {
        type: 'action',
        template: '{entity} in {location}, [walking, running, fighting, searching, investigating], dynamic movement',
        variations: ['walking', 'running', 'fighting', 'searching', 'investigating']
    },
    reaction: {
        type: 'reaction',
        template: '{entity} in {location}, reacting to [surprising news, danger, victory, betrayal, revelation], [shocked, scared, relieved, angry, amazed] expression',
        variations: ['event + emotion combinations']
    },
    dialogue: {
        type: 'dialogue',
        template: '{entity} in {location}, [speaking intensely, listening carefully, arguing passionately, explaining calmly], shot/reverse shot composition',
        variations: ['speaking intensely', 'listening carefully', 'arguing passionately', 'explaining calmly']
    }
}

/**
 * Emotion brackets for various shot types
 * Currently unused but kept for future enhancements
 */
const _EMOTION_BRACKETS = {
    positive: '[happy, excited, relieved, triumphant, joyful]',
    negative: '[sad, angry, frustrated, defeated, heartbroken]',
    neutral: '[confused, thoughtful, determined, focused, curious]',
    intense: '[terrified, enraged, desperate, overwhelmed, shocked]'
}

/**
 * Action brackets for different contexts
 * Currently unused but kept for future enhancements
 */
const _ACTION_BRACKETS = {
    movement: '[walking, running, climbing, jumping, crawling]',
    combat: '[fighting, dodging, blocking, attacking, defending]',
    investigation: '[searching, examining, discovering, investigating, analyzing]',
    interaction: '[talking, listening, gesturing, embracing, confronting]'
}

export interface AugmentationRequest {
    characters: ExtractedEntity[]
    locations: ExtractedEntity[]
    shotTypes: ShotTemplate['type'][]
    count: number
    chapter?: string
    mood?: 'action' | 'dramatic' | 'suspenseful' | 'lighthearted'
}

export interface GeneratedShot {
    prompt: string
    referenceTags: string[]
    sequenceNumber: number
    chapter?: string
    metadata: {
        augmentationType: ShotTemplate['type']
        generatedAt: string
    }
}

export class ShotAugmentationService {
    /**
     * Generate additional shots with bracket syntax for bulk variations
     */
    static generateShots(request: AugmentationRequest, startingSequence: number): GeneratedShot[] {
        const shots: GeneratedShot[] = []
        let currentSequence = startingSequence

        // For each combination of character + location
        request.characters.forEach((character) => {
            request.locations.forEach((location) => {
                // Generate shots of each requested type
                request.shotTypes.forEach((shotType) => {
                    const template = SHOT_TEMPLATES[shotType]
                    const prompt = this.buildPromptFromTemplate(
                        template,
                        character,
                        location,
                        request.mood
                    )

                    shots.push({
                        prompt,
                        referenceTags: [`@${character.tag}`, `@${location.tag}`],
                        sequenceNumber: currentSequence++,
                        chapter: request.chapter,
                        metadata: {
                            augmentationType: shotType,
                            generatedAt: new Date().toISOString()
                        }
                    })

                    // Stop if we've reached requested count
                    if (shots.length >= request.count) {
                        return
                    }
                })

                if (shots.length >= request.count) return
            })

            if (shots.length >= request.count) return
        })

        return shots.slice(0, request.count)
    }

    /**
     * Build a prompt from template with bracket variations
     */
    private static buildPromptFromTemplate(
        template: ShotTemplate,
        character: ExtractedEntity,
        location: ExtractedEntity,
        mood?: string
    ): string {
        let prompt = template.template
            .replace('{entity}', `@${character.tag}`)
            .replace('{location}', `@${location.tag}`)

        // Add character description context
        if (character.description) {
            prompt = `${prompt}, ${character.description}`
        }

        // Add mood-specific modifiers
        if (mood) {
            const moodModifiers: Record<string, string> = {
                action: ', fast-paced, energetic lighting',
                dramatic: ', dramatic lighting, intense atmosphere',
                suspenseful: ', moody lighting, tense atmosphere',
                lighthearted: ', bright lighting, cheerful atmosphere'
            }
            prompt += moodModifiers[mood] || ''
        }

        return prompt
    }

    /**
     * Generate quick single-character shots with bracket variations
     */
    static generateQuickShots(
        character: ExtractedEntity,
        location: ExtractedEntity,
        count: number,
        startingSequence: number
    ): GeneratedShot[] {
        // Mix of shot types for variety
        const shotTypes: ShotTemplate['type'][] = ['establishing', 'close-up', 'action', 'reaction']
        const shots: GeneratedShot[] = []

        for (let i = 0; i < count; i++) {
            const shotType = shotTypes[i % shotTypes.length]
            const template = SHOT_TEMPLATES[shotType]
            const prompt = this.buildPromptFromTemplate(template, character, location)

            shots.push({
                prompt,
                referenceTags: [`@${character.tag}`, `@${location.tag}`],
                sequenceNumber: startingSequence + i,
                metadata: {
                    augmentationType: shotType,
                    generatedAt: new Date().toISOString()
                }
            })
        }

        return shots
    }

    /**
     * Get estimated image count from bracket prompts
     */
    static getEstimatedImageCount(shots: GeneratedShot[]): number {
        return shots.reduce((total, shot) => {
            // Count bracket variations
            const bracketMatches = shot.prompt.match(/\[([^\[\]]+)\]/g)
            if (!bracketMatches) return total + 1

            let variations = 1
            bracketMatches.forEach((bracket) => {
                const options = bracket.slice(1, -1).split(',').map(s => s.trim()).filter(s => s)
                variations *= options.length
            })

            return total + variations
        }, 0)
    }

    /**
     * Get available shot types with descriptions
     */
    static getAvailableShotTypes(): Array<{ type: ShotTemplate['type']; description: string; variationCount: number }> {
        return [
            {
                type: 'establishing',
                description: 'Wide shot showing the environment and setting',
                variationCount: 4
            },
            {
                type: 'close-up',
                description: 'Detailed shot of face, hands, or features',
                variationCount: 30 // 5 features × 6 emotions
            },
            {
                type: 'action',
                description: 'Dynamic movement and activity',
                variationCount: 5
            },
            {
                type: 'reaction',
                description: 'Character responding to events',
                variationCount: 25 // 5 events × 5 emotions
            },
            {
                type: 'dialogue',
                description: 'Conversation and interaction',
                variationCount: 4
            }
        ]
    }
}
