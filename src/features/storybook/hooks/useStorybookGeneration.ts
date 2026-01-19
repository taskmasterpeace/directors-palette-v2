'use client'

import { useState, useCallback } from 'react'
import { useStorybookStore } from '../store/storybook.store'
import { useRecipes } from '@/features/shot-creator/hooks/useRecipes'
import type { BookFormat } from '../types/storybook.types'

// Default system recipe names for storybook (used as fallbacks)
const DEFAULT_RECIPE_NAMES = {
  STYLE_GUIDE: 'Storybook Style Guide',
  CHARACTER_SHEET: 'Storybook Character Sheet',
  CHARACTER_SHEET_FROM_DESCRIPTION: 'Storybook Character Sheet (From Description)',
  PAGE_FIRST: 'Storybook Page (First)',
  PAGE_CONTINUATION: 'Storybook Page (Continuation)',
  BOOK_COVER: 'Storybook Book Cover',
} as const

/**
 * Map BookFormat to image aspect ratio
 * CRITICAL: Images must be generated at the same aspect ratio as the book pages
 * to avoid cropping or letterboxing in the preview
 */
function getAspectRatioForBookFormat(format: BookFormat = 'square'): string {
  switch (format) {
    case 'square':
      return '1:1'  // 8.5" x 8.5" - most popular for children's books
    case 'landscape':
      return '7:10' // 7" x 10" landscape
    case 'portrait':
      return '4:5'  // 8" x 10" portrait
    case 'wide':
      return '11:8' // 8.25" x 6" panoramic
    default:
      return '1:1'
  }
}

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

  const { recipes } = useRecipes()

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

  /**
   * Get recipe name from config or fall back to default
   * Validates that the recipe actually exists before returning
   */
  const getRecipeName = useCallback((
    configRecipeId: string | undefined,
    defaultName: string
  ): string => {
    // First, try to find recipe by configured ID
    if (configRecipeId) {
      const recipe = recipes.find(r => r.id === configRecipeId)
      if (recipe) return recipe.name
      console.warn(`[useStorybookGeneration] Configured recipe ID "${configRecipeId}" not found, falling back to default`)
    }

    // Validate the default recipe exists
    const defaultRecipe = recipes.find(r => r.name === defaultName)
    if (!defaultRecipe) {
      console.warn(`[useStorybookGeneration] Default recipe "${defaultName}" not found in ${recipes.length} available recipes`)
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
  }, [setStyle, setGenerating, setError, getRecipeName, project?.recipeConfig?.styleGuideRecipeId])

  /**
   * Generate a character sheet from a photo OR description
   */
  const generateCharacterSheet = useCallback(async (
    characterId: string
  ): Promise<GenerationResult> => {
    const character = project?.characters.find(c => c.id === characterId)
    if (!character) {
      return { success: false, error: 'Character not found' }
    }

    // Determine if we have photo or description
    const hasPhoto = !!character.sourcePhotoUrl
    const hasDescription = !!character.description?.trim()

    if (!hasPhoto && !hasDescription) {
      return { success: false, error: 'Character needs either a photo or description to generate a character sheet' }
    }

    setState({ isGenerating: true, progress: `Generating character sheet for ${character.name}...`, error: null })
    setGenerating(true)

    try {
      let fieldValues: Record<string, string>
      const referenceImages: string[] = []
      let recipeName: string

      if (hasPhoto) {
        // Photo-based generation: use original 3-stage recipe
        fieldValues = {
          'stage0_field0_character_name': character.tag || character.name,
        }

        // Reference images: source photo + style guide
        referenceImages.push(character.sourcePhotoUrl!)
        if (project?.style?.styleGuideUrl) {
          referenceImages.push(project.style.styleGuideUrl)
        }

        recipeName = getRecipeName(
          project?.recipeConfig?.characterSheetRecipeId,
          DEFAULT_RECIPE_NAMES.CHARACTER_SHEET
        )
      } else {
        // Description-based generation: use 2-stage recipe
        fieldValues = {
          'stage0_field0_character_name': character.tag || character.name,
          'stage0_field1_character_role': 'main character',
          'stage0_field2_character_description': character.description!,
        }

        // Reference images: style guide is critical for description-based
        if (project?.style?.styleGuideUrl) {
          referenceImages.push(project.style.styleGuideUrl)
        }

        recipeName = DEFAULT_RECIPE_NAMES.CHARACTER_SHEET_FROM_DESCRIPTION
      }

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
  }, [project, updateCharacter, setGenerating, setError, getRecipeName])

  /**
   * Generate book cover with embedded title, author, and main character
   */
  const generateBookCover = useCallback(async (options?: {
    includeStoryText?: boolean
    storyText?: string
  }): Promise<GenerationResult> => {
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
      let mainCharacterDescription = mainCharacter
        ? `${mainCharacter.name}: A child character with distinctive features`
        : project.mainCharacterName || 'A child character'

      // Append story context if requested (for narrative-driven cover)
      if (options?.includeStoryText && options?.storyText) {
        mainCharacterDescription += `\n\nFull Story:\n${options.storyText}`
      }

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

      // Use dynamic aspect ratio based on book format
      const aspectRatio = getAspectRatioForBookFormat(project?.bookFormat)

      const response = await fetch(`/api/recipes/${recipeName}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio,
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
  }, [project, setGenerating, setError, getRecipeName])

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

      // Build field values from page data - include both main and supporting characters WITH descriptions
      const mainCharacterDescriptions = project?.characters.map(c => {
        const tag = `@${c.tag || c.name.replace(/\s+/g, '')}`
        return c.description ? `${tag}: ${c.description}` : tag
      }) || []
      const supportingCharacterDescriptions = project?.storyCharacters?.map(c => {
        const tag = `@${c.name.replace(/\s+/g, '')}`
        return c.description ? `${tag}: ${c.description}` : tag
      }) || []
      const allCharacterDescriptions = [...mainCharacterDescriptions, ...supportingCharacterDescriptions]
      const characterTags = allCharacterDescriptions.length > 0 ? allCharacterDescriptions.join(', ') : 'No named characters'

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
      // Use book format's aspect ratio to ensure images fit pages properly
      const aspectRatio = getAspectRatioForBookFormat(project?.bookFormat)

      const response = await fetch(`/api/recipes/${recipeName}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio,
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
  }, [project, updatePage, setGenerating, setError, getRecipeName])

  /**
   * Generate 3 additional cover variations on demand
   * Uses different approaches: one story-aware, two standard with AI randomness
   */
  const generateCoverVariations = useCallback(async (): Promise<GenerationResult[]> => {
    if (!project) return []

    setState({
      isGenerating: true,
      progress: 'Generating 3 cover variations...',
      error: null
    })
    setGenerating(true)

    try {
      // Generate 3 variations in parallel with different approaches:
      // 1. Story-aware: Include full story text for narrative interpretation
      // 2-3. Standard: Same prompt (AI randomness produces different results)

      const fullStoryText = project.pages.map(p => p.text).join('\n\n')

      const variations = await Promise.all([
        // Variation 1: With full story context (creative interpretation)
        generateBookCover({
          includeStoryText: true,
          storyText: fullStoryText
        }),

        // Variation 2-3: Standard approach (AI randomness)
        generateBookCover(),
        generateBookCover(),
      ])

      setState({ isGenerating: false, progress: null })
      setGenerating(false)

      return variations
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate variations'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return []
    }
  }, [project, generateBookCover, setGenerating, setError])

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,

    // Actions
    generateStyleGuide,
    generateCharacterSheet,
    generateBookCover,
    generateCoverVariations,
    generatePage,  // ← Renamed from generatePageVariations
  }
}
