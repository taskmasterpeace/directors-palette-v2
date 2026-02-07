/**
 * Slot Machine Service
 *
 * Handles {seed} → [variations] expansion for prompts.
 * Flow: User types {text}, clicks Organize Prompt, AI expands to [variation1, variation2, variation3]
 */

export interface SlotMachineSlot {
    seed: string
    variations: string[]
}

export interface SlotMachineResult {
    success: boolean
    expandedPrompt: string
    slots: SlotMachineSlot[]
    originalPrompt: string
    variationCount: number
    error?: string
}

/**
 * Detect if prompt contains slot machine syntax {curly brackets}
 * Returns array of detected seeds
 */
export function detectSlotMachineSyntax(prompt: string): string[] {
    const regex = /\{([^{}]+)\}/g
    const matches = [...prompt.matchAll(regex)]
    return matches.map(m => m[1])
}

/**
 * Check if prompt has slot machine syntax
 */
export function hasSlotMachineSyntax(prompt: string): boolean {
    return /\{[^{}]+\}/.test(prompt)
}

/**
 * Count slot machine brackets in prompt
 */
export function countSlotMachineBrackets(prompt: string): number {
    const matches = prompt.match(/\{[^{}]+\}/g)
    return matches ? matches.length : 0
}

/**
 * Flatten nested brackets {{text}} to single {text}
 */
export function flattenNestedBrackets(prompt: string): string {
    // Replace {{ with { and }} with }
    return prompt.replace(/\{\{/g, '{').replace(/\}\}/g, '}')
}

/**
 * Validate slot machine syntax
 */
export function validateSlotMachineSyntax(prompt: string): {
    isValid: boolean
    error?: string
    bracketCount: number
} {
    // Check for empty brackets
    if (/\{\s*\}/.test(prompt)) {
        return {
            isValid: false,
            error: 'Empty brackets {} found. Add seed text inside.',
            bracketCount: 0
        }
    }

    // Check for unbalanced brackets
    const openCount = (prompt.match(/\{/g) || []).length
    const closeCount = (prompt.match(/\}/g) || []).length

    if (openCount !== closeCount) {
        return {
            isValid: false,
            error: openCount > closeCount
                ? 'Missing closing bracket }'
                : 'Missing opening bracket {',
            bracketCount: 0
        }
    }

    const bracketCount = countSlotMachineBrackets(prompt)

    // Limit check
    if (bracketCount > 5) {
        return {
            isValid: false,
            error: `Too many brackets (${bracketCount}). Maximum is 5 per prompt.`,
            bracketCount
        }
    }

    return {
        isValid: true,
        bracketCount
    }
}

/**
 * Call the slot machine API to expand {brackets} to [variations]
 */
export async function expandSlotMachine(
    prompt: string,
    variationCount: number = 3
): Promise<SlotMachineResult> {
    try {
        // Pre-process: flatten nested brackets
        const processedPrompt = flattenNestedBrackets(prompt)

        // Validate syntax
        const validation = validateSlotMachineSyntax(processedPrompt)
        if (!validation.isValid) {
            return {
                success: false,
                expandedPrompt: prompt,
                slots: [],
                originalPrompt: prompt,
                variationCount,
                error: validation.error
            }
        }

        // If no brackets, return as-is
        if (!hasSlotMachineSyntax(processedPrompt)) {
            return {
                success: true,
                expandedPrompt: prompt,
                slots: [],
                originalPrompt: prompt,
                variationCount
            }
        }

        // Call API
        const response = await fetch('/api/slot-machine/expand', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: processedPrompt,
                variationCount
            })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            return {
                success: false,
                expandedPrompt: prompt,
                slots: [],
                originalPrompt: prompt,
                variationCount,
                error: errorData.error || `API error: ${response.status}`
            }
        }

        const data = await response.json()

        return {
            success: true,
            expandedPrompt: data.expandedPrompt || prompt,
            slots: data.slots || [],
            originalPrompt: prompt,
            variationCount: data.variationCount || variationCount
        }

    } catch (error) {
        console.error('Slot machine expansion error:', error)
        return {
            success: false,
            expandedPrompt: prompt,
            slots: [],
            originalPrompt: prompt,
            variationCount,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

/**
 * Get preview text showing what will be expanded
 */
export function getSlotMachinePreview(prompt: string): string {
    const seeds = detectSlotMachineSyntax(prompt)
    if (seeds.length === 0) return ''

    const seedList = seeds.map(s => `{${s}}`).join(', ')
    return `Will expand ${seeds.length} slot${seeds.length > 1 ? 's' : ''}: ${seedList}`
}
