'use client'

import { useState, useCallback, useRef } from 'react'
import { useStorybookStore } from '../store/storybook.store'
import { useRecipes } from '@/features/shot-creator/hooks/useRecipes'
import type { BookFormat } from '../types/storybook.types'
import {
  getOrCreateStorybookFolder,
  buildStorybookMetadata,
  type StorybookAssetType,
} from '../services/storybook-folder.service'
import { useAuth } from '@/features/auth/hooks/useAuth'

// Default system recipe names for storybook (used as fallbacks)
const DEFAULT_RECIPE_NAMES = {
  STYLE_GUIDE: 'Storybook Style Guide',
  CHARACTER_SHEET: 'Storybook Character Sheet',
  CHARACTER_SHEET_FROM_DESCRIPTION: 'Storybook Character Sheet (From Description)',
  PAGE_FIRST: 'Storybook Page (First)',
  PAGE_CONTINUATION: 'Storybook Page (Continuation)',
  BOOK_COVER: 'Storybook Book Cover',
  DUAL_PAGE: 'Storybook Dual Page',
} as const

/**
 * Map BookFormat to image aspect ratio
 * CRITICAL: Images must be generated at the same aspect ratio as the book pages
 * to avoid cropping or letterboxing in the preview
 */
export function getAspectRatioForBookFormat(format: BookFormat = 'square'): string {
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

/**
 * Get 2:1 aspect ratio for dual-page generation (two pages side by side)
 * This creates an image twice as wide as tall, which gets split into two pages
 */
export function getDualAspectRatio(): string {
  // All book formats use 2:1 for dual-page - the image is split exactly in half
  return '2:1'
}

/**
 * Convert aspect ratio string to CSS aspect-ratio value
 * e.g., "4:5" -> "4/5"
 */
export function aspectRatioToCss(aspectRatio: string): string {
  return aspectRatio.replace(':', '/')
}

interface GenerationResult {
  success: boolean
  imageUrl?: string
  error?: string
  predictionId?: string
  galleryId?: string
}

/**
 * Result for dual-page generation
 * Contains two image URLs: one for left page, one for right page
 */
interface DualPageResult {
  success: boolean
  leftPageImageUrl?: string
  rightPageImageUrl?: string
  error?: string
  predictionId?: string
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
  const { user } = useAuth()

  // Cache folder ID to avoid multiple lookups
  const folderIdCache = useRef<{ projectId: string; folderId: string | null } | null>(null)

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

  /**
   * Get or create folder for current storybook project
   * Caches result to avoid multiple DB calls
   */
  const getStorybookFolderId = useCallback(async (): Promise<string | null> => {
    if (!user?.id || !project?.id) return null

    // Return cached folder ID if same project
    if (folderIdCache.current?.projectId === project.id) {
      return folderIdCache.current.folderId
    }

    // Get or create folder
    const folderId = await getOrCreateStorybookFolder(
      user.id,
      project.id,
      project.title || 'Untitled Book'
    )

    // Cache result
    folderIdCache.current = { projectId: project.id, folderId }

    return folderId
  }, [user?.id, project?.id, project?.title])

  /**
   * Build gallery metadata for a storybook asset
   */
  const getStorybookMetadata = useCallback((
    assetType: StorybookAssetType,
    options?: { pageNumber?: number; characterName?: string }
  ) => {
    if (!project) return undefined

    return buildStorybookMetadata(
      project.id,
      project.title || 'Untitled Book',
      assetType,
      options
    )
  }, [project])

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

      // Get folder and metadata for gallery organization
      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('style-guide')

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
          // Gallery organization
          folderId,
          extraMetadata,
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
  }, [setStyle, setGenerating, setError, getRecipeName, project?.recipeConfig?.styleGuideRecipeId, getStorybookFolderId, getStorybookMetadata])

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

      // Get folder and metadata for gallery organization
      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('character-sheet', {
        characterName: character.name,
      })

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
          // Gallery organization
          folderId,
          extraMetadata,
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
  }, [project, updateCharacter, setGenerating, setError, getRecipeName, getStorybookFolderId, getStorybookMetadata])

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
      // Build comprehensive character description for cover
      // Include ALL characters with descriptions (main + supporting) for multi-character covers
      const characterDescriptions: string[] = []

      // Main character (first character)
      const mainCharacter = project.characters[0]
      if (mainCharacter) {
        const desc = mainCharacter.description ||
                    `${mainCharacter.name}: A ${project.targetAge}-year-old child with distinctive features`
        characterDescriptions.push(`MAIN CHARACTER: ${desc}`)
      }

      // Supporting characters (if any) - up to 2 additional for multi-character covers
      const supportingCharacters = project.characters.slice(1, 3)
      supportingCharacters.forEach((char, index) => {
        if (char.description || char.name) {
          const desc = char.description || `${char.name}: A supporting character`
          characterDescriptions.push(`SUPPORTING CHARACTER ${index + 1}: ${desc}`)
        }
      })

      // Fallback if no characters defined
      let mainCharacterDescription = characterDescriptions.length > 0
        ? characterDescriptions.join('\n\n')
        : project.mainCharacterName
          ? `${project.mainCharacterName}: A ${project.targetAge}-year-old child`
          : `A ${project.targetAge}-year-old child character`

      // Append story context if requested (for narrative-driven cover)
      if (options?.includeStoryText && options?.storyText) {
        mainCharacterDescription += `\n\nSTORY CONTEXT:\n${options.storyText}`
      }

      const fieldValues = {
        'stage0_field0_book_title': project.title,
        'stage0_field1_author_name': project.author,
        'stage0_field2_target_age': project.targetAge.toString(),
        'stage0_field3_main_character_description': mainCharacterDescription,
      }

      // Auto-attach reference images: style guide + ALL character sheets (up to 3)
      const referenceImages: string[] = []
      if (project.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }

      // Add character sheets for all characters (main + supporting, up to 3 total)
      project.characters.slice(0, 3).forEach(char => {
        if (char.characterSheetUrl) {
          referenceImages.push(char.characterSheetUrl)
        }
      })

      // Get recipe name from config or use default
      const recipeName = getRecipeName(
        project?.recipeConfig?.bookCoverRecipeId,
        DEFAULT_RECIPE_NAMES.BOOK_COVER
      )

      // Use dynamic aspect ratio based on book format
      const aspectRatio = getAspectRatioForBookFormat(project?.bookFormat)

      // Get folder and metadata for gallery organization
      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('cover')

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
          // Gallery organization
          folderId,
          extraMetadata,
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
  }, [project, setGenerating, setError, getRecipeName, getStorybookFolderId, getStorybookMetadata])

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

      // Get folder and metadata for gallery organization
      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('page', { pageNumber: pageIndex + 1 })

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
          // Gallery organization
          folderId,
          extraMetadata,
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
  }, [project, updatePage, setGenerating, setError, getRecipeName, getStorybookFolderId, getStorybookMetadata])

  /**
   * Generate a dual-page spread (two pages in one image, then split)
   * This costs 50% less than generating pages individually
   *
   * @param leftPageId - ID of the left page
   * @param rightPageId - ID of the right page
   * @returns Result with both page image URLs
   */
  const generateDualPage = useCallback(async (
    leftPageId: string,
    rightPageId: string
  ): Promise<DualPageResult> => {
    const leftPage = project?.pages.find(p => p.id === leftPageId)
    const rightPage = project?.pages.find(p => p.id === rightPageId)

    if (!leftPage || !rightPage) {
      return { success: false, error: 'One or both pages not found' }
    }

    // Get page indices for logging
    const leftPageIndex = project?.pages.findIndex(p => p.id === leftPageId) ?? -1
    const rightPageIndex = project?.pages.findIndex(p => p.id === rightPageId) ?? -1

    setState({ isGenerating: true, progress: `Generating pages ${leftPageIndex + 1}-${rightPageIndex + 1} as spread...`, error: null })
    setGenerating(true)

    try {
      // Build character descriptions (same as single page)
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

      // Get previous page text for continuity (page before leftPage)
      const previousPage = leftPageIndex > 0 ? project?.pages[leftPageIndex - 1] : null

      // Build field values for dual-page recipe
      const fieldValues: Record<string, string> = {
        'stage0_field0_previous_page_text': previousPage?.text || '',
        'stage0_field1_left_page_number': (leftPageIndex + 1).toString(),
        'stage0_field2_left_page_text': leftPage.text,
        'stage0_field3_left_scene_description': leftPage.sceneJSON ? JSON.stringify(leftPage.sceneJSON.scene) : '',
        'stage0_field4_right_page_number': (rightPageIndex + 1).toString(),
        'stage0_field5_right_page_text': rightPage.text,
        'stage0_field6_right_scene_description': rightPage.sceneJSON ? JSON.stringify(rightPage.sceneJSON.scene) : '',
        'stage0_field7_character_names': characterTags,
        'stage0_field8_mood': leftPage.sceneJSON?.scene.mood || rightPage.sceneJSON?.scene.mood || 'Happy',
        'stage0_field9_target_age': project?.targetAge.toString() || '5',
      }

      // Auto-attach reference images: style guide + all character sheets
      const referenceImages: string[] = []
      if (project?.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }
      const mainCharacterSheetUrls = project?.characters
        .filter(c => c.characterSheetUrl)
        .map(c => c.characterSheetUrl!) || []
      referenceImages.push(...mainCharacterSheetUrls)
      const supportingCharacterSheetUrls = project?.storyCharacters
        ?.filter(c => c.characterSheetUrl)
        .map(c => c.characterSheetUrl!) || []
      referenceImages.push(...supportingCharacterSheetUrls)

      // Get folder and metadata for gallery organization
      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('page', { pageNumber: leftPageIndex + 1 })

      // Step 1: Generate the dual-page image (2:1 aspect ratio)
      const recipeName = DEFAULT_RECIPE_NAMES.DUAL_PAGE

      const response = await fetch(`/api/recipes/${recipeName}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldValues,
          referenceImages,
          modelSettings: {
            aspectRatio: getDualAspectRatio(),
            outputFormat: 'png',
          },
          folderId,
          extraMetadata,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate dual page')
      }

      // Step 2: Split the image using grid-split tool (cols=2, rows=1)
      const splitResponse = await fetch('/api/tools/grid-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: data.imageUrl,
          cols: 2,
          rows: 1,
        }),
      })

      const splitData = await splitResponse.json()

      if (!splitResponse.ok || !splitData.success) {
        throw new Error(splitData.error || 'Failed to split dual page image')
      }

      // Extract the two page images from the split result
      const [leftPageImageUrl, rightPageImageUrl] = splitData.imageUrls

      // Update both pages with their respective images
      updatePage(leftPageId, {
        imageUrl: leftPageImageUrl,
        gridImageUrl: undefined,
        variationUrls: [],
      })

      updatePage(rightPageId, {
        imageUrl: rightPageImageUrl,
        gridImageUrl: undefined,
        variationUrls: [],
      })

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return {
        success: true,
        leftPageImageUrl,
        rightPageImageUrl,
        predictionId: data.predictionId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Dual page generation failed'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [project, updatePage, setGenerating, setError, getStorybookFolderId, getStorybookMetadata])

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

      setState({ isGenerating: false, progress: '', error: null })
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
    generatePage,
    generateDualPage, // ← NEW: Generates 2 pages in 1 image for 50% cost savings
  }
}
