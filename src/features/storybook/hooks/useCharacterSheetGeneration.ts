'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useStorybookStore } from '../store/storybook.store'
import { useGenerationStateStore } from '../store/generation.store'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import {
  STORYBOOK_COST_PER_IMAGE,
  DEFAULT_RECIPE_NAMES,
  useRecipeLookup,
  useStorybookFolderId,
  type GenerationResult,
  type GenerationState,
} from './useStorybookUtils'

/**
 * Hook for character sheet generation (from photo or description)
 */
export function useCharacterSheetGeneration() {
  const {
    project,
    updateCharacter,
  } = useStorybookStore()

  const { setGenerating, setError } = useGenerationStateStore()

  const { getRecipeName } = useRecipeLookup()
  const { getStorybookFolderId, getStorybookMetadata } = useStorybookFolderId()

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

  const generateCharacterSheet = useCallback(async (
    characterId: string
  ): Promise<GenerationResult> => {
    const character = project?.bookCharacters?.find(c => c.id === characterId)
      || project?.characters.find(c => c.id === characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    const hasPhoto = !!(character.sourcePhotoUrls?.length)
    const hasDescription = !!character.description?.trim()

    if (!hasPhoto && !hasDescription) {
      return { success: false, error: 'Character needs either a photo or description to generate a character sheet' }
    }

    const cost = Math.ceil(STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating character sheet (${cost} pts)`, { duration: 2000 })

    setState({ isGenerating: true, progress: `Generating character sheet for ${character.name}...`, error: null })
    setGenerating(true)

    try {
      let fieldValues: Record<string, string>
      const referenceImages: string[] = []
      let recipeName: string

      if (hasPhoto) {
        fieldValues = {
          'stage0_field0_character_name': character.tag || character.name,
        }

        if (character.outfitDescription?.trim()) {
          fieldValues['stage0_field1_outfit_description'] = character.outfitDescription.trim()
        }

        const photoUrls = (character.sourcePhotoUrls || []).filter(Boolean)
        photoUrls.forEach(url => referenceImages.push(url))

        if (project?.style?.styleGuideUrl) {
          referenceImages.push(project.style.styleGuideUrl)
        }

        recipeName = getRecipeName(
          project?.recipeConfig?.characterSheetRecipeId,
          DEFAULT_RECIPE_NAMES.CHARACTER_SHEET
        )
      } else {
        fieldValues = {
          'stage0_field0_character_name': character.tag || character.name,
          'stage0_field1_character_role': 'main character',
          'stage0_field2_character_description': character.description!,
        }

        if (project?.style?.styleGuideUrl) {
          referenceImages.push(project.style.styleGuideUrl)
        }

        recipeName = DEFAULT_RECIPE_NAMES.CHARACTER_SHEET_FROM_DESCRIPTION
      }

      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('character-sheet', {
        characterName: character.name,
      })

      const response = await fetch(`/api/recipes/${recipeName}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio: '21:9',
            outputFormat: 'png',
          },
          folderId,
          extraMetadata,
        }),
      })

      const data = await safeJsonParse(response)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate character sheet')
      }

      updateCharacter(characterId, { characterSheetUrl: data.imageUrl })

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
  }, [project, updateCharacter, setGenerating, setError, getRecipeName, getStorybookFolderId, getStorybookMetadata])

  return {
    generateCharacterSheet,
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
  }
}
