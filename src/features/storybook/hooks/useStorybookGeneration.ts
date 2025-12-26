'use client'

import { useState, useCallback } from 'react'
import { useStorybookStore } from '../store/storybook.store'

// System recipe names for storybook
const SYSTEM_RECIPE_NAMES = {
  STYLE_GUIDE: 'Storybook Style Guide',
  CHARACTER_SHEET: 'Storybook Character Sheet',
  PAGE: 'Storybook Page (Single Image)'
} as const

interface GenerationResult {
  success: boolean
  imageUrl?: string
  error?: string
  predictionId?: string
  galleryId?: string
}

interface GenerationState {
  isGenerating: boolean
  progress: string
  error: string | null
}

/**
 * Hook for handling all Storybook image generation
 * Manages style guides, character sheets, and page variations
 */
export function useStorybookGeneration() {
  const {
    project,
    setStyle,
    updateCharacter,
    updatePage,
    setGenerating,
    setError,
  } = useStorybookStore()

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

  /**
   * Generate a style guide with optional reference image
   */
  const generateStyleGuide = useCallback(async (
    styleName: string,
    styleDescription?: string,
    referenceImageUrl?: string
  ): Promise<GenerationResult> => {
    setState({ isGenerating: true, progress: 'Generating style guide...', error: null })
    setGenerating(true)

    try {
      // Build field values for recipe
      const fieldValues = {
        'stage0_field0_style_name': styleName,
        'stage0_field1_style_description': styleDescription || '',
      }

      const referenceImages = referenceImageUrl ? [referenceImageUrl] : []

      // Call recipe execution API
      const response = await fetch(`/api/recipes/${SYSTEM_RECIPE_NAMES.STYLE_GUIDE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio: '16:9',
            outputFormat: 'png',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate style guide')
      }

      // Update store with the new style
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
  }, [setStyle, setGenerating, setError])

  /**
   * Generate a character sheet from a photo
   */
  const generateCharacterSheet = useCallback(async (
    characterId: string
  ): Promise<GenerationResult> => {
    const character = project?.characters.find(c => c.id === characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    setState({ isGenerating: true, progress: `Generating character sheet for ${character.name}...`, error: null })
    setGenerating(true)

    try {
      // Build field values for recipe
      const fieldValues = {
        'stage0_field0_character_name': character.tag || character.name,
      }

      // Auto-attach reference images: source photo + style guide
      const referenceImages: string[] = []
      if (character.sourcePhotoUrl) {
        referenceImages.push(character.sourcePhotoUrl)
      }
      if (project?.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }
      // Template is already in recipe's stage.referenceImages

      // Call recipe execution API
      const response = await fetch(`/api/recipes/${SYSTEM_RECIPE_NAMES.CHARACTER_SHEET}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio: '21:9',
            outputFormat: 'png',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate character sheet')
      }

      // Update character with the generated sheet
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
  }, [project, updateCharacter, setGenerating, setError])

  /**
   * Generate a single page illustration (renamed from generatePageVariations)
   */
  const generatePage = useCallback(async (
    pageId: string
  ): Promise<GenerationResult> => {
    const page = project?.pages.find(p => p.id === pageId)
    if (!page) {
      return { success: false, error: 'Page not found' }
    }

    setState({ isGenerating: true, progress: 'Generating page illustration...', error: null })
    setGenerating(true)

    try {
      // Build field values from page data
      const characterTags = project?.characters.map(c => `@${c.tag || c.name.replace(/\s+/g, '')}`).join(', ') || 'No named characters'

      const fieldValues = {
        'stage0_field0_page_text': page.text,
        'stage0_field1_scene_description': page.sceneJSON ? JSON.stringify(page.sceneJSON.scene) : '',
        'stage0_field2_shot_type': page.sceneJSON?.camera.shot || 'Medium Shot',
        'stage0_field3_mood': page.sceneJSON?.scene.mood || 'Happy',
        'stage0_field4_character_names': characterTags,
        'stage0_field5_target_age': project?.targetAge.toString() || '5',
      }

      // Auto-attach reference images: style guide + all character sheets
      const referenceImages: string[] = []
      if (project?.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }
      const characterSheetUrls = project?.characters
        .filter(c => c.characterSheetUrl)
        .map(c => c.characterSheetUrl!) || []
      referenceImages.push(...characterSheetUrls)

      // Call recipe execution API
      const response = await fetch(`/api/recipes/${SYSTEM_RECIPE_NAMES.PAGE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio: '16:9',
            outputFormat: 'png',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate page')
      }

      // Update page with the generated image (single image, no grid)
      updatePage(pageId, {
        imageUrl: data.imageUrl,
        gridImageUrl: undefined, // No longer using grid
        variationUrls: [], // No longer using variations
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
  }, [project, updatePage, setGenerating, setError])

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,

    // Actions
    generateStyleGuide,
    generateCharacterSheet,
    generatePage,  // ← Renamed from generatePageVariations
  }
}
