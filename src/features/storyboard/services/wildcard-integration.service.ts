/**
 * Wildcard Integration Service for Storyboard
 * Bridges the existing wildcard system to storyboard prompt generation
 */

import {
    extractWildCardNames,
    parseWildCardContent,
    type WildCard
} from '@/features/shot-creator/helpers/wildcard/parser'
import { getWildCards, createWildCard } from '@/features/shot-creator/services/wildcard.service'
import { STORYBOARD_WILDCARD_PRESETS, type WildcardPreset } from '../data/wildcard-presets'
import type { GeneratedShotPrompt } from '../types/storyboard.types'

export interface WildcardExpansionResult {
    /** The prompt with wildcards expanded */
    expandedPrompt: string
    /** Original prompt with wildcards intact */
    originalPrompt: string
    /** Which wildcards were applied and what value was used */
    appliedWildcards: Record<string, string>
    /** Any wildcards that couldn't be found */
    missingWildcards: string[]
    /** Whether any expansion happened */
    hasExpansions: boolean
}

/**
 * Process a single prompt with wildcards
 */
export function processPromptWithWildcards(
    prompt: string,
    userWildcards: WildCard[]
): WildcardExpansionResult {
    const wildcardNames = extractWildCardNames(prompt)

    if (wildcardNames.length === 0) {
        return {
            expandedPrompt: prompt,
            originalPrompt: prompt,
            appliedWildcards: {},
            missingWildcards: [],
            hasExpansions: false
        }
    }

    // Build wildcard map
    const wildcardMap = new Map<string, string[]>()
    const missingWildcards: string[] = []
    const appliedWildcards: Record<string, string> = {}

    for (const name of wildcardNames) {
        const wildcard = userWildcards.find(wc => wc.name === name)
        if (wildcard) {
            const entries = parseWildCardContent(wildcard.content)
            wildcardMap.set(name, entries)
        } else {
            missingWildcards.push(name)
        }
    }

    // If all wildcards are missing, return original
    if (missingWildcards.length === wildcardNames.length) {
        return {
            expandedPrompt: prompt,
            originalPrompt: prompt,
            appliedWildcards: {},
            missingWildcards,
            hasExpansions: false
        }
    }

    // Track which value was selected for each wildcard
    let expandedPrompt = prompt
    for (const name of wildcardNames) {
        if (missingWildcards.includes(name)) continue

        const entries = wildcardMap.get(name) || []
        if (entries.length > 0) {
            const selectedValue = entries[Math.floor(Math.random() * entries.length)]
            appliedWildcards[name] = selectedValue
            expandedPrompt = expandedPrompt.replace(new RegExp(`_${name}_`, 'g'), selectedValue)
        }
    }

    return {
        expandedPrompt: expandedPrompt.trim(),
        originalPrompt: prompt,
        appliedWildcards,
        missingWildcards,
        hasExpansions: Object.keys(appliedWildcards).length > 0
    }
}

/**
 * Process multiple shot prompts with wildcards
 * Each shot gets independent random selections
 */
export function processPromptsWithWildcards(
    prompts: GeneratedShotPrompt[],
    userWildcards: WildCard[]
): GeneratedShotPrompt[] {
    return prompts.map(shot => {
        const result = processPromptWithWildcards(shot.prompt, userWildcards)

        return {
            ...shot,
            prompt: result.expandedPrompt,
            // Store original in metadata if we want to re-roll later
            metadata: {
                ...shot.metadata,
                originalPromptWithWildcards: result.hasExpansions ? result.originalPrompt : undefined,
                appliedWildcards: result.hasExpansions ? result.appliedWildcards : undefined
            }
        }
    })
}

/**
 * Re-roll wildcards for a single prompt
 * Uses the original prompt with wildcards to generate a new random selection
 */
export function rerollPromptWildcards(
    shot: GeneratedShotPrompt,
    userWildcards: WildCard[]
): GeneratedShotPrompt {
    const originalPrompt = shot.metadata?.originalPromptWithWildcards || shot.prompt

    const result = processPromptWithWildcards(originalPrompt, userWildcards)

    return {
        ...shot,
        prompt: result.expandedPrompt,
        metadata: {
            ...shot.metadata,
            originalPromptWithWildcards: result.hasExpansions ? result.originalPrompt : undefined,
            appliedWildcards: result.hasExpansions ? result.appliedWildcards : undefined
        }
    }
}

/**
 * Check if user has the preset wildcards, create any missing ones
 * Call this when user first accesses storyboard
 */
export async function ensurePresetWildcards(): Promise<{
    created: string[]
    existing: string[]
    errors: string[]
}> {
    const created: string[] = []
    const existing: string[] = []
    const errors: string[] = []

    try {
        // Get current user's wildcards
        const { data: userWildcards, error } = await getWildCards()

        if (error) {
            errors.push(`Failed to fetch wildcards: ${error.message}`)
            return { created, existing, errors }
        }

        const existingNames = new Set(userWildcards?.map(wc => wc.name) || [])

        // Check each preset
        for (const preset of STORYBOARD_WILDCARD_PRESETS) {
            if (existingNames.has(preset.name)) {
                existing.push(preset.name)
                continue
            }

            // Create the missing preset
            const { error: createError } = await createWildCard({
                name: preset.name,
                category: preset.category,
                content: preset.content,
                description: preset.description,
                is_shared: false // User's own copy
            })

            if (createError) {
                errors.push(`Failed to create ${preset.name}: ${createError.message}`)
            } else {
                created.push(preset.name)
            }
        }
    } catch (err) {
        errors.push(`Unexpected error: ${err}`)
    }

    return { created, existing, errors }
}

/**
 * Get all wildcards available for the current user (including presets)
 */
export async function getAvailableWildcards(): Promise<{
    wildcards: WildCard[]
    error: Error | null
}> {
    const { data, error } = await getWildCards()

    if (error) {
        return { wildcards: [], error }
    }

    return { wildcards: data || [], error: null }
}

/**
 * Detect wildcards used in a prompt and check which are available
 */
export async function analyzePromptWildcards(prompt: string): Promise<{
    wildcardNames: string[]
    available: string[]
    missing: string[]
}> {
    const wildcardNames = extractWildCardNames(prompt)

    if (wildcardNames.length === 0) {
        return { wildcardNames: [], available: [], missing: [] }
    }

    const { wildcards } = await getAvailableWildcards()
    const availableNames = new Set(wildcards.map(wc => wc.name))

    const available: string[] = []
    const missing: string[] = []

    for (const name of wildcardNames) {
        if (availableNames.has(name)) {
            available.push(name)
        } else {
            missing.push(name)
        }
    }

    return { wildcardNames, available, missing }
}

/**
 * Get list of preset wildcard names for UI display
 */
export function getPresetWildcardNames(): string[] {
    return STORYBOARD_WILDCARD_PRESETS.map(p => p.name)
}

/**
 * Get presets grouped by category
 */
export function getPresetsGroupedByCategory(): Record<string, WildcardPreset[]> {
    const grouped: Record<string, WildcardPreset[]> = {}

    for (const preset of STORYBOARD_WILDCARD_PRESETS) {
        if (!grouped[preset.category]) {
            grouped[preset.category] = []
        }
        grouped[preset.category].push(preset)
    }

    return grouped
}
