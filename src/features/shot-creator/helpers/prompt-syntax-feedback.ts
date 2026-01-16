// Enhanced Dynamic Prompting System
// Supports bracket notation: [option1, option2, option3]
// Supports pipe notation: prompt1 | prompt2 | prompt3
// Supports wild cards: _wildcard_ (requires wild card library)
//
// COMBINING SYNTAX:
// - Wildcards + Brackets: YES (wildcard substitutes first, then brackets expand)
// - Wildcards + Pipes: YES (wildcard substitutes first, then pipe chain runs)
// - Brackets + Pipes: YES with 10 image max (brackets × pipes = total images)

import { WildCard, generateRandomSelection, extractWildCardNames, parseWildCardContent } from "./wildcard/parser"

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
    // New fields for combined syntax
    creditCost?: number
    imageBreakdown?: string
}

export interface DynamicPromptConfig {
    maxOptions: number
    maxPreview: number
    maxTotalImages: number  // Max images when combining brackets + pipes
    trimWhitespace: boolean
    creditsPerImage: number
    // Granular syntax disabling
    disablePipeSyntax?: boolean    // Treat | as literal text
    disableBracketSyntax?: boolean // Treat [...] as literal text
    disableWildcardSyntax?: boolean // Treat _word_ as literal text
}

