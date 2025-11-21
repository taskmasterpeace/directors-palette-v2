/**
 * Prompt Generator Service
 * Generates image prompts with @reference tags from story text
 */

import type { ExtractedEntity } from '../types/story.types'

export class PromptGeneratorService {
    /**
     * Generate a shot prompt with @reference tags
     */
    static generatePrompt(
        sceneText: string,
        entities: ExtractedEntity[],
        style?: string
    ): { prompt: string; referenceTags: string[] } {
        // Extract entity names from the scene text
        const mentionedEntities = entities.filter(entity =>
            sceneText.toLowerCase().includes(entity.name.toLowerCase())
        )

        // Build the reference tags
        const referenceTags = mentionedEntities.map(e => `@${e.tag}`)

        // Build the prompt with @tags
        let prompt = sceneText

        // Replace entity names with @tags in the prompt
        mentionedEntities.forEach(entity => {
            const regex = new RegExp(`\\b${entity.name}\\b`, 'gi')
            prompt = prompt.replace(regex, `@${entity.tag}`)
        })

        // Add style if provided
        if (style) {
            prompt = `${prompt}, ${style}`
        }

        return {
            prompt: prompt.trim(),
            referenceTags
        }
    }

    /**
     * Extract scene descriptions from story text
     * Simple sentence-based splitting (can be enhanced with AI)
     */
    static extractScenes(storyText: string, chapter?: string): Array<{
        sequence: number
        chapter?: string
        text: string
    }> {
        // Split by sentences (simple approach)
        const sentences = storyText
            .split(/[.!?]+/)
            .map(s => s.trim())
            .filter(s => s.length > 10) // Filter out very short sentences

        return sentences.map((text, index) => ({
            sequence: index + 1,
            chapter,
            text
        }))
    }

    /**
     * Detect characters in text (basic keyword matching)
     */
    static extractCharacters(text: string): Array<{ name: string; tag: string }> {
        // This is a simple implementation. In production, this would use AI.

        // Extract capitalized words that might be names
        const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []

        // Filter common words that aren't names
        const commonWords = ['The', 'A', 'An', 'In', 'On', 'At', 'To', 'From', 'With', 'By']
        const potentialNames = words.filter(w => !commonWords.includes(w))

        // Create unique list
        const uniqueNames = Array.from(new Set(potentialNames))

        return uniqueNames.map(name => ({
            name,
            tag: name.toLowerCase().replace(/\s+/g, '_')
        }))
    }

    /**
     * Detect locations in text (basic keyword matching)
     */
    static extractLocations(text: string): Array<{ name: string; tag: string }> {
        // This is a simple implementation. In production, this would use AI.
        const locationKeywords = [
            'home', 'house', 'apartment', 'room', 'bedroom', 'kitchen',
            'office', 'building', 'street', 'city', 'town',
            'park', 'beach', 'forest', 'mountain',
            'restaurant', 'cafe', 'bar', 'club',
            'school', 'hospital', 'church', 'store',
            'courtroom', 'station', 'airport'
        ]

        const locations: Array<{ name: string; tag: string }> = []

        locationKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
            const matches = text.match(regex)
            if (matches) {
                locations.push({
                    name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
                    tag: keyword.toLowerCase()
                })
            }
        })

        // Remove duplicates
        const uniqueLocations = locations.filter((loc, index, self) =>
            index === self.findIndex(l => l.tag === loc.tag)
        )

        return uniqueLocations
    }

    /**
     * Normalize tag for consistency
     */
    static normalizeTag(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-_]/g, '') // Remove special chars
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_+/g, '_') // Remove duplicate underscores
            .replace(/^_|_$/g, '') // Trim underscores from ends
    }

    /**
     * Suggest shot grouping using brackets
     * Groups shots that have same location and character but different actions
     */
    static suggestGrouping(shots: Array<{
        id: string
        prompt: string
        reference_tags: string[]
    }>) {
        const suggestions: Array<{
            shotIds: string[]
            mergedPrompt: string
            reason: string
            confidence: number
        }> = []

        // Group shots with same reference tags
        for (let i = 0; i < shots.length - 1; i++) {
            const current = shots[i]
            const similar: typeof shots = [current]

            // Look ahead for similar shots
            for (let j = i + 1; j < Math.min(i + 5, shots.length); j++) {
                const next = shots[j]

                // Check if tags are identical
                const tagsMatch = JSON.stringify(current.reference_tags.sort()) ===
                    JSON.stringify(next.reference_tags.sort())

                if (tagsMatch) {
                    similar.push(next)
                } else {
                    break // Stop looking ahead if tags don't match
                }
            }

            // If we found 2+ similar shots, suggest grouping
            if (similar.length >= 2) {
                // Extract the common part and variations
                const prompts = similar.map(s => s.prompt)
                const commonTags = current.reference_tags.join(' ')

                // Build bracket syntax
                const variations = prompts.map(p => {
                    // Remove the common tags to get just the action/variation
                    let variation = p
                    current.reference_tags.forEach(tag => {
                        variation = variation.replace(tag, '').trim()
                    })
                    return variation
                }).join(', ')

                const mergedPrompt = `${commonTags} [${variations}]`

                suggestions.push({
                    shotIds: similar.map(s => s.id),
                    mergedPrompt,
                    reason: `${similar.length} shots with same location/character can be merged`,
                    confidence: similar.length >= 3 ? 0.9 : 0.7
                })

                // Skip ahead past this group
                i += similar.length - 1
            }
        }

        return suggestions
    }
}
