/**
 * Entity Coverage Service
 * Analyzes which entities are used in shots and provides coverage statistics
 */

import type { ExtractedEntity } from '../types/story.types'
import type { StoryShot } from '../types/story.types'

export interface EntityCoverage {
    entityTag: string
    entityName: string
    entityType: 'character' | 'location' | 'prop'
    shotCount: number
    firstAppearance: number | null // First shot sequence number
    lastAppearance: number | null // Last shot sequence number
    hasReferenceImage: boolean
    shotNumbers: number[]
}

export interface CoverageSummary {
    totalEntities: number
    usedEntities: number
    unusedEntities: number
    entitiesWithReferences: number
    entitiesWithoutReferences: number
    coveragePercentage: number
}

export class EntityCoverageService {
    /**
     * Analyze entity usage across all shots
     */
    static analyzeEntityCoverage(
        entities: ExtractedEntity[],
        shots: StoryShot[],
        galleryImages: Array<{ reference?: string }>
    ): EntityCoverage[] {
        const assignedTags = new Set(
            galleryImages
                .filter(img => img.reference)
                .map(img => img.reference!.toLowerCase())
        )

        return entities.map(entity => {
            const normalizedTag = `@${entity.tag}`.toLowerCase()
            const shotNumbers: number[] = []

            // Find all shots that reference this entity
            shots.forEach(shot => {
                const tagMatches = shot.prompt.match(/@[a-z0-9_]+/gi) || []
                const promptTags = tagMatches.map(t => t.toLowerCase())

                if (promptTags.includes(normalizedTag)) {
                    shotNumbers.push(shot.sequence_number)
                }
            })

            shotNumbers.sort((a, b) => a - b)

            return {
                entityTag: entity.tag,
                entityName: entity.name,
                entityType: entity.type,
                shotCount: shotNumbers.length,
                firstAppearance: shotNumbers.length > 0 ? shotNumbers[0] : null,
                lastAppearance: shotNumbers.length > 0 ? shotNumbers[shotNumbers.length - 1] : null,
                hasReferenceImage: assignedTags.has(normalizedTag),
                shotNumbers
            }
        })
    }

    /**
     * Get coverage summary statistics
     */
    static getCoverageSummary(coverageData: EntityCoverage[]): CoverageSummary {
        const totalEntities = coverageData.length
        const usedEntities = coverageData.filter(e => e.shotCount > 0).length
        const unusedEntities = totalEntities - usedEntities
        const entitiesWithReferences = coverageData.filter(e => e.hasReferenceImage).length
        const entitiesWithoutReferences = totalEntities - entitiesWithReferences
        const coveragePercentage = totalEntities > 0 ? (usedEntities / totalEntities) * 100 : 0

        return {
            totalEntities,
            usedEntities,
            unusedEntities,
            entitiesWithReferences,
            entitiesWithoutReferences,
            coveragePercentage
        }
    }

    /**
     * Find orphaned @tags (used in prompts but not in entity list)
     */
    static findOrphanedTags(
        entities: ExtractedEntity[],
        shots: StoryShot[]
    ): Array<{ tag: string; shotNumbers: number[] }> {
        const entityTags = new Set(
            entities.map(e => `@${e.tag}`.toLowerCase())
        )

        const orphanedTags = new Map<string, number[]>()

        shots.forEach(shot => {
            const tagMatches = shot.prompt.match(/@[a-z0-9_]+/gi) || []

            tagMatches.forEach(tag => {
                const normalizedTag = tag.toLowerCase()

                if (!entityTags.has(normalizedTag)) {
                    const shotNumbers = orphanedTags.get(normalizedTag) || []
                    shotNumbers.push(shot.sequence_number)
                    orphanedTags.set(normalizedTag, shotNumbers)
                }
            })
        })

        return Array.from(orphanedTags.entries())
            .map(([tag, shotNumbers]) => ({
                tag: tag.substring(1), // Remove @
                shotNumbers: shotNumbers.sort((a, b) => a - b)
            }))
            .sort((a, b) => b.shotNumbers.length - a.shotNumbers.length)
    }

    /**
     * Get suggestions for underutilized entity combinations
     */
    static getSuggestions(
        entities: ExtractedEntity[],
        shots: StoryShot[]
    ): Array<{
        character: ExtractedEntity
        location: ExtractedEntity
        currentCount: number
        priority: 'high' | 'medium' | 'low'
    }> {
        const characters = entities.filter(e => e.type === 'character')
        const locations = entities.filter(e => e.type === 'location')

        const combinations = new Map<string, number>()

        // Count existing combinations
        shots.forEach(shot => {
            const tagMatches = shot.prompt.match(/@[a-z0-9_]+/gi) || []
            const tags = tagMatches.map(t => t.toLowerCase())

            characters.forEach(char => {
                const charTag = `@${char.tag}`.toLowerCase()
                if (tags.includes(charTag)) {
                    locations.forEach(loc => {
                        const locTag = `@${loc.tag}`.toLowerCase()
                        if (tags.includes(locTag)) {
                            const key = `${charTag}:${locTag}`
                            combinations.set(key, (combinations.get(key) || 0) + 1)
                        }
                    })
                }
            })
        })

        const suggestions: Array<{
            character: ExtractedEntity
            location: ExtractedEntity
            currentCount: number
            priority: 'high' | 'medium' | 'low'
        }> = []

        // Find underutilized combinations
        characters.forEach(char => {
            locations.forEach(loc => {
                const key = `@${char.tag}:@${loc.tag}`.toLowerCase()
                const count = combinations.get(key) || 0

                let priority: 'high' | 'medium' | 'low'
                if (count === 0) {
                    priority = 'high'
                } else if (count < 3) {
                    priority = 'medium'
                } else if (count < 5) {
                    priority = 'low'
                } else {
                    return // Skip well-covered combinations
                }

                suggestions.push({
                    character: char,
                    location: loc,
                    currentCount: count,
                    priority
                })
            })
        })

        return suggestions.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            return priorityOrder[b.priority] - priorityOrder[a.priority]
        })
    }
}