const DEFAULT_CONFIG: DynamicPromptConfig = {
    maxOptions: 10,        // Maximum bracket/pipe options allowed
    maxPreview: 5,         // Maximum prompts to show in preview
    maxTotalImages: 10,    // Maximum total images when combining syntax
    trimWhitespace: true,  // Clean up spacing
    creditsPerImage: 20,   // Credits per image for cost calculation
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
 *
 * COMBINING SYNTAX (now supported):
 * - Wildcards + Brackets: wildcard substitutes first (random), then brackets expand
 * - Wildcards + Pipes: wildcard substitutes first (random), then pipes expand
 * - Brackets + Pipes: Cross-product with 10 image max (auto-reject if over)
 *
 * Examples:
 * - "show an apple in [a garden, in a car, in space] half eaten"
 * - "show an apple in a garden | show an apple in a car | show an apple in space"
 * - "show _character_ in _location_"
 * - "_character_ [smiling, frowning] in _location_" → wildcard + brackets
 * - "[red, blue] car | [fast, slow] bike" → brackets + pipes (capped at 10)
 */
export function parseDynamicPrompt(
    prompt: string,
    config: Partial<DynamicPromptConfig> = {},
    userWildCards: WildCard[] = []
): DynamicPromptResult {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }

    // Detect what syntax is present
    const hasWildCardSyntax = !finalConfig.disableWildcardSyntax && extractWildCardNames(prompt).length > 0
    const hasPipeSyntax = !finalConfig.disablePipeSyntax && prompt.includes('|')
    const hasBracketSyntax = !finalConfig.disableBracketSyntax && /\[([^\[\]]+)\]/.test(prompt)

    // STEP 1: Handle wildcards first (substitute with random selections)
    let workingPrompt = prompt
    let wildCardNames: string[] = []
    const wildCardWarnings: string[] = []
    let hasWildCards = false

    if (hasWildCardSyntax) {
        wildCardNames = extractWildCardNames(prompt)
        hasWildCards = true

        // Build wildcard map and check for missing
        const wildCardMap = new Map<string, string[]>()
        const missingWildCards: string[] = []

        wildCardNames.forEach(name => {
            const wildCard = userWildCards.find(wc => wc.name === name)
            if (wildCard) {
                const entries = parseWildCardContent(wildCard.content)
                wildCardMap.set(name, entries)
            } else {
                missingWildCards.push(name)
            }
        })

        // If missing wildcards, return error
        if (missingWildCards.length > 0) {
            return {
                isValid: false,
                hasBrackets: hasBracketSyntax,
                hasPipes: hasPipeSyntax,
                hasWildCards: true,
                expandedPrompts: [],
                originalPrompt: prompt,
                wildCardNames,
                previewCount: 0,
                totalCount: 0,
                warnings: [`Missing wild cards: ${missingWildCards.map(name => `_${name}_`).join(', ')}`]
            }
        }

        // Substitute wildcards with random selections
        workingPrompt = generateRandomSelection(prompt, wildCardMap)

        // Build info message about wildcard substitution
        const wildCardInfo = wildCardNames.map(name => {
            const entries = wildCardMap.get(name) || []
            return `${name} (${entries.length} options)`
        }).join(', ')
        wildCardWarnings.push(`🎲 Random selection from: ${wildCardInfo}`)
    }

    // STEP 2: Check for brackets + pipes combination
    // After wildcard substitution, check what's left
    const hasRemainingPipes = !finalConfig.disablePipeSyntax && workingPrompt.includes('|')
    const bracketMatch = finalConfig.disableBracketSyntax ? null : workingPrompt.match(/\[([^\[\]]+)\]/)
    const hasRemainingBrackets = bracketMatch !== null

    // BRACKETS + PIPES combination (cross-product with cap)
    if (hasRemainingBrackets && hasRemainingPipes) {
        return parseBracketsAndPipes(workingPrompt, finalConfig, {
            originalPrompt: prompt,
            hasWildCards,
            wildCardNames,
            wildCardWarnings
        })
    }

    // STEP 3: Handle pipes only
    if (hasRemainingPipes) {
        const pipeResult = parsePipePrompt(workingPrompt, finalConfig)

        // Merge wildcard info if applicable
        if (hasWildCards) {
            return {
                ...pipeResult,
                originalPrompt: prompt,
                hasWildCards: true,
                wildCardNames,
                warnings: [...wildCardWarnings, ...(pipeResult.warnings || [])],
                creditCost: pipeResult.totalCount * finalConfig.creditsPerImage,
                imageBreakdown: `${wildCardNames.length} wildcard(s) × ${pipeResult.totalCount} pipe variations`
            }
        }
        return pipeResult
    }

    // STEP 4: Handle brackets only
    if (hasRemainingBrackets) {
        const bracketContent = bracketMatch![1]
        const beforeBracket = workingPrompt.substring(0, bracketMatch!.index)
        const afterBracket = workingPrompt.substring(bracketMatch!.index! + bracketMatch![0].length)

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
                hasWildCards,
                expandedPrompts: [],
                originalPrompt: prompt,
                bracketContent,
                options: [],
                wildCardNames: hasWildCards ? wildCardNames : undefined,
                previewCount: 0,
                totalCount: 0,
                warnings: wildCardWarnings
            }
        }

        if (options.length > finalConfig.maxOptions) {
            return {
                isValid: false,
                hasBrackets: true,
                hasPipes: false,
                hasWildCards,
                expandedPrompts: [],
                originalPrompt: prompt,
                bracketContent,
                options,
                wildCardNames: hasWildCards ? wildCardNames : undefined,
                previewCount: 0,
                totalCount: options.length,
                warnings: [...wildCardWarnings, `Too many bracket options: ${options.length}. Maximum is ${finalConfig.maxOptions}.`]
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

        const totalCount = expandedPrompts.length

        return {
            isValid: true,
            hasBrackets: true,
            hasPipes: false,
            hasWildCards,
            expandedPrompts,
            originalPrompt: prompt,
            bracketContent,
            options,
            wildCardNames: hasWildCards ? wildCardNames : undefined,
            previewCount: Math.min(totalCount, finalConfig.maxPreview),
            totalCount,
            warnings: wildCardWarnings.length > 0 ? wildCardWarnings : undefined,
            creditCost: totalCount * finalConfig.creditsPerImage,
            imageBreakdown: hasWildCards
                ? `${wildCardNames.length} wildcard(s) × ${options.length} bracket options = ${totalCount} images`
                : `${options.length} bracket options`
        }
    }

    // STEP 5: No special syntax (or wildcards only with single result)
    return {
        isValid: true,
        hasBrackets: false,
        hasPipes: false,
        hasWildCards,
        expandedPrompts: [workingPrompt],
        originalPrompt: prompt,
        wildCardNames: hasWildCards ? wildCardNames : undefined,
        previewCount: 1,
        totalCount: 1,
        warnings: wildCardWarnings.length > 0 ? wildCardWarnings : undefined,
        creditCost: finalConfig.creditsPerImage
    }
}

