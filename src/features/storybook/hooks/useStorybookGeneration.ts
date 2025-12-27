'use client'

import { useState, useCallback } from 'react'
import { useStorybookStore } from '../store/storybook.store'
import { useRecipeStore } from '@/features/shot-creator/store/recipe.store'

// Default system recipe names for storybook (used as fallbacks)
const DEFAULT_RECIPE_NAMES = {
  STYLE_GUIDE: 'Storybook Style Guide',
  CHARACTER_SHEET: 'Storybook Character Sheet',
  PAGE_FIRST: 'Storybook Page (First)',
  PAGE_CONTINUATION: 'Storybook Page (Continuation)',
  BOOK_COVER: 'Storybook Book Cover',
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

  const { recipes } = useRecipeStore()

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

  /**
   * Get recipe name from config or fall back to default
   */
  const getRecipeName = useCallback((
    configRecipeId: string | undefined,
    defaultName: string
  ): string => {
    if (configRecipeId) {
      const recipe = recipes.find(r => r.id === configRecipeId)
      if (recipe) return recipe.name
    }
    return defaultName
  }, [recipes])

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

      // Get recipe name from config or use default
      const recipeName = getRecipeName(
        project?.recipeConfig?.styleGuideRecipeId,
        DEFAULT_RECIPE_NAMES.STYLE_GUIDE
      )

      // Call recipe execution API
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

      // Get recipe name from config or use default
      const recipeName = getRecipeName(
        project?.recipeConfig?.characterSheetRecipeId,
        DEFAULT_RECIPE_NAMES.CHARACTER_SHEET
      )

      // Call recipe execution API
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
   * Generate book cover with embedded title, author, and main character
   */
  const generateBookCover = useCallback(async (): Promise<GenerationResult> => {
    if (!project) {
      return { success: false, error: 'No project found' }
    }

    if (!project.title) {
      return { success: false, error: 'Book title is required for cover generation' }
    }

    if (!project.author) {
      return { success: false, error: 'Author name is required for cover generation' }
    }

    setState({ isGenerating: true, progress: 'Generating book cover...', error: null })
    setGenerating(true)

    try {
      // Get main character description
      const mainCharacter = project.characters[0] // Assuming first character is main
      const mainCharacterDescription = mainCharacter
        ? `${mainCharacter.name}: A child character with distinctive features`
        : project.mainCharacterName || 'A child character'

      const fieldValues = {
        'stage0_field0_book_title': project.title,
        'stage0_field1_author_name': project.author,
        'stage0_field2_target_age': project.targetAge.toString(),
        'stage0_field3_main_character_description': mainCharacterDescription,
      }

      // Auto-attach reference images: style guide + main character sheet
      const referenceImages: string[] = []
      if (project.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }
      if (mainCharacter?.characterSheetUrl) {
        referenceImages.push(mainCharacter.characterSheetUrl)
      }

      // Get recipe name from config or use default
      const recipeName = getRecipeName(
        project?.recipeConfig?.bookCoverRecipeId,
        DEFAULT_RECIPE_NAMES.BOOK_COVER
      )

      const response = await fetch(`/api/recipes/${recipeName}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio: '3:4',
            outputFormat: 'png',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate book cover')
      }

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
  }, [project, setGenerating, setError])

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
      // Calculate page index and detect first page
      const pageIndex = project?.pages.findIndex(p => p.id === pageId) ?? -1
      const isFirstPage = pageIndex === 0

      // Build field values from page data - include both main and supporting characters
      const mainCharacterTags = project?.characters.map(c => `@${c.tag || c.name.replace(/\s+/g, '')}`) || []
      const supportingCharacterTags = project?.storyCharacters?.map(c => `@${c.name.replace(/\s+/g, '')}`) || []
      const allCharacterTags = [...mainCharacterTags, ...supportingCharacterTags]
      const characterTags = allCharacterTags.length > 0 ? allCharacterTags.join(', ') : 'No named characters'

      // Build field values and select recipe based on page type
      let fieldValues: Record<string, string>
      let recipeName: string

      if (isFirstPage) {
        // First page - NO previous_page_text field
        recipeName = getRecipeName(
          project?.recipeConfig?.pageFirstRecipeId,
          DEFAULT_RECIPE_NAMES.PAGE_FIRST
        )
        fieldValues = {
          'stage0_field0_page_text': page.text,
          'stage0_field1_scene_description': page.sceneJSON ? JSON.stringify(page.sceneJSON.scene) : '',
          'stage0_field2_mood': page.sceneJSON?.scene.mood || 'Happy',
          'stage0_field3_character_names': characterTags,
          'stage0_field4_target_age': project?.targetAge.toString() || '5',
        }
      } else {
        // Continuation page - WITH previous_page_text field
        const previousPage = project?.pages[pageIndex - 1]
        recipeName = getRecipeName(
          project?.recipeConfig?.pageContinuationRecipeId,
          DEFAULT_RECIPE_NAMES.PAGE_CONTINUATION
        )
        fieldValues = {
          'stage0_field0_previous_page_text': previousPage?.text || '',
          'stage0_field1_page_text': page.text,
          'stage0_field2_scene_description': page.sceneJSON ? JSON.stringify(page.sceneJSON.scene) : '',
          'stage0_field3_mood': page.sceneJSON?.scene.mood || 'Happy',
          'stage0_field4_character_names': characterTags,
          'stage0_field5_target_age': project?.targetAge.toString() || '5',
        }
      }

      // Auto-attach reference images: style guide + all character sheets (main + supporting)
      const referenceImages: string[] = []
      if (project?.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }
      // Include main character sheets
      const mainCharacterSheetUrls = project?.characters
        .filter(c => c.characterSheetUrl)
        .map(c => c.characterSheetUrl!) || []
      referenceImages.push(...mainCharacterSheetUrls)
      // Include supporting character sheets
      const supportingCharacterSheetUrls = project?.storyCharacters
        ?.filter(c => c.characterSheetUrl)
        .map(c => c.characterSheetUrl!) || []
      referenceImages.push(...supportingCharacterSheetUrls)

      // Call recipe execution API with selected recipe
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
    generateBookCover,
    generatePage,  // ← Renamed from generatePageVariations
  }
}
