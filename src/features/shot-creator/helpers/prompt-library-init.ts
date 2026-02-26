// Prompt Library Initialization Module
// This module ensures the NanoBananaPromptLoader singleton is initialized
// once per application lifecycle, not per component render.

import { clearAllPromptDuplicates } from "@/features/shot-creator/components/creator-prompt-settings/NanoBananaPromptLoader"
import { logger } from '@/lib/logger'


// Module-level initialization flag
let moduleInitialized = false

// Function to initialize prompt library at module level
async function initializePromptLibrary(): Promise<void> {
  // Only run in browser environment
  if (typeof window === 'undefined') {
    return
  }

  if (moduleInitialized) {
    return
  }

  try {
    // Clear any existing duplicates immediately
    await clearAllPromptDuplicates()

    // Mark as initialized
    moduleInitialized = true

  } catch (error) {
    logger.shotCreator.error('❌ Prompt Library module initialization failed', { error: error instanceof Error ? error.message : String(error) })
    // Reset flag so it can be retried
    moduleInitialized = false
  }
}

// Auto-initialize when this module is imported (only in browser)
if (typeof window !== 'undefined') {
  initializePromptLibrary().catch((err: unknown) => logger.shotCreator.error('Prompt library init failed', { error: err instanceof Error ? err.message : String(err) }))
}

// Export function for manual re-initialization if needed
export function reinitializePromptLibrary(): Promise<void> {
  moduleInitialized = false
  return initializePromptLibrary()
}

// Export status check
export function isPromptLibraryInitialized(): boolean {
  return moduleInitialized
}