'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useStorybookStore } from '../store/storybook.store'
import { safeJsonParse } from '../utils/safe-fetch'
import {
  STORYBOOK_COST_PER_IMAGE,
  DEFAULT_RECIPE_NAMES,
  useRecipeLookup,
  useStorybookFolderId,
  type GenerationResult,
  type GenerationState,
} from './useStorybookUtils'

/**
 * Hook for style guide generation
 */
export function useStyleGuideGeneration() {
  const {
    project,
    setStyle,
    setGenerating,
    setError,
  } = useStorybookStore()

  const { getRecipeName } = useRecipeLookup()
  const { getStorybookFolderId, getStorybookMetadata } = useStorybookFolderId()

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

  const generateStyleGuide = useCallback(async (
    styleName: string,
    styleDescription?: string,
    referenceImageUrl?: string
  ): Promise<GenerationResult> => {
    const cost = Math.ceil(STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating style guide (${cost} pts)`, { duration: 2000 })

    setState({ isGenerating: true, progress: 'Generating style guide...', error: null })
    setGenerating(true)

    try {
      const fieldValues = {
        'stage0_field0_style_name': styleName,
        'stage0_field1_style_description': styleDescription || '',
      }

      const referenceImages = referenceImageUrl ? [referenceImageUrl] : []

      const recipeName = getRecipeName(
        project?.recipeConfig?.styleGuideRecipeId,
        DEFAULT_RECIPE_NAMES.STYLE_GUIDE
      )

      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('style-guide')

      const response = await fetch(`/api/recipes/${recipeName}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio: '16:9',
            outputFormat: 'png',
          },
          folderId,
          extraMetadata,
        }),
      })

      const data = await safeJsonParse(response)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate style guide')
      }

      setStyle({
        id: crypto.randomUUID(),
        name: styleName,
        description: styleDescription,
        styleGuideUrl: data.imageUrl,
        previewUrl: data.imageUrl,
      })

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return { success: true, imageUrl: data.imageUrl, predictionId: data.predictionId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [setStyle, setGenerating, setError, getRecipeName, project?.recipeConfig?.styleGuideRecipeId, getStorybookFolderId, getStorybookMetadata])

  return {
    generateStyleGuide,
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
  }
}
