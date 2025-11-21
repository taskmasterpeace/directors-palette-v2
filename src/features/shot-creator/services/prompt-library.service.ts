import { SavedPrompt } from "../store/prompt-library-store";

/**
 * Validation result for prompts
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Sort options for prompts
 */
export type SortOption = 'usage' | 'date' | 'title';
export type SortDirection = 'asc' | 'desc';

/**
 * Prompt Library Service
 * Handles core business logic for prompt library management
 * - Validation
 * - Reference generation
 * - Tag sanitization
 * - Sorting
 * - Filtering
 * - Deduplication
 */
export class PromptLibraryService {
  /**
   * Validate a prompt before saving
   * @param prompt - The prompt text to validate
   * @param title - The prompt title to validate
   * @returns ValidationResult with isValid flag and error messages
   */
  validatePrompt(prompt: string, title: string): ValidationResult {
    const errors: string[] = [];

    // Validate title
    if (!title || title.trim().length === 0) {
      errors.push('Title is required');
    } else if (title.length < 2) {
      errors.push('Title must be at least 2 characters long');
    } else if (title.length > 100) {
      errors.push('Title must not exceed 100 characters');
    }

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      errors.push('Prompt is required');
    } else if (prompt.length < 3) {
      errors.push('Prompt must be at least 3 characters long');
    } else if (prompt.length > 5000) {
      errors.push('Prompt must not exceed 5000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a unique reference tag from a title
   * @param title - The prompt title
   * @param existingReferences - Optional array of existing references to avoid duplicates
   * @returns A unique @ reference (e.g., @my_prompt or @my_prompt_2)
   */
  generateReference(title: string, existingReferences?: string[]): string {
    // Convert title to lowercase and replace spaces/special chars with underscores
    let baseRef = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/[\s-]+/g, '_') // Replace spaces and hyphens with underscores
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    // Ensure the reference starts with a letter (not a number)
    if (/^\d/.test(baseRef)) {
      baseRef = `ref_${baseRef}`;
    }

    // If no existing references provided, return the base reference
    if (!existingReferences || existingReferences.length === 0) {
      return `@${baseRef}`;
    }

    // Check for duplicates and add a number suffix if needed
    let reference = `@${baseRef}`;
    let counter = 2;

    while (existingReferences.includes(reference)) {
      reference = `@${baseRef}_${counter}`;
      counter++;
    }

    return reference;
  }

  /**
   * Sanitize tags by removing empty values, trimming whitespace, and converting to lowercase
   * @param tags - Array of tag strings
   * @returns Sanitized array of unique tags
   */
  sanitizeTags(tags: string[]): string[] {
    return Array.from(
      new Set(
        tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length <= 50)
      )
    );
  }

