import { SavedPrompt } from "../store/prompt-library-store";

/**
 * Category mapping configuration
 * Maps placeholder names to their corresponding category IDs
 */
export interface CategoryMapping {
  [placeholder: string]: string;
}

/**
 * Replacement result
 */
export interface ReplacementResult {
  processedPrompt: string;
  replacements: {
    placeholder: string;
    replacement: string;
    categoryId: string;
  }[];
}

/**
 * Prompt Replacement Service
 * Handles @ placeholder replacement logic for the prompt library
 * - Process category-based placeholders (e.g., @cinematic, @characters)
 * - Detect placeholders in prompts
 * - Generate preview text with replacements
 * - Support both category mappings and direct reference lookups
 */
export class PromptReplacementService {
  /**
   * Default category mappings for @ placeholders
   * These map common placeholder patterns to their category IDs
   */
  private readonly defaultCategoryMappings: CategoryMapping = {
    '@cinematic': 'cinematic',
    '@characters': 'characters',
    '@character': 'characters',
    '@lighting': 'lighting',
    '@environments': 'environments',
    '@environment': 'environments',
    '@location': 'environments',
    '@effects': 'effects',
    '@effect': 'effects',
    '@moods': 'moods',
    '@mood': 'moods',
    '@camera': 'camera',
    '@styles': 'styles',
    '@style': 'styles'
  };

  /**
   * Check if a prompt contains any @ placeholders
   * @param prompt - The prompt text to check
   * @returns True if placeholders are found, false otherwise
   */
  hasPlaceholders(prompt: string): boolean {
    return /@\w+/.test(prompt);
  }

  /**
   * Extract all @ placeholders from a prompt
   * @param prompt - The prompt text to analyze
   * @returns Array of unique placeholder strings (including the @ symbol)
   */
  extractPlaceholders(prompt: string): string[] {
    const matches = prompt.match(/@\w+/g);
    if (!matches) return [];

    // Return unique placeholders
    return Array.from(new Set(matches));
  }

  /**
   * Process @ placeholder replacements in a prompt
   * Replaces category-based placeholders with random prompts from those categories
   * @param prompt - The prompt text containing placeholders
   * @param prompts - Array of available saved prompts
   * @param categoryMappings - Optional custom category mappings (defaults to built-in mappings)
   * @returns Processed prompt string with placeholders replaced
   */
  processReplacements(
    prompt: string,
    prompts: SavedPrompt[],
    categoryMappings?: CategoryMapping
  ): string {
    let processedPrompt = prompt;
    const mappings = categoryMappings || this.defaultCategoryMappings;

    // Process each category mapping
    Object.entries(mappings).forEach(([placeholder, categoryId]) => {
      // Create case-insensitive regex for the placeholder
      const regex = new RegExp(placeholder.replace('@', '\\@'), 'gi');

      // Replace all occurrences of this placeholder
      processedPrompt = processedPrompt.replace(regex, () => {
        // Get all prompts in this category
        const categoryPrompts = prompts.filter(p => p.categoryId === categoryId);

        // If no prompts in category, return the placeholder unchanged
        if (categoryPrompts.length === 0) {
          return placeholder;
        }

        // Select a random prompt from the category
        const randomPrompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];

        // Get the first part of the prompt (before the first comma) or limit to 50 chars
        const snippet = randomPrompt.prompt.split(',')[0].trim();
        return snippet.length > 50 ? snippet.substring(0, 50) + '...' : snippet;
      });
    });

