/**
 * Name Replacement Service
 * Handles replacing character names and @tags with their visual descriptions
 */

export interface CharacterReplacement {
    name: string
    description: string
    has_reference?: boolean
    aliases?: string[]
}

/**
 * Common English words that might be used as character names
 * These require case-sensitive matching to avoid false positives
 * e.g., "Black" (character) vs "black hair" (description)
 */
const COMMON_WORD_NAMES = new Set([
    // Colors
    'black', 'white', 'red', 'blue', 'green', 'grey', 'gray', 'brown',
    'gold', 'silver', 'rose', 'violet', 'scarlet', 'crimson', 'azure',
    // Common adjectives/nouns that could be names
    'stone', 'steel', 'iron', 'wolf', 'bear', 'hawk', 'crow', 'raven',
    'storm', 'shadow', 'blade', 'frost', 'flame', 'star', 'moon', 'sun',
    'king', 'queen', 'prince', 'knight', 'hunter', 'ranger', 'sage',
    // Single-word names that are also common words
    'jack', 'will', 'bill', 'bob', 'rob', 'mark', 'max', 'chase', 'hunter',
    'dawn', 'hope', 'faith', 'joy', 'grace', 'ivy', 'lily', 'rose', 'daisy',
])

/**
 * Check if a name is a common English word that needs case-sensitive matching
 */
export function isCommonWord(name: string): boolean {
    return COMMON_WORD_NAMES.has(name.toLowerCase())
}

/**
 * Build @tag replacements map from characters
 * @tags are in format @character_name (lowercase, underscores for spaces)
 */
export function buildTagReplacements(characters: CharacterReplacement[]): Record<string, string> {
    const replacements: Record<string, string> = {}

    for (const char of characters) {
        if (char.description && !char.has_reference) {
            const atName = '@' + char.name.toLowerCase().replace(/\s+/g, '_')
            replacements[atName] = char.description
            // Also create @tags for aliases so @marcus_fantroy resolves to the same description as @geechi_gotti
            if (char.aliases) {
                for (const alias of char.aliases) {
                    const aliasTag = '@' + alias.toLowerCase().replace(/\s+/g, '_')
                    replacements[aliasTag] = char.description
                }
            }
        }
    }

    return replacements
}

/**
 * Build name replacements array from characters
 * Sorted by name length descending to replace longer names first
 */
export function buildNameReplacements(characters: CharacterReplacement[]): Array<{ name: string; description: string }> {
    const replacements: Array<{ name: string; description: string }> = []

    for (const char of characters) {
        if (char.description && !char.has_reference) {
            replacements.push({ name: char.name, description: char.description })
            // Also replace alias names with the same description
            if (char.aliases) {
                for (const alias of char.aliases) {
                    replacements.push({ name: alias, description: char.description })
                }
            }
        }
    }

    // Sort by name length descending to replace longer names first
    // e.g., "Tay Roc" before "Tay" to avoid partial matches
    replacements.sort((a, b) => b.name.length - a.name.length)

    return replacements
}

/**
 * Replace @tags with descriptions in a prompt
 */
export function replaceAtTags(
    prompt: string,
    tagReplacements: Record<string, string>
): string {
    let result = prompt

    for (const [tag, description] of Object.entries(tagReplacements)) {
        // Escape special regex characters in the tag
        const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedTag, 'gi')
        result = result.replace(regex, description)
    }

    return result
}

/**
 * Replace plain character names with descriptions in a prompt
 * Uses word boundary matching to avoid partial replacements
 * Handles possessives (Marcus's, Marcus')
 * Supports unicode characters in names
 * Uses case-sensitive matching for common words to avoid false positives
 */
export function replaceNames(
    prompt: string,
    nameReplacements: Array<{ name: string; description: string }>
): string {
    let result = prompt

    for (const { name, description } of nameReplacements) {
        // Escape special regex characters in the name
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

        // Check if name contains non-ASCII characters (unicode)
        const hasUnicode = /[^\x00-\x7F]/.test(name)

        // Check if name is a common word (requires case-sensitive matching)
        const needsCaseSensitive = isCommonWord(name)

        // Determine regex flags: 'gi' for case-insensitive, 'g' for case-sensitive
        const flags = needsCaseSensitive ? 'g' : 'gi'

        let regex: RegExp
        if (hasUnicode) {
            // For unicode names, use lookahead/lookbehind for word boundaries
            // This handles characters like é, ü, etc.
            const unicodeFlags = needsCaseSensitive ? 'gu' : 'giu'
            regex = new RegExp(
                `(?<![\\p{L}\\p{N}])${escapedName}(?:'s?)?(?![\\p{L}\\p{N}])`,
                unicodeFlags
            )
        } else {
            // Standard word boundary for ASCII names
            // Matches: "Marcus", "Marcus's", "Marcus'"
            regex = new RegExp(`\\b${escapedName}(?:'s?)?\\b`, flags)
        }

        result = result.replace(regex, (match) => {
            // Preserve possessive suffix if present
            if (match.toLowerCase().endsWith("'s")) {
                return description + "'s"
            } else if (match.endsWith("'")) {
                return description + "'"
            }
            return description
        })
    }

    return result
}

/**
 * Full replacement: both @tags and plain names
 */
export function replaceAllCharacterReferences(
    prompt: string,
    characters: CharacterReplacement[]
): string {
    const tagReplacements = buildTagReplacements(characters)
    const nameReplacements = buildNameReplacements(characters)

    // First replace @tags, then plain names
    let result = replaceAtTags(prompt, tagReplacements)
    result = replaceNames(result, nameReplacements)

    return result
}

/**
 * Process multiple prompts at once
 */
export function processPromptBatch(
    prompts: string[],
    characters: CharacterReplacement[]
): string[] {
    const tagReplacements = buildTagReplacements(characters)
    const nameReplacements = buildNameReplacements(characters)

    return prompts.map(prompt => {
        let result = replaceAtTags(prompt, tagReplacements)
        result = replaceNames(result, nameReplacements)
        return result
    })
}
