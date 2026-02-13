'use client'

import { useStyleGuideGeneration } from './useStyleGuideGeneration'
import { useCharacterSheetGeneration } from './useCharacterSheetGeneration'
import { usePageGeneration } from './usePageGeneration'
import { useCoverGeneration } from './useCoverGeneration'

// Re-export utility functions and types for backward compatibility
export {
  getAspectRatioForBookFormat,
  getDualAspectRatio,
  aspectRatioToCss,
  type GenerationResult,
  type DualPageResult,
} from './useStorybookUtils'

/**
 * Facade hook composing all storybook generation hooks.
 * Components can import this for the full API, or import focused hooks directly.
 */
export function useStorybookGeneration() {
  const style = useStyleGuideGeneration()
  const character = useCharacterSheetGeneration()
  const page = usePageGeneration()
  const cover = useCoverGeneration()

  return {
    generateStyleGuide: style.generateStyleGuide,
    generateCharacterSheet: character.generateCharacterSheet,
    generatePage: page.generatePage,
    generateDualPage: page.generateDualPage,
    generateSpreadImage: page.generateSpreadImage,
    generateBookCover: cover.generateBookCover,
    generateCoverVariations: cover.generateCoverVariations,
    generateTitlePageVariations: cover.generateTitlePageVariations,
    generateBackCoverVariations: cover.generateBackCoverVariations,
    generateSynopsis: cover.generateSynopsis,
    isGenerating: style.isGenerating || character.isGenerating || page.isGenerating || cover.isGenerating,
    progress: style.progress || character.progress || page.progress || cover.progress,
    error: style.error || character.error || page.error || cover.error,
  }
}
