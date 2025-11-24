export interface WildCard {
    id: string
    user_id: string
    name: string
    category: string
    content: string // newline-separated entries
    description?: string
    is_shared: boolean
    created_at: string
    updated_at: string
}

export interface WildCardParseResult {
    isValid: boolean
    hasWildCards: boolean
    originalPrompt: string
    wildCardNames: string[]
    expandedPrompts: string[]
    totalCombinations: number
    warnings: string[]
    crossCombination: boolean
}
/**
 * Parse wild card references in a prompt
 * Example: "A _character_ in _location_" → finds ['character', 'location']
 */
export function extractWildCardNames(prompt: string): string[] {
    const matches = prompt.match(/_([a-zA-Z0-9_]+)_/g)
    if (!matches) return []

    return matches.map(match => match.slice(1, -1)) // Remove underscores
}

/**
 * Convert wild card content to array of entries
 */
export function parseWildCardContent(content: string): string[] {
    if (!content.trim()) return []

    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
}

/**
 * Generate ONE prompt by randomly selecting from wild card entries
 * Each wildcard picks ONE random option from its list
 */
export function generateRandomSelection(
    prompt: string,
    wildCardMap: Map<string, string[]>
): string {
    const wildCardNames = extractWildCardNames(prompt)

    if (wildCardNames.length === 0) {
        return prompt
    }

    let result = prompt

    // Replace each wildcard with a random selection
    wildCardNames.forEach(name => {
        const entries = wildCardMap.get(name) || []
        if (entries.length === 0) {
            console.warn(`Wild card '_${name}_' not found or empty`)
            return
        }

        // Pick random entry
        const randomEntry = entries[Math.floor(Math.random() * entries.length)]

        // Replace all instances of this wildcard in the prompt
        result = result.replace(new RegExp(`_${name}_`, 'g'), randomEntry)
    })

    return result.trim()
}

/**
 * Generate all combinations of wild card entries (LEGACY - for reference)
 * For cross-combination: _character_ (3 entries) × _location_ (4 entries) = 12 combinations
 */
export function generateCombinations(
    prompt: string,
    wildCardMap: Map<string, string[]>
): string[] {
    const wildCardNames = extractWildCardNames(prompt)

    if (wildCardNames.length === 0) {
        return [prompt]
    }

    // Get all entries for each wild card
    const allEntries: string[][] = wildCardNames.map(name => {
        const entries = wildCardMap.get(name) || []
        if (entries.length === 0) {
            console.warn(`Wild card '_${name}_' not found or empty`)
            return [name] // Fallback to original name
        }
        return entries
    })

    // Generate all combinations using cartesian product
    const combinations = cartesianProduct(allEntries)

    // Replace wild cards with actual entries
    return combinations.map(combination => {
        let result = prompt
        wildCardNames.forEach((name, index) => {
            result = result.replace(new RegExp(`_${name}_`, 'g'), combination[index])
        })
        return result.trim()
    })
}

/**
 * Cartesian product of arrays
 * [[a,b], [1,2]] → [[a,1], [a,2], [b,1], [b,2]]
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return []
    if (arrays.length === 1) return arrays[0].map(item => [item])

    const [head, ...tail] = arrays
    const combinations = cartesianProduct(tail)

    return head.flatMap(item =>
        combinations.map(combination => [item, ...combination])
    )
}

/**
 * Parse wild card prompt and generate all variations
 */
export function parseWildCardPrompt(
    prompt: string,
    userWildCards: WildCard[]
): WildCardParseResult {
    const wildCardNames = extractWildCardNames(prompt)
    const hasWildCards = wildCardNames.length > 0

    if (!hasWildCards) {
        return {
            isValid: true,
            hasWildCards: false,
            originalPrompt: prompt,
            wildCardNames: [],
            expandedPrompts: [prompt],
            totalCombinations: 1,
            warnings: [],
            crossCombination: false
        }
    }

    // Build wild card map
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

    // Check for missing wild cards
    if (missingWildCards.length > 0) {
        return {
            isValid: false,
            hasWildCards: true,
            originalPrompt: prompt,
            wildCardNames,
            expandedPrompts: [],
            totalCombinations: 0,
            warnings: [`Missing wild cards: ${missingWildCards.map(name => `_${name}_`).join(', ')}`],
            crossCombination: wildCardNames.length > 1
        }
    }

    // Generate ONE random prompt by picking random options from each wildcard
    const randomPrompt = generateRandomSelection(prompt, wildCardMap)
    const expandedPrompts = [randomPrompt]

    // Calculate total possible combinations for info
    let totalPossibleCombinations = 1
    wildCardNames.forEach(name => {
        const entries = wildCardMap.get(name) || []
        totalPossibleCombinations *= entries.length
    })

    const crossCombination = wildCardNames.length > 1

    // Generate info message
    const warnings: string[] = []
    const wildCardInfo = wildCardNames.map(name => {
        const entries = wildCardMap.get(name) || []
        return `${name} (${entries.length} options)`
    }).join(', ')

    warnings.push(`🎲 Random selection from: ${wildCardInfo}`)

    return {
        isValid: true,
        hasWildCards: true,
        originalPrompt: prompt,
        wildCardNames,
        expandedPrompts,
        totalCombinations: 1, // Always returns 1 prompt with random selections
        warnings,
        crossCombination
    }
}

/**
 * Calculate total credit cost for wild card prompt
 */
export function calculateWildCardCost(
    prompt: string,
    userWildCards: WildCard[],
    creditsPerImage: number
): { totalCost: number; imageCount: number; isValid: boolean; warnings: string[] } {
    const result = parseWildCardPrompt(prompt, userWildCards)

    if (!result.isValid) {
        return { totalCost: 0, imageCount: 0, isValid: false, warnings: result.warnings }
    }

    const imageCount = result.expandedPrompts.length
    const totalCost = imageCount * creditsPerImage

    return { totalCost, imageCount, isValid: true, warnings: result.warnings }
}

/**
 * Validate wild card name for creation
 */
export function validateWildCardName(name: string): { isValid: boolean; error?: string } {
    if (!name.trim()) {
        return { isValid: false, error: 'Name cannot be empty' }
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        return { isValid: false, error: 'Name can only contain letters, numbers, and underscores' }
    }

    if (name.length > 50) {
        return { isValid: false, error: 'Name must be 50 characters or less' }
    }

    return { isValid: true }
}

/**
 * Generate share code for wild card export
 */
export function generateShareCode(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
}