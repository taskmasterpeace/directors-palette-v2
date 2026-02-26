'use client'

import { NANO_BANANA_PROMPTS } from "@/features/shot-creator/constants/prompt-library-presets"
import { useEffect } from 'react'
import { usePromptLibraryStore } from "../../store/prompt-library-store"
import { logger } from '@/lib/logger'

// Module-level singleton pattern with Promise-based initialization
class PromptLoaderSingleton {
  private static instance: PromptLoaderSingleton | undefined
  private initializationPromise: Promise<void> | null = null
  private hasInitialized = false

  private constructor() { }

  public static getInstance(): PromptLoaderSingleton {
    if (!PromptLoaderSingleton.instance) {
      PromptLoaderSingleton.instance = new PromptLoaderSingleton()
    }
    return PromptLoaderSingleton.instance! // We know this isn't undefined after the check above
  }

  public async initialize(): Promise<void> {
    // If already initialized or initialization in progress, return the promise
    if (this.hasInitialized) {
      return Promise.resolve()
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    // Start initialization and store the promise
    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  private async performInitialization(): Promise<void> {
    try {
      // Check for browser environment
      if (typeof window === 'undefined') {
        return
      }

      // Get store and existing prompts
      const store = usePromptLibraryStore.getState()
      const existingPrompts = store.prompts

      // ONLY seed defaults if user has NO prompts (fresh account)
      // This ensures deleted prompts stay deleted
      if (existingPrompts.length > 0) {
        logger.shotCreator.info('📚 User has existing prompts, skipping default seeding')
        this.hasInitialized = true
        return
      }

      logger.shotCreator.info('📚 First time user - seeding default prompts...')

      // Add all default prompts for new users
      for (const preset of NANO_BANANA_PROMPTS) {
        try {
          await store.addPrompt({
            title: preset.title,
            prompt: preset.prompt,
            categoryId: preset.categoryId,
            tags: preset.tags,
            reference: preset.reference,
            isQuickAccess: preset.isQuickAccess || false,
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          })
        } catch (error) {
          logger.shotCreator.info('Note: Prompt added locally (Supabase save may have failed)', { error: error instanceof Error ? error.message : String(error) })
        }
      }

      logger.shotCreator.info('Seeded default prompts', { count: NANO_BANANA_PROMPTS.length })
      this.hasInitialized = true

    } catch (error) {
      this.initializationPromise = null
      throw error
    }
  }

}

// Export singleton instance
const promptLoaderSingleton = PromptLoaderSingleton.getInstance()

export function NanoBananaPromptLoader() {
  useEffect(() => {
    // Initialize the singleton - this will only run once across all component instances
    promptLoaderSingleton.initialize().catch(error => {
      logger.shotCreator.error('Failed to initialize prompt loader', { error: error instanceof Error ? error.message : String(error) })
    })
  }, []) // Empty dependency array - only run once on mount

  return null // This component doesn't render anything
}

// Utility function to manually clear all prompt duplicates
export async function clearAllPromptDuplicates(): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const store = usePromptLibraryStore.getState()
    store.deduplicatePrompts()
  } catch (error) {
    logger.shotCreator.error('❌ Error clearing prompt duplicates', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

// Utility function to reset the singleton and force re-initialization (for debugging)
export function resetPromptLoader(): void {
  // Reset the singleton instance
  PromptLoaderSingleton['instance'] = undefined
  promptLoaderSingleton['hasInitialized'] = false
  promptLoaderSingleton['initializationPromise'] = null
}