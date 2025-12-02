// Enhanced Dynamic Prompting System
// Supports bracket notation: [option1, option2, option3]
// Supports pipe notation: prompt1 | prompt2 | prompt3
// Supports wild cards: _wildcard_ (requires wild card library)

import { parseWildCardPrompt, WildCard } from "./wildcard/parser"

export interface DynamicPromptResult {
    isValid: boolean
    hasBrackets: boolean
    hasPipes: boolean
    hasWildCards: boolean
    expandedPrompts: string[]
    originalPrompt: string
    bracketContent?: string
    options?: string[]
    wildCardNames?: string[]
    previewCount: number
    totalCount: number
    warnings?: string[]
    isCrossCombination?: boolean
}

export interface DynamicPromptConfig {
    maxOptions: number
    maxPreview: number
    trimWhitespace: boolean
    // Granular syntax disabling
    disablePipeSyntax?: boolean    // Treat | as literal text
    disableBracketSyntax?: boolean // Treat [...] as literal text
    disableWildcardSyntax?: boolean // Treat _word_ as literal text
}

const DEFAULT_CONFIG: DynamicPromptConfig = {
    maxOptions: 10,        // Maximum bracket/pipe options allowed
    maxPreview: 5,         // Maximum prompts to show in preview
    trimWhitespace: true,  // Clean up spacing
    disablePipeSyntax: false,
    disableBracketSyntax: false,
    disableWildcardSyntax: false
}

/**
 * Parse pipe-separated prompts
 * Example: "prompt1 | prompt2 | prompt3" → ["prompt1", "prompt2", "prompt3"]
 */
function parsePipePrompt(
    prompt: string,
    config: DynamicPromptConfig
): DynamicPromptResult {
    // Split by pipe character
    let options = prompt.split('|')

    if (config.trimWhitespace) {
        options = options.map(option => option.trim()).filter(option => option.length > 0)
    }

    // Validate option count
    if (options.length === 0) {
        return {
            isValid: false,
            hasBrackets: false,
            hasPipes: true,
            hasWildCards: false,
            expandedPrompts: [],
            originalPrompt: prompt,
            options: [],
            previewCount: 0,
            totalCount: 0
        }
    }

    if (options.length > config.maxOptions) {
        return {
            isValid: false,
            hasBrackets: false,
            hasPipes: true,
            hasWildCards: false,
            expandedPrompts: [],
            originalPrompt: prompt,
            options,
            previewCount: 0,
            totalCount: options.length,
            warnings: [`Too many pipe variations: ${options.length}. Maximum is ${config.maxOptions}.`]
        }
    }

    return {
        isValid: true,
        hasBrackets: false,
        hasPipes: true,
        hasWildCards: false,
        expandedPrompts: options,
        originalPrompt: prompt,
        options,
        previewCount: Math.min(options.length, config.maxPreview),
        totalCount: options.length
    }
}

/**
 * Parse dynamic prompt with bracket notation, pipe notation, AND wild cards
 * Examples:
 * - "show an apple in [a garden, in a car, in space] half eaten"
 * - "show an apple in a garden | show an apple in a car | show an apple in space"
 * - "show _character_ in _location_"
 * - "show _character_ [smiling, frowning] in _location_" (mixed syntax)
 * Returns expanded prompts and metadata
 */