/**
 * Parse combined brackets + pipes syntax
 * Example: "[red, blue] car | [fast, slow] bike"
 * This creates a cross-product: (red car, blue car) × (fast bike, slow bike)
 * Capped at maxTotalImages (default 10)
 */
function parseBracketsAndPipes(
    prompt: string,
    config: DynamicPromptConfig,
    context: {
        originalPrompt: string
        hasWildCards: boolean
        wildCardNames: string[]
        wildCardWarnings: string[]
    }
): DynamicPromptResult {
    // Split by pipes first
    let pipeSegments = prompt.split('|')

    if (config.trimWhitespace) {
        pipeSegments = pipeSegments.map(s => s.trim()).filter(s => s.length > 0)
    }

    // Expand brackets in each pipe segment
    const expandedSegments: string[][] = []

    for (const segment of pipeSegments) {
        const bracketMatch = segment.match(/\[([^\[\]]+)\]/)

        if (bracketMatch) {
            const bracketContent = bracketMatch[1]
            const beforeBracket = segment.substring(0, bracketMatch.index)
            const afterBracket = segment.substring(bracketMatch.index! + bracketMatch[0].length)

            let options = bracketContent.split(',')
            if (config.trimWhitespace) {
                options = options.map(o => o.trim()).filter(o => o.length > 0)
            }

            const expanded = options.map(option => {
                let result = beforeBracket + option + afterBracket
                if (config.trimWhitespace) {
                    result = result.replace(/\s+/g, ' ').trim()
                }
                return result
            })

            expandedSegments.push(expanded)
        } else {
            // No brackets in this segment, just use as-is
            expandedSegments.push([segment])
        }
    }

    // Calculate total combinations (cross-product)
    const totalCombinations = expandedSegments.reduce((acc, seg) => acc * seg.length, 1)
    const creditCost = totalCombinations * config.creditsPerImage

    // Check against max limit
    if (totalCombinations > config.maxTotalImages) {
        const breakdown = expandedSegments.map((seg, i) => `Segment ${i + 1}: ${seg.length} options`).join(', ')

        return {
            isValid: false,
            hasBrackets: true,
            hasPipes: true,
            hasWildCards: context.hasWildCards,
            expandedPrompts: [],
            originalPrompt: context.originalPrompt,
            wildCardNames: context.hasWildCards ? context.wildCardNames : undefined,
            previewCount: 0,
            totalCount: totalCombinations,
            warnings: [
                ...context.wildCardWarnings,
                `⚠️ Too many images! ${totalCombinations} combinations exceed the ${config.maxTotalImages} image limit.`,
                `Breakdown: ${breakdown}`,
                `Would cost ${creditCost} credits (${config.creditsPerImage} per image)`
            ],
            isCrossCombination: true,
            creditCost,
            imageBreakdown: `${pipeSegments.length} pipe segments × bracket options = ${totalCombinations} images`
        }
    }

    // Generate cross-product: each combination is a complete pipe chain
    // Example: [red, blue] car | [fast, slow] bike
    // → "red car | fast bike", "red car | slow bike", "blue car | fast bike", "blue car | slow bike"
    const allPrompts = cartesianProductStrings(expandedSegments).map(combo => combo.join(' | '))

    return {
        isValid: true,
        hasBrackets: true,
        hasPipes: true,
        hasWildCards: context.hasWildCards,
        expandedPrompts: allPrompts,
        originalPrompt: context.originalPrompt,
        wildCardNames: context.hasWildCards ? context.wildCardNames : undefined,
        previewCount: Math.min(allPrompts.length, config.maxPreview),
        totalCount: allPrompts.length,
        warnings: [
            ...context.wildCardWarnings,
            `📸 Generating ${allPrompts.length} pipe chains (${creditCost} credits)`
        ],
        isCrossCombination: true,
        creditCost,
        imageBreakdown: `${pipeSegments.length} pipe segments with brackets = ${allPrompts.length} chains`
    }
}

