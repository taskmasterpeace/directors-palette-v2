/**
 * Shot Prompt Service
 * Orchestrates AI-based shot prompt generation from story segments
 */

import { createOpenRouterService } from './openrouter.service'
import type {
    ShotBreakdownSegment,
    StyleGuide,
    StoryboardCharacter,
    StoryboardLocation,
    GeneratedShotPrompt,
    ShotType
} from '../types/storyboard.types'

export interface ShotPromptGenerationConfig {
    apiKey: string
    model: string
    segments: ShotBreakdownSegment[]
    storyText: string
    styleGuide?: StyleGuide
    characters: StoryboardCharacter[]
    locations: StoryboardLocation[]
}

export interface ShotPromptGenerationResult {
    success: boolean
    prompts: GeneratedShotPrompt[]
    error?: string
}

export class ShotPromptService {
    /**
     * Generate shot prompts for all segments
     */
    async generatePrompts(config: ShotPromptGenerationConfig): Promise<ShotPromptGenerationResult> {
        try {
            // Create OpenRouter service
            const openRouterService = createOpenRouterService(config.apiKey, config.model)

            // Build character descriptions map with @name format
            // Convert "Marcus Jones" to "@marcus_jones"
            // Include ALL characters (not just those with reference images) so the LLM
            // knows about every person in the story and can tag them in shots
            const characterDescriptions: Record<string, string> = {}
            for (const char of config.characters) {
                const atName = this.formatCharacterName(char.name)
                characterDescriptions[atName] = char.description || ''
            }

            // Prepare segments for API call
            const segmentInputs = config.segments.map(s => ({
                text: s.text,
                sequence: s.sequence
            }))

            // Call OpenRouter to generate prompts
            const generatedPrompts = await openRouterService.generateShotPrompts(
                segmentInputs,
                config.styleGuide?.style_prompt,
                characterDescriptions,
                config.storyText
            )

            // Enrich prompts with character refs and location detection
            const enrichedPrompts: GeneratedShotPrompt[] = generatedPrompts.map(gp => {
                const segment = config.segments.find(s => s.sequence === gp.sequence)

                return {
                    sequence: gp.sequence,
                    originalText: segment?.text || '',
                    prompt: gp.prompt,
                    shotType: this.normalizeShotType(gp.shotType),
                    characterRefs: this.findCharacterRefs(gp.prompt, segment?.text || '', config.characters),
                    locationRef: this.findLocationRef(gp.prompt, segment?.text || '', config.locations),
                    edited: false
                }
            })

            // Sort by sequence
            enrichedPrompts.sort((a, b) => a.sequence - b.sequence)

            return {
                success: true,
                prompts: enrichedPrompts
            }
        } catch (error) {
            return {
                success: false,
                prompts: [],
                error: error instanceof Error ? error.message : 'Failed to generate prompts'
            }
        }
    }

    /**
     * Format character name to @name format
     * "Marcus Jones" → "@marcus_jones"
     */
    private formatCharacterName(name: string): string {
        return '@' + name.toLowerCase().replace(/\s+/g, '_')
    }

    /**
     * Normalize shot type string to ShotType enum
     */
    private normalizeShotType(type: string): ShotType {
        const normalized = type.toLowerCase().replace(/[^a-z-]/g, '')

        const validTypes: ShotType[] = ['establishing', 'wide', 'medium', 'close-up', 'detail']

        if (validTypes.includes(normalized as ShotType)) {
            return normalized as ShotType
        }

        // Handle variations
        if (normalized.includes('establish')) return 'establishing'
        if (normalized.includes('wide') || normalized.includes('long')) return 'wide'
        if (normalized.includes('medium') || normalized.includes('mid')) return 'medium'
        if (normalized.includes('close') || normalized.includes('tight')) return 'close-up'
        if (normalized.includes('detail') || normalized.includes('macro') || normalized.includes('insert')) return 'detail'

        return 'unknown'
    }

    /**
     * Find characters mentioned in the prompt or original text
     * Looks for both regular names and @name format
     */
    private findCharacterRefs(
        prompt: string,
        originalText: string,
        characters: StoryboardCharacter[]
    ): StoryboardCharacter[] {
        const refs: StoryboardCharacter[] = []
        const combinedText = `${prompt} ${originalText}`.toLowerCase()

        for (const char of characters) {
            // Check if character name appears in text (original format)
            const nameLower = char.name.toLowerCase()
            // Also check @name format
            const atName = this.formatCharacterName(char.name)

            if (combinedText.includes(nameLower) || combinedText.includes(atName)) {
                refs.push(char)
            }
        }

        return refs
    }

    /**
     * Find location mentioned in the prompt or original text
     */
    private findLocationRef(
        prompt: string,
        originalText: string,
        locations: StoryboardLocation[]
    ): StoryboardLocation | undefined {
        const combinedText = `${prompt} ${originalText}`.toLowerCase()

        for (const loc of locations) {
            // Only include locations with reference images
            if (!loc.has_reference) continue

            // Check if location name or tag appears
            const nameLower = loc.name.toLowerCase()
            const tagLower = loc.tag.toLowerCase().replace('@', '')

            if (combinedText.includes(nameLower) || combinedText.includes(tagLower)) {
                return loc
            }
        }

        return undefined
    }
}

export const shotPromptService = new ShotPromptService()