    return processedPrompt;
  }

  /**
   * Process @ placeholder replacements with detailed replacement information
   * @param prompt - The prompt text containing placeholders
   * @param prompts - Array of available saved prompts
   * @param categoryMappings - Optional custom category mappings
   * @returns ReplacementResult with processed prompt and replacement details
   */
  processReplacementsDetailed(
    prompt: string,
    prompts: SavedPrompt[],
    categoryMappings?: CategoryMapping
  ): ReplacementResult {
    let processedPrompt = prompt;
    const mappings = categoryMappings || this.defaultCategoryMappings;
    const replacements: ReplacementResult['replacements'] = [];

    Object.entries(mappings).forEach(([placeholder, categoryId]) => {
      const regex = new RegExp(placeholder.replace('@', '\\@'), 'gi');

      processedPrompt = processedPrompt.replace(regex, (match) => {
        const categoryPrompts = prompts.filter(p => p.categoryId === categoryId);

        if (categoryPrompts.length === 0) {
          return match;
        }

        const randomPrompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
        const snippet = randomPrompt.prompt.split(',')[0].trim();
        const replacement = snippet.length > 50 ? snippet.substring(0, 50) + '...' : snippet;

        replacements.push({
          placeholder: match,
          replacement,
          categoryId
        });

        return replacement;
      });
    });

    return {
      processedPrompt,
      replacements
    };
  }

  /**
   * Generate a preview of what a prompt will look like after replacements
   * Shows placeholders with example replacements in brackets
   * @param prompt - The prompt text containing placeholders
   * @param prompts - Array of available saved prompts
   * @param categoryMappings - Optional custom category mappings
   * @returns Preview string with placeholders replaced or annotated
   */
  generatePreview(
    prompt: string,
    prompts: SavedPrompt[],
    categoryMappings?: CategoryMapping
  ): string {
    let previewPrompt = prompt;
    const mappings = categoryMappings || this.defaultCategoryMappings;

    Object.entries(mappings).forEach(([placeholder, categoryId]) => {
      const regex = new RegExp(placeholder.replace('@', '\\@'), 'gi');

      previewPrompt = previewPrompt.replace(regex, () => {
        const categoryPrompts = prompts.filter(p => p.categoryId === categoryId);

        if (categoryPrompts.length === 0) {
          return `${placeholder} [no prompts in category]`;
        }

        // For preview, show first available prompt
        const examplePrompt = categoryPrompts[0];
        const snippet = examplePrompt.prompt.split(',')[0].trim();
        const truncated = snippet.length > 30 ? snippet.substring(0, 30) + '...' : snippet;

        return `[${truncated}]`;
      });
    });

    return previewPrompt;
  }

  /**
   * Get prompts from a specific category
   * Helper method for getting category-based prompts
   * @param prompts - Array of all prompts
   * @param categoryId - The category ID to filter by
   * @returns Array of prompts in the specified category
   */
  getPromptsByCategory(prompts: SavedPrompt[], categoryId: string): SavedPrompt[] {
    return prompts.filter(p => p.categoryId === categoryId);
  }

  /**
   * Validate that all placeholders in a prompt can be replaced
   * @param prompt - The prompt text to validate
   * @param prompts - Array of available saved prompts
   * @param categoryMappings - Optional custom category mappings
   * @returns Object with validation status and any missing categories
   */
  validatePlaceholders(
    prompt: string,
    prompts: SavedPrompt[],
    categoryMappings?: CategoryMapping
  ): {
    isValid: boolean;
    missingCategories: string[];
    unknownPlaceholders: string[];
  } {
    const mappings = categoryMappings || this.defaultCategoryMappings;
    const placeholders = this.extractPlaceholders(prompt);
    const missingCategories: string[] = [];
    const unknownPlaceholders: string[] = [];

    for (const placeholder of placeholders) {
      const normalizedPlaceholder = placeholder.toLowerCase();
      const categoryId = mappings[normalizedPlaceholder];

      if (!categoryId) {
        // Placeholder doesn't match any known category mapping
        unknownPlaceholders.push(placeholder);
      } else {
        // Check if category has prompts
        const categoryPrompts = prompts.filter(p => p.categoryId === categoryId);
        if (categoryPrompts.length === 0) {
          missingCategories.push(categoryId);
        }
      }
    }

    return {
      isValid: missingCategories.length === 0 && unknownPlaceholders.length === 0,
      missingCategories: Array.from(new Set(missingCategories)),
      unknownPlaceholders
    };
  }

  /**
   * Get the default category mappings
   * @returns The default category mapping configuration
   */
  getDefaultCategoryMappings(): CategoryMapping {
    return { ...this.defaultCategoryMappings };
  }

  /**
   * Add or update a category mapping
   * @param placeholder - The placeholder string (e.g., '@custom')
   * @param categoryId - The category ID to map to
   * @param customMappings - Existing custom mappings to update
   * @returns Updated category mappings
   */
  addCategoryMapping(
    placeholder: string,
    categoryId: string,
    customMappings?: CategoryMapping
  ): CategoryMapping {
    const normalizedPlaceholder = placeholder.startsWith('@') ? placeholder.toLowerCase() : `@${placeholder.toLowerCase()}`;

    return {
      ...(customMappings || this.defaultCategoryMappings),
      [normalizedPlaceholder]: categoryId
    };
  }

  /**
   * Get a random prompt from a specific category
   * @param prompts - Array of all prompts
   * @param categoryId - The category ID to select from
   * @returns A random prompt from the category, or null if none available
   */
  getRandomFromCategory(prompts: SavedPrompt[], categoryId: string): SavedPrompt | null {
    const categoryPrompts = prompts.filter(p => p.categoryId === categoryId);

    if (categoryPrompts.length === 0) {
      return null;
    }

    return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
  }
}

// Singleton instance
export const promptReplacementService = new PromptReplacementService();
