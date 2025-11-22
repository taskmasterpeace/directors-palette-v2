/**
 * Bracket Prompting Helper for Story Creator
 * Reuses Shot Creator's dynamic prompt parsing infrastructure
 */

import {
    parseDynamicPrompt,
    type DynamicPromptResult,
    type DynamicPromptConfig
} from '@/features/shot-creator/helpers/prompt-syntax-feedback'

const STORY_CREATOR_CONFIG: Partial<DynamicPromptConfig> = {
    maxOptions: 10,
    maxPreview: 5,
    trimWhitespace: true
}

/**
 * Parse a story shot prompt for bracket syntax
 * Example: "@bad_newz [in library, at market, by car]" → 3 variations
 */
export function parseStoryPrompt(prompt: string): DynamicPromptResult {
    return parseDynamicPrompt(prompt, STORY_CREATOR_CONFIG)
}

/**
 * Check if a shot prompt has bracket syntax
 */
export function hasBracketSyntax(prompt: string): boolean {
    const result = parseStoryPrompt(prompt)
    return result.hasBrackets && result.isValid
}

/**
 * Get variation count for a shot prompt
 * Returns 1 for normal prompts, N for bracket prompts
 */
export function getVariationCount(prompt: string): number {
    const result = parseStoryPrompt(prompt)
    return result.totalCount
}

/**
 * Get preview of expanded prompts for UI display
 */
export function getPromptVariations(prompt: string, limit: number = 5): string[] {
    const result = parseStoryPrompt(prompt)
    return result.expandedPrompts.slice(0, limit)
}

/**
 * Get badge text for variation indicator
 * Example: "3 variations" or "1 shot"
 */
export function getVariationBadgeText(prompt: string): string {
    const count = getVariationCount(prompt)
    if (count === 1) return '1 shot'
    return `${count} variations`
}

/**
 * Expand a shot prompt into all variations for generation
 * Used when queuing shots for image generation
 */
export function expandPromptForGeneration(prompt: string): string[] {
    const result = parseStoryPrompt(prompt)
    if (!result.isValid) {
        return [prompt] // Return original on error
    }
    return result.expandedPrompts
}