/**
 * Cartesian product for string arrays
 */
function cartesianProductStrings(arrays: string[][]): string[][] {
    if (arrays.length === 0) return []
    if (arrays.length === 1) return arrays[0].map(item => [item])

    const [head, ...tail] = arrays
    const combinations = cartesianProductStrings(tail)

    return head.flatMap(item =>
        combinations.map(combination => [item, ...combination])
    )
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
 * Now supports mixed syntax with limits (brackets + pipes capped at 10 images)
 */
export function validateBracketSyntax(prompt: string, config: Partial<DynamicPromptConfig> = {}): {
    isValid: boolean
    error?: string
    suggestion?: string
    imageCount?: number
} {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }

    // Check for mixed bracket and pipe syntax
    const hasBrackets = prompt.includes('[') || prompt.includes(']')
    const hasPipes = prompt.includes('|')

    // Mixed syntax is now allowed - validate it properly
    if (hasBrackets && hasPipes) {
        // Count total images that would be generated
        const pipeSegments = prompt.split('|').map(s => s.trim()).filter(s => s.length > 0)

        let totalImages = 0
        for (const segment of pipeSegments) {
            const bracketMatch = segment.match(/\[([^\[\]]+)\]/)
            if (bracketMatch) {
                const options = bracketMatch[1].split(',').map(o => o.trim()).filter(o => o.length > 0)
                totalImages += options.length
            } else {
                totalImages += 1
            }
        }

        if (totalImages > finalConfig.maxTotalImages) {
            return {
                isValid: false,
                error: `Too many images (${totalImages})`,
                suggestion: `Brackets + Pipes combined can generate max ${finalConfig.maxTotalImages} images. Reduce options.`,
                imageCount: totalImages
            }
        }

        return { isValid: true, imageCount: totalImages }
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
        return { isValid: true, imageCount: pipeOptions.length }
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

    // Count bracket options
    if (bracketMatch) {
        const options = bracketMatch[1].split(',').map(o => o.trim()).filter(o => o.length > 0)
        return { isValid: true, imageCount: options.length }
    }

    return { isValid: true, imageCount: 1 }
}

/**
 * Anchor Transform (@!) - Batch transform multiple images using first image as style anchor
 *
 * Syntax: @! at beginning or end of prompt
 * Example: "@! Transform into claymation style" or "Transform into claymation style @!"
 *
 * When detected:
 * - First uploaded image = anchor/style reference
 * - Remaining images = inputs to transform
 * - Each input generates one output (N-1 images total)
 * - @! is stripped from prompt before API call
 */

/**
 * Detect if prompt contains @! anchor transform syntax
 * Only triggers if @! is at the very start or very end (not in middle)
 */
export function detectAnchorTransform(prompt: string): boolean {
    const trimmed = prompt.trim()
    return trimmed.startsWith('@! ') || trimmed.endsWith(' @!')
}

/**
 * Strip @! syntax from prompt for API call
 * Removes @! from beginning or end, cleans up spacing
 */
export function stripAnchorSyntax(prompt: string): string {
    return prompt.trim()
        .replace(/^@!\s+/, '')  // Remove from start
        .replace(/\s+@!$/, '')  // Remove from end
        .trim()
}

/**
 * Generate feedback message for anchor transform mode
 * Shows anchor image name and number of transforms
 */
export function getAnchorTransformFeedback(
    prompt: string,
    refCount: number,
    firstImageName?: string
): string | null {
    if (!detectAnchorTransform(prompt)) return null

    if (refCount < 2) {
        return '⚠️ Anchor Transform requires at least 2 images (1 anchor + 1+ inputs)'
    }

    const anchorImage = firstImageName || 'Image 1'
    const transformCount = refCount - 1

    return `📍 Anchor: ${anchorImage} → Will transform ${transformCount} image${transformCount > 1 ? 's' : ''}`
}