  /**
   * Sort prompts by the specified criteria
   * @param prompts - Array of prompts to sort
   * @param sortBy - Sort criteria ('usage', 'date', or 'title')
   * @param direction - Sort direction ('asc' or 'desc')
   * @returns Sorted array of prompts
   */
  sortPrompts(
    prompts: SavedPrompt[],
    sortBy: SortOption = 'usage',
    direction: SortDirection = 'desc'
  ): SavedPrompt[] {
    const sorted = [...prompts];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'usage':
          comparison = a.usage.count - b.usage.count;
          if (comparison === 0) {
            // If usage is the same, sort by last used date
            comparison = new Date(b.usage.lastUsed).getTime() - new Date(a.usage.lastUsed).getTime();
          }
          break;

        case 'date':
          comparison = new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
          break;

        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;

        default:
          comparison = 0;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Filter prompts by category
   * @param prompts - Array of prompts to filter
   * @param categoryId - The category ID to filter by
   * @returns Filtered array of prompts
   */
  filterByCategory(prompts: SavedPrompt[], categoryId: string): SavedPrompt[] {
    return prompts.filter(prompt => prompt.categoryId === categoryId);
  }

  /**
   * Filter prompts by search query
   * Searches in title, prompt text, tags, and reference
   * @param prompts - Array of prompts to filter
   * @param query - Search query string
   * @returns Filtered array of prompts
   */
  filterByQuery(prompts: SavedPrompt[], query: string): SavedPrompt[] {
    if (!query || query.trim().length === 0) {
      return prompts;
    }

    const searchTerm = query.toLowerCase().trim();

    return prompts.filter(prompt =>
      prompt.title.toLowerCase().includes(searchTerm) ||
      prompt.prompt.toLowerCase().includes(searchTerm) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      prompt.reference?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Deduplicate prompts by ID
   * Keeps the first occurrence of each unique ID
   * @param prompts - Array of prompts to deduplicate
   * @returns Deduplicated array of prompts
   */
  deduplicatePrompts(prompts: SavedPrompt[]): SavedPrompt[] {
    const seenIds = new Set<string>();
    const deduplicated: SavedPrompt[] = [];

    for (const prompt of prompts) {
      if (!seenIds.has(prompt.id)) {
        seenIds.add(prompt.id);
        deduplicated.push(prompt);
      }
    }

    return deduplicated;
  }

  /**
   * Check if a prompt with the same title and category already exists
   * @param prompts - Array of existing prompts
   * @param title - The title to check
   * @param categoryId - The category ID to check
   * @param excludeId - Optional prompt ID to exclude from the check (for updates)
   * @returns True if a duplicate exists, false otherwise
   */
  hasDuplicate(
    prompts: SavedPrompt[],
    title: string,
    categoryId: string,
    excludeId?: string
  ): boolean {
    return prompts.some(
      prompt =>
        prompt.title === title &&
        prompt.categoryId === categoryId &&
        prompt.id !== excludeId
    );
  }

  /**
   * Get all unique references from prompts
   * @param prompts - Array of prompts
   * @returns Array of unique reference strings
   */
  getAllReferences(prompts: SavedPrompt[]): string[] {
    return prompts
      .map(prompt => prompt.reference)
      .filter((ref): ref is string => ref !== undefined && ref.length > 0);
  }

  /**
   * Find a prompt by its reference tag
   * @param prompts - Array of prompts to search
   * @param reference - The reference tag to find (with or without @)
   * @returns The matching prompt or undefined
   */
  findByReference(prompts: SavedPrompt[], reference: string): SavedPrompt | undefined {
    const normalizedRef = reference.startsWith('@') ? reference : `@${reference}`;
    return prompts.find(prompt => prompt.reference === normalizedRef);
  }

  /**
   * Get prompts filtered by quick access flag
   * @param prompts - Array of prompts to filter
   * @returns Array of quick access prompts
   */
  getQuickAccessPrompts(prompts: SavedPrompt[]): SavedPrompt[] {
    return prompts.filter(prompt => prompt.isQuickAccess);
  }

  /**
   * Get usage statistics for prompts
   * @param prompts - Array of prompts to analyze
   * @returns Statistics object
   */
  getStatistics(prompts: SavedPrompt[]): {
    totalPrompts: number;
    totalUsage: number;
    averageUsage: number;
    mostUsed: SavedPrompt | null;
    leastUsed: SavedPrompt | null;
    quickAccessCount: number;
  } {
    if (prompts.length === 0) {
      return {
        totalPrompts: 0,
        totalUsage: 0,
        averageUsage: 0,
        mostUsed: null,
        leastUsed: null,
        quickAccessCount: 0
      };
    }

    const totalUsage = prompts.reduce((sum, prompt) => sum + prompt.usage.count, 0);
    const sorted = [...prompts].sort((a, b) => b.usage.count - a.usage.count);

    return {
      totalPrompts: prompts.length,
      totalUsage,
      averageUsage: totalUsage / prompts.length,
      mostUsed: sorted[0] || null,
      leastUsed: sorted[sorted.length - 1] || null,
      quickAccessCount: prompts.filter(p => p.isQuickAccess).length
    };
  }
}

// Singleton instance
export const promptLibraryService = new PromptLibraryService();
