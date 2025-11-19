/**
 * Parse @reference tags from prompts
 * Distinguishes between prompt library categories and actual image references
 */

// Known prompt library categories that should NOT be treated as image references
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
])

/**
 * Extract @reference tags from a prompt
 * Returns only tags that are NOT prompt library categories
 *
 * @example
 * parseReferenceTags("Show @hero and @villain fighting in @cinematic lighting")
 * // Returns: ["@hero", "@villain"]
 * // Note: @cinematic is filtered out as it's a prompt library category
 */
export function parseReferenceTags(prompt: string): string[] {
  if (!prompt || typeof prompt !== 'string') {
    return []
  }

  // Match @-prefixed words (letters, numbers, underscores, hyphens)
  const regex = /@[a-zA-Z0-9_-]+/g
  const matches = prompt.match(regex) || []

  // Filter out prompt library categories and convert to lowercase for consistency
  const referenceTags = matches
    .map(tag => tag.toLowerCase())
    .filter(tag => !PROMPT_LIBRARY_CATEGORIES.has(tag))

  // Return unique tags only
  return [...new Set(referenceTags)]
}

/**
 * Check if a prompt contains any reference tags (excluding prompt library categories)
 */
export function hasReferenceTags(prompt: string): boolean {
  return parseReferenceTags(prompt).length > 0
}
