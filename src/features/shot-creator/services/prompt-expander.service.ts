/**
 * Prompt Expander Service
 *
 * Expands prompts with cinematographic detail while preserving the user's core text.
 * Caches results to avoid redundant API calls.
 */

export type ExpansionLevel = 'original' | '2x' | '3x'
export type DirectorStyle = 'none' | 'ryan' | 'clint' | 'david' | 'wes' | 'hype'

interface ExpandResponse {
    original: string
    expanded: string
    level: string
    director: string
}

interface CacheEntry {
    original: string
    expansions: Map<string, string> // key = "2x" or "3x" or "2x_ryan" etc
}

class PromptExpanderService {
    private cache: Map<string, CacheEntry> = new Map()

    /**
     * Generate cache key for a specific expansion
     */
    private getCacheKey(level: '2x' | '3x', director: DirectorStyle): string {
        return director !== 'none' ? `${level}_${director}` : level
    }

    /**
     * Expand a prompt to the specified detail level
     */
    async expand(
        prompt: string,
        level: '2x' | '3x',
        director: DirectorStyle = 'none'
    ): Promise<string> {
        const trimmedPrompt = prompt.trim()

        // Check cache first
        const cached = this.cache.get(trimmedPrompt)
        const cacheKey = this.getCacheKey(level, director)

        if (cached?.expansions.has(cacheKey)) {
            return cached.expansions.get(cacheKey)!
        }

        // Call API
        const response = await fetch('/api/prompt-expander', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: trimmedPrompt, level, director })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to expand prompt')
        }

        const data: ExpandResponse = await response.json()

        // Store in cache
        if (!this.cache.has(trimmedPrompt)) {
            this.cache.set(trimmedPrompt, {
                original: trimmedPrompt,
                expansions: new Map()
            })
        }

        this.cache.get(trimmedPrompt)!.expansions.set(cacheKey, data.expanded)

        return data.expanded
    }

    /**
     * Get original prompt from cache (if expansion was applied)
     */
    getOriginal(expandedPrompt: string): string | null {
        for (const [original, entry] of this.cache.entries()) {
            for (const expanded of entry.expansions.values()) {
                if (expanded === expandedPrompt) {
                    return original
                }
            }
        }
        return null
    }

    /**
     * Check if a prompt has cached expansions
     */
    hasCachedExpansions(prompt: string): boolean {
        return this.cache.has(prompt.trim())
    }

    /**
     * Get cached expansion if available
     */
    getCachedExpansion(
        prompt: string,
        level: '2x' | '3x',
        director: DirectorStyle = 'none'
    ): string | null {
        const cached = this.cache.get(prompt.trim())
        if (!cached) return null

        const cacheKey = this.getCacheKey(level, director)
        return cached.expansions.get(cacheKey) || null
    }

    /**
     * Clear cache for a specific prompt (call when user edits prompt)
     */
    clearCache(prompt: string): void {
        this.cache.delete(prompt.trim())
    }

    /**
     * Clear all cached expansions
     */
    clearAllCache(): void {
        this.cache.clear()
    }
}

// Export singleton instance
export const promptExpanderService = new PromptExpanderService()