export function parseDynamicPrompt(
    prompt: string,
    config: Partial<DynamicPromptConfig> = {},
    userWildCards: WildCard[] = []
): DynamicPromptResult {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }

    // First check for wild cards (unless disabled)
    if (!finalConfig.disableWildcardSyntax) {
        const wildCardResult = parseWildCardPrompt(prompt, userWildCards)

        if (wildCardResult.hasWildCards) {
            return {
                isValid: wildCardResult.isValid,
                hasBrackets: false,
                hasPipes: false,
                hasWildCards: true,
                expandedPrompts: wildCardResult.expandedPrompts,
                originalPrompt: prompt,
                wildCardNames: wildCardResult.wildCardNames,
                previewCount: Math.min(wildCardResult.expandedPrompts.length, finalConfig.maxPreview),
                totalCount: wildCardResult.totalCombinations,
                warnings: wildCardResult.warnings,
                isCrossCombination: wildCardResult.crossCombination
            }
        }
    }

    // Check if prompt contains pipe character (higher priority than brackets)
    // Skip if pipe syntax is disabled
    if (prompt.includes('|') && !finalConfig.disablePipeSyntax) {
        return parsePipePrompt(prompt, finalConfig)
    }

    // Check if prompt contains brackets (skip if bracket syntax is disabled)
    const bracketMatch = finalConfig.disableBracketSyntax ? null : prompt.match(/\[([^\[\]]+)\]/)

    if (!bracketMatch) {
        return {
            isValid: true,
            hasBrackets: false,
            hasPipes: false,
            hasWildCards: false,
            expandedPrompts: [prompt],
            originalPrompt: prompt,
            previewCount: 1,
            totalCount: 1
        }
    }

    const bracketContent = bracketMatch[1]
    const beforeBracket = prompt.substring(0, bracketMatch.index)
    const afterBracket = prompt.substring(bracketMatch.index! + bracketMatch[0].length)

    // Split options by comma and clean them up
    let options = bracketContent.split(',')

    if (finalConfig.trimWhitespace) {
        options = options.map(option => option.trim()).filter(option => option.length > 0)
    }

    // Validate option count
    if (options.length === 0) {
        return {
            isValid: false,
            hasBrackets: true,
            hasPipes: false,
            hasWildCards: false,
            expandedPrompts: [],
            originalPrompt: prompt,
            bracketContent,
            options: [],
            previewCount: 0,
            totalCount: 0
        }
    }

    if (options.length > finalConfig.maxOptions) {
        return {
            isValid: false,
            hasBrackets: true,
            hasPipes: false,
            hasWildCards: false,
            expandedPrompts: [],
            originalPrompt: prompt,
            bracketContent,
            options,
            previewCount: 0,
            totalCount: options.length
        }
    }

    // Generate expanded prompts
    const expandedPrompts = options.map(option => {
        let expandedPrompt = beforeBracket + option + afterBracket

        // Clean up extra spaces
        if (finalConfig.trimWhitespace) {
            expandedPrompt = expandedPrompt.replace(/\s+/g, ' ').trim()
        }

        return expandedPrompt
    })

    return {
        isValid: true,
        hasBrackets: true,
        hasPipes: false,
        hasWildCards: false,
        expandedPrompts,
        originalPrompt: prompt,
        bracketContent,
        options,
        previewCount: Math.min(expandedPrompts.length, finalConfig.maxPreview),
        totalCount: expandedPrompts.length
    }
}

/**
 * Get preview prompts for UI display
 */
export function getPromptPreview(
    prompt: string,
    config: Partial<DynamicPromptConfig> = {}
): string[] {
    const result = parseDynamicPrompt(prompt, config)
    const finalConfig = { ...DEFAULT_CONFIG, ...config }

    if (!result.isValid || !result.hasBrackets) {
        return result.expandedPrompts
    }

    return result.expandedPrompts.slice(0, finalConfig.maxPreview)
}

/**
 * Check if prompt has valid bracket notation
 */
export function hasValidBrackets(prompt: string): boolean {
    const result = parseDynamicPrompt(prompt)
    return result.isValid && result.hasBrackets
}

/**
 * Calculate total credit cost for dynamic prompt
 */
export function calculateDynamicPromptCost(
    prompt: string,
    creditsPerImage: number,
    config: Partial<DynamicPromptConfig> = {}
): { totalCost: number; imageCount: number; isValid: boolean } {
    const result = parseDynamicPrompt(prompt, config)

    if (!result.isValid) {
        return { totalCost: 0, imageCount: 0, isValid: false }
    }

    const imageCount = result.expandedPrompts.length
    const totalCost = imageCount * creditsPerImage

    return { totalCost, imageCount, isValid: true }
}

/**
 * Validate bracket and pipe syntax in real-time
 */
export function validateBracketSyntax(prompt: string): {
    isValid: boolean
    error?: string
    suggestion?: string
} {
    // Check for mixed bracket and pipe syntax
    const hasBrackets = prompt.includes('[') || prompt.includes(']')
    const hasPipes = prompt.includes('|')

    if (hasBrackets && hasPipes) {
        return {
            isValid: false,
            error: 'Cannot mix brackets and pipes',
            suggestion: 'Use either [option1, option2] OR option1 | option2, not both'
        }
    }

    // Validate pipe syntax
    if (hasPipes) {
        const pipeOptions = prompt.split('|').map(s => s.trim()).filter(s => s.length > 0)
        if (pipeOptions.length === 0) {
            return {
                isValid: false,
                error: 'Empty pipe variations',
                suggestion: 'Add prompts separated by |: prompt1 | prompt2'
            }
        }
        return { isValid: true }
    }

    // Validate bracket syntax
    const openBrackets = (prompt.match(/\[/g) || []).length
    const closeBrackets = (prompt.match(/\]/g) || []).length

    if (openBrackets > closeBrackets) {
        return {
            isValid: false,
            error: 'Missing closing bracket ]',
            suggestion: 'Add ] to close your options'
        }
    }

    if (closeBrackets > openBrackets) {
        return {
            isValid: false,
            error: 'Missing opening bracket [',
            suggestion: 'Add [ before your options'
        }
    }

    if (openBrackets > 1) {
        return {
            isValid: false,
            error: 'Multiple brackets not supported',
            suggestion: 'Use only one [option1, option2] per prompt'
        }
    }

    // Check for empty brackets
    const bracketMatch = prompt.match(/\[([^\[\]]*)\]/)
    if (bracketMatch && bracketMatch[1].trim().length === 0) {
        return {
            isValid: false,
            error: 'Empty brackets',
            suggestion: 'Add options inside brackets: [option1, option2]'
        }
    }

    return { isValid: true }
}