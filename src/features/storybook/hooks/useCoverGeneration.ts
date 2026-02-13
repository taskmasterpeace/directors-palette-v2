'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useStorybookStore } from '../store/storybook.store'
import { useGenerationStateStore } from '../store/generation.store'
import { safeJsonParse } from '../utils/safe-fetch'
import {
  STORYBOOK_COST_PER_IMAGE,
  DEFAULT_RECIPE_NAMES,
  getAspectRatioForBookFormat,
  useRecipeLookup,
  useStorybookFolderId,
  type GenerationResult,
  type GenerationState,
} from './useStorybookUtils'

/**
 * Hook for cover generation (book cover, title page, back cover, synopsis)
 */
export function useCoverGeneration() {
  const { project } = useStorybookStore()

  const { setGenerating, setError } = useGenerationStateStore()

  const { getRecipeName } = useRecipeLookup()
  const { getStorybookFolderId, getStorybookMetadata } = useStorybookFolderId()

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

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

    const cost = Math.ceil(STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating book cover (${cost} pts)`, { duration: 2000 })

    setState({ isGenerating: true, progress: 'Generating book cover...', error: null })
    setGenerating(true)

    try {
      const characterDescriptions: string[] = []
      const bookChars = project.bookCharacters || []

      const protagonists = bookChars.filter(c => c.role === 'protagonist')
      if (protagonists[0]) {
        const desc = protagonists[0].description ||
                    `${protagonists[0].name}: A ${project.targetAge}-year-old child with distinctive features`
        characterDescriptions.push(`MAIN CHARACTER: ${desc}`)
      }

      const supportingChars = bookChars.filter(c => c.role === 'supporting').slice(0, 2)
      supportingChars.forEach((char, index) => {
        if (char.description || char.name) {
          const desc = char.description || `${char.name}: A supporting character`
          characterDescriptions.push(`SUPPORTING CHARACTER ${index + 1}: ${desc}`)
        }
      })

      protagonists.slice(1, 3).forEach((char, index) => {
        if (char.description || char.name) {
          const desc = char.description || `${char.name}: A supporting character`
          characterDescriptions.push(`SUPPORTING CHARACTER ${supportingChars.length + index + 1}: ${desc}`)
        }
      })

      let mainCharacterDescription = characterDescriptions.length > 0
        ? characterDescriptions.join('\n\n')
        : project.mainCharacterName
          ? `${project.mainCharacterName}: A ${project.targetAge}-year-old child`
          : `A ${project.targetAge}-year-old child character`

      if (options?.includeStoryText && options?.storyText) {
        mainCharacterDescription += `\n\nSTORY CONTEXT:\n${options.storyText}`
      }

      const fieldValues = {
        'stage0_field0_book_title': project.title,
        'stage0_field1_author_name': project.author,
        'stage0_field2_target_age': project.targetAge.toString(),
        'stage0_field3_main_character_description': mainCharacterDescription,
      }

      const referenceImages: string[] = []
      if (project.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }

      bookChars.slice(0, 3).forEach(char => {
        if (char.characterSheetUrl) {
          referenceImages.push(char.characterSheetUrl)
        }
      })

      const recipeName = getRecipeName(
        project?.recipeConfig?.bookCoverRecipeId,
        DEFAULT_RECIPE_NAMES.BOOK_COVER
      )

      const aspectRatio = getAspectRatioForBookFormat(project?.bookFormat)
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
          folderId,
          extraMetadata,
        }),
      })

      const data = await safeJsonParse(response)

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
   * Generate 3 additional cover variations
   */
  const generateCoverVariations = useCallback(async (): Promise<GenerationResult[]> => {
    if (!project) return []

    const totalCost = Math.ceil(3 * STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating 3 cover variations (${totalCost} pts)`, { duration: 3000 })

    setState({
      isGenerating: true,
      progress: 'Generating 3 cover variations...',
      error: null
    })
    setGenerating(true)

    try {
      const fullStoryText = project.pages.map(p => p.text).join('\n\n')

      const variations = await Promise.all([
        generateBookCover({
          includeStoryText: true,
          storyText: fullStoryText
        }),
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

  /**
   * Generate title page variations (4 options: 2 compositions x 2)
   */
  const generateTitlePageVariations = useCallback(async (): Promise<GenerationResult[]> => {
    if (!project) return []

    const totalCost = Math.ceil(4 * STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating 4 title page variations (${totalCost} pts)`, { duration: 3000 })

    setState({
      isGenerating: true,
      progress: 'Generating 4 title page variations...',
      error: null
    })
    setGenerating(true)

    try {
      const protagonists = (project.bookCharacters || []).filter(c => c.role === 'protagonist')
      const mainCharacter = protagonists[0]
      const characterDescription = mainCharacter?.description ||
        `${mainCharacter?.name || project.mainCharacterName || 'Main character'}: A ${project.targetAge}-year-old child`

      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('title-page')

      const referenceImages: string[] = []
      if (project.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }
      ;(project.bookCharacters || []).slice(0, 2).forEach(char => {
        if (char.characterSheetUrl) {
          referenceImages.push(char.characterSheetUrl)
        }
      })

      const aspectRatio = getAspectRatioForBookFormat(project?.bookFormat)

      const firstBeat = project.beats?.[0]
      const firstPage = project.pages[0]
      const storyContext = firstBeat?.sceneDescription || firstBeat?.text || firstPage?.text || project.storyText?.slice(0, 500) || ''

      const portraitPrompt = `Create an interior TITLE PAGE illustration for a children's book (NOT a cover).

BOOK: "${project.title}" by ${project.author || 'Author'}
TARGET AGE: ${project.targetAge} years old

CHARACTER TO FEATURE:
${characterDescription}

TITLE PAGE DESIGN:
1. ILLUSTRATION (Center focus, 70% of page):
   - Character PORTRAIT - waist-up or three-quarter view
   - Character looking warmly at the viewer, inviting them into the story
   - Gentle, welcoming expression
   - Simple, soft background (gradient, subtle pattern, or single color)
   - Decorative frame or border elements (vines, stars, swirls, etc.)

2. TEXT AREA (Leave clear space):
   - TOP: Space for title "${project.title}"
   - BOTTOM: Space for "by ${project.author || 'Author'}"
   - DO NOT render the text - just leave appropriate white/clear space

3. STYLE:
   - Match the attached style guide EXACTLY
   - Softer, more intimate than a cover
   - Warm, inviting atmosphere
   - Professional children's book interior quality
   - Character must match the character sheet reference

This is an INTERIOR page, not a cover. It should feel welcoming and intimate, like meeting a friend.`

      const storyElementPrompt = `Create an interior TITLE PAGE illustration for a children's book (NOT a cover).

BOOK: "${project.title}" by ${project.author || 'Author'}
TARGET AGE: ${project.targetAge} years old

CHARACTER TO FEATURE:
${characterDescription}

STORY CONTEXT (use for inspiration):
${storyContext}

TITLE PAGE DESIGN:
1. ILLUSTRATION (Center focus, 70% of page):
   - Character in a SCENE that hints at the story to come
   - Character interacting with a key story element or prop
   - Setting that foreshadows the adventure
   - Curious or anticipatory pose/expression
   - More environmental detail than a simple portrait

2. TEXT AREA (Leave clear space):
   - TOP: Space for title "${project.title}"
   - BOTTOM: Space for "by ${project.author || 'Author'}"
   - DO NOT render the text - just leave appropriate white/clear space

3. STYLE:
   - Match the attached style guide EXACTLY
   - Scene-based composition, not just a portrait
   - Warm lighting, inviting atmosphere
   - Professional children's book interior quality
   - Character must match the character sheet reference

This is an INTERIOR page, not a cover. It should tease the story and build anticipation.`

      const generateSingleTitlePage = async (prompt: string): Promise<GenerationResult> => {
        try {
          const response = await fetch('/api/generation/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              model: 'nano-banana-pro',
              aspectRatio,
              referenceImages,
              folderId,
              extraMetadata,
            }),
          })

          const data = await safeJsonParse(response)

          if (!response.ok || !data.imageUrl) {
            return { success: false, error: data.error || 'Failed to generate title page' }
          }

          return { success: true, imageUrl: data.imageUrl, predictionId: data.predictionId }
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Generation failed' }
        }
      }

      const variations = await Promise.all([
        generateSingleTitlePage(portraitPrompt),
        generateSingleTitlePage(portraitPrompt),
        generateSingleTitlePage(storyElementPrompt),
        generateSingleTitlePage(storyElementPrompt),
      ])

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return variations
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate title page variations'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return []
    }
  }, [project, setGenerating, setError, getStorybookFolderId, getStorybookMetadata])

  /**
   * Generate a synopsis for the back cover
   */
  const generateSynopsis = useCallback(async (): Promise<{ success: boolean; synopsis?: string; tagline?: string; error?: string }> => {
    if (!project) {
      return { success: false, error: 'No project found' }
    }

    setState({
      isGenerating: true,
      progress: 'Generating synopsis...',
      error: null
    })

    try {
      const storyText = project.storyText ||
        project.beats?.map(b => b.text).join('\n\n') ||
        project.pages.map(p => p.text).join('\n\n') || ''

      const response = await fetch('/api/storybook/generate-synopsis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          mainCharacter: project.mainCharacterName || (project.bookCharacters || [])[0]?.name || project.characters[0]?.name || 'Main character',
          storyText,
          targetAge: project.targetAge || 5,
          educationTopic: project.educationTopic,
        }),
      })

      const data = await safeJsonParse(response)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate synopsis')
      }

      setState({ isGenerating: false, progress: '', error: null })

      return {
        success: true,
        synopsis: data.synopsis,
        tagline: data.tagline,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Synopsis generation failed'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }, [project])

  /**
   * Generate back cover variations (4 options: 2 closing scene + 2 decorative)
   */
  const generateBackCoverVariations = useCallback(async (): Promise<GenerationResult[]> => {
    if (!project) return []

    const totalCost = Math.ceil(4 * STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating 4 back cover variations (${totalCost} pts)`, { duration: 3000 })

    setState({
      isGenerating: true,
      progress: 'Generating 4 back cover variations...',
      error: null
    })
    setGenerating(true)

    try {
      const backCoverProtagonists = (project.bookCharacters || []).filter(c => c.role === 'protagonist')
      const mainCharacter = backCoverProtagonists[0]
      const characterDescription = mainCharacter?.description ||
        `${mainCharacter?.name || project.mainCharacterName || 'Main character'}: A ${project.targetAge}-year-old child`

      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('back-cover')

      const referenceImages: string[] = []
      if (project.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }
      ;(project.bookCharacters || []).slice(0, 2).forEach(char => {
        if (char.characterSheetUrl) {
          referenceImages.push(char.characterSheetUrl)
        }
      })

      const aspectRatio = getAspectRatioForBookFormat(project?.bookFormat)

      const lastBeat = project.beats?.[project.beats.length - 1]
      const lastPage = project.pages[project.pages.length - 1]
      const storyEnding = lastBeat?.text || lastPage?.text || ''

      const closingScenePrompt = `Create a BACK COVER illustration for a children's book.

BOOK: "${project.title}"
TARGET AGE: ${project.targetAge} years old

CHARACTER TO FEATURE:
${characterDescription}

STORY ENDING (for context):
${storyEnding}

BACK COVER DESIGN - CLOSING SCENE:
1. ILLUSTRATION:
   - Character in a peaceful, hopeful, or triumphant moment
   - Suggests the story has reached a happy resolution
   - Character looking content, proud, or satisfied
   - Can include elements from the story's ending
   - Position character in LOWER portion of image

2. TEXT AREAS (Leave clear space):
   - TOP HALF: Large clear area for synopsis text (white or very light)
   - BOTTOM-LEFT CORNER: 2" x 1.2" clear area for barcode
   - These areas should be light colored or have a subtle pattern

3. STYLE:
   - Match the attached style guide EXACTLY
   - Warm, conclusive atmosphere
   - Softer, more reflective than action-oriented
   - Professional children's book back cover quality
   - Character must match the character sheet reference

The illustration should feel like a satisfying conclusion, making readers smile.`

      const decorativePrompt = `Create a BACK COVER illustration for a children's book.

BOOK: "${project.title}"
TARGET AGE: ${project.targetAge} years old

CHARACTER TO FEATURE:
${characterDescription}

BACK COVER DESIGN - DECORATIVE:
1. DECORATIVE PATTERN:
   - Stylized decorative border or pattern that matches the book's style
   - Whimsical elements (stars, leaves, swirls, clouds, etc.)
   - Pattern should frame the text areas
   - Colors from the style guide

2. SMALL CHARACTER VIGNETTE:
   - Small portrait or vignette of the character in a corner
   - Character looking friendly and inviting
   - Not the main focus - decorative accent

3. TEXT AREAS (Primary focus - most of the space):
   - LARGE CENTER AREA: Clear space for synopsis text (white or cream)
   - BOTTOM-LEFT CORNER: 2" x 1.2" clear area for barcode
   - Text areas should be the dominant feature

4. STYLE:
   - Match the attached style guide EXACTLY
   - Elegant, decorative, pattern-focused
   - Professional children's book back cover quality
   - Character vignette must match the character sheet reference

The design should prioritize readability with beautiful decorative framing.`

      const generateSingleBackCover = async (prompt: string): Promise<GenerationResult> => {
        try {
          const response = await fetch('/api/generation/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              model: 'nano-banana-pro',
              aspectRatio,
              referenceImages,
              folderId,
              extraMetadata,
            }),
          })

          const data = await safeJsonParse(response)

          if (!response.ok || !data.imageUrl) {
            return { success: false, error: data.error || 'Failed to generate back cover' }
          }

          return { success: true, imageUrl: data.imageUrl, predictionId: data.predictionId }
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Generation failed' }
        }
      }

      const variations = await Promise.all([
        generateSingleBackCover(closingScenePrompt),
        generateSingleBackCover(closingScenePrompt),
        generateSingleBackCover(decorativePrompt),
        generateSingleBackCover(decorativePrompt),
      ])

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return variations
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate back cover variations'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return []
    }
  }, [project, setGenerating, setError, getStorybookFolderId, getStorybookMetadata])

  return {
    generateBookCover,
    generateCoverVariations,
    generateTitlePageVariations,
    generateBackCoverVariations,
    generateSynopsis,
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
  }
}
