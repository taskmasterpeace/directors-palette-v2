/**
 * Parse @reference tags from prompts
 * Distinguishes between prompt library categories, reference library categories, and actual image references
 */

// Known prompt library categories that should NOT be treated as image references
// Also includes reserved syntax tags like @1 (Anchor Transform)
const PROMPT_LIBRARY_CATEGORIES = new Set([
  '@cinematic',
  '@characters',
  '@character',
  '@lighting',
  '@environments',
  '@environment',
  '@location',
  '@effects',
  '@effect',
  '@moods',
  '@mood',
  '@camera',
  '@styles',
  '@style',
  '@1',  // Reserved: Anchor Transform syntax
])

// Reference library categories for random selection
const REFERENCE_LIBRARY_CATEGORIES = new Set([
  '@people',
  '@places',
  '@props',
  '@layouts',
])

export type ReferenceCategory = 'people' | 'places' | 'props' | 'layouts'

export interface ParsedReferences {
  specificReferences: string[]  // e.g., ["@hero", "@villain"]
  categoryReferences: ReferenceCategory[]  // e.g., ["people", "places"]
  allReferences: string[]  // Combined list of all @ tags found
}

/**
 * Extract @reference tags from a prompt
 * Separates specific references from category-based random selections
 *
 * @example
 * parseReferenceTags("Show @hero fighting @people in @cinematic lighting")
 * // Returns: {
 * //   specificReferences: ["@hero"],
 * //   categoryReferences: ["people"],
 * //   allReferences: ["@hero", "@people"]
 * // }
 * // Note: @cinematic is filtered out as it's a prompt library category
 */
export function parseReferenceTags(prompt: string): ParsedReferences {
  if (!prompt || typeof prompt !== 'string') {
    return { specificReferences: [], categoryReferences: [], allReferences: [] }
  }

  // Match @-prefixed words (letters, numbers, underscores, hyphens)
  const regex = /@[a-zA-Z0-9_-]+/g
  const matches = prompt.match(regex) || []

  // Convert to lowercase for consistent matching
  const uniqueTags = [...new Set(matches.map(tag => tag.toLowerCase()))]

  // Separate into categories
  const specificReferences: string[] = []
  const categoryReferences: ReferenceCategory[] = []
  const allReferences: string[] = []

  uniqueTags.forEach(tag => {
    // Skip prompt library categories
    if (PROMPT_LIBRARY_CATEGORIES.has(tag)) {
      return
    }

    // Check if it's a reference library category
    if (REFERENCE_LIBRARY_CATEGORIES.has(tag)) {
      const category = tag.replace('@', '') as ReferenceCategory
      categoryReferences.push(category)
      allReferences.push(tag)
    } else {
      // It's a specific image reference
      specificReferences.push(tag)
      allReferences.push(tag)
    }
  })

  return {
    specificReferences,
    categoryReferences,
    allReferences
  }
}

/**
 * Check if a prompt contains any reference tags (excluding prompt library categories)
 */
export function hasReferenceTags(prompt: string): boolean {
  const parsed = parseReferenceTags(prompt)
  return parsed.allReferences.length > 0
}

/**
 * Check if a tag is a category reference (for random selection)
 */
export function isCategoryReference(tag: string): boolean {
  return REFERENCE_LIBRARY_CATEGORIES.has(tag.toLowerCase())
}

/**
 * Get category name from tag (removes @ prefix)
 */
export function getCategoryFromTag(tag: string): ReferenceCategory | null {
  const normalized = tag.toLowerCase().replace('@', '')
  if (['people', 'places', 'props', 'layouts'].includes(normalized)) {
    return normalized as ReferenceCategory
  }
  return null
}
