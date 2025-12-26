import { WildCard } from '@/features/shot-creator/helpers/wildcard/parser'

/**
 * Wildcard Filter Service
 * Handles filtering logic for wildcards in the sidebar
 * - Filtering by search query (name, category, content, description)
 * - Filtering by category
 */
export class WildcardFilterService {
  /**
   * Filter wildcards by search query
   * Searches in name, category, content (entries), and description (case-insensitive)
   * @param wildcards - Array of wildcards to filter
   * @param query - Search query string
   * @returns Filtered array of wildcards
   */
  filterByQuery(wildcards: WildCard[], query: string): WildCard[] {
    if (!query || query.trim().length === 0) {
      return wildcards
    }

    const searchTerm = query.toLowerCase().trim()

    return wildcards.filter(wildcard =>
      wildcard.name.toLowerCase().includes(searchTerm) ||
      wildcard.category.toLowerCase().includes(searchTerm) ||
      wildcard.content.toLowerCase().includes(searchTerm) ||
      wildcard.description?.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * Filter wildcards by category
   * @param wildcards - Array of wildcards to filter
   * @param category - The category to filter by (exact match)
   * @returns Filtered array of wildcards
   */
  filterByCategory(wildcards: WildCard[], category: string): WildCard[] {
    if (!category || category.trim().length === 0) {
      return wildcards
    }

    return wildcards.filter(wildcard => wildcard.category === category)
  }
}

// Singleton instance
export const wildcardFilterService = new WildcardFilterService()
