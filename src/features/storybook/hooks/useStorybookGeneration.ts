'use client'

import { useState, useCallback } from 'react'
import { useStorybookStore } from '../store/storybook.store'
import { SYSTEM_TEMPLATES } from '../services/template.service'

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
   * Poll for generation completion
   */
  const pollForCompletion = useCallback(async (
    predictionId: string,
    maxAttempts = 60,
    intervalMs = 3000
  ): Promise<string | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`/api/generation/status/${predictionId}`)
        const data = await response.json()

        if (data.status === 'succeeded' && data.output) {
          // Return the image URL
          const output = Array.isArray(data.output) ? data.output[0] : data.output
          return output
        }

        if (data.status === 'failed') {
          throw new Error(data.error || 'Generation failed')
        }

        // Still processing, wait and retry
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      } catch (error) {
        console.error('Error polling for completion:', error)
        // Continue polling unless it's a terminal error
      }
    }
    return null // Timeout
  }, [])

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
      // Build the style guide prompt
      const prompt = `Create a visual style guide as a 6-image grid (2 rows × 3 columns) in ${styleName} style.

CRITICAL: Separate each cell with a SOLID BLACK LINE (4-6 pixels wide).

${styleDescription ? `STYLE DESCRIPTION: ${styleDescription}\n\n` : ''}THE 6 TILES (2x3 grid):

1. CHARACTER CLOSE-UP: A character headshot, warm studio lighting, 3/4 view

2. ACTION SCENE: Character in dynamic pose, motion blur background

3. ENVIRONMENT DETAIL: Interior scene, afternoon light through windows

4. CHARACTER INTERACTION: Two characters in conversation

5. DYNAMIC POSE: Character in athletic stance, dramatic angle

6. SET/LOCATION DESIGN: Exterior establishing shot

Output a 16:9 image with exactly 6 tiles (2 rows x 3 columns) separated by black lines.
${styleName} style throughout all tiles.`

      const referenceImages: string[] = []
      if (referenceImageUrl) {
        referenceImages.push(referenceImageUrl)
      }

      const response = await fetch('/api/generation/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          prompt,
          referenceImages,
          modelSettings: {
            aspectRatio: '16:9',
            outputFormat: 'webp',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation')
      }

      setState(s => ({ ...s, progress: 'Waiting for result...' }))

      // Poll for completion
      const imageUrl = await pollForCompletion(data.predictionId)

      if (!imageUrl) {
        throw new Error('Generation timed out')
      }

      // Update store with the new style
      setStyle({
        id: crypto.randomUUID(),
        name: styleName,
        description: styleDescription,
        styleGuideUrl: imageUrl,
        previewUrl: imageUrl,
      })

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return { success: true, imageUrl, predictionId: data.predictionId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [pollForCompletion, setStyle, setGenerating, setError])

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
      // Build reference images array
      const referenceImages: string[] = []

      // 1. Add source photo if available
      if (character.sourcePhotoUrl) {
        referenceImages.push(character.sourcePhotoUrl)
      }

      // 2. Add style guide if available
      if (project?.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }

      // 3. Add character sheet template
      referenceImages.push(SYSTEM_TEMPLATES.characterSheet.advanced)

      // Build the character sheet prompt
      const styleName = project?.style?.name || 'illustrated children\'s book'
      const prompt = `Create a professional character reference sheet for @${character.tag || character.name.replace(/\s+/g, '')}.

CHARACTER SHEET LAYOUT (use the attached template as your layout guide):

LEFT SIDE - FULL BODY:
- Large neutral standing pose, front view
- Show complete outfit and proportions
- Color palette swatches for skin, hair, clothing

RIGHT SIDE - EXPRESSIONS (3x3 grid):
- Neutral, Happy, Angry
- Speaking, Smug/Confident, Sad
- Surprised, Shouting, Whispering

CRITICAL REQUIREMENTS:
- Maintain EXACT likeness from reference photo
- All expressions must be the SAME character
- ${styleName} art style throughout
- Clean white/light background
- Character name "@${character.tag || character.name.replace(/\s+/g, '')}" at top

Aspect ratio: 21:9 (ultrawide character sheet)
Separate expression cells with thin black lines.`

      const response = await fetch('/api/generation/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          prompt,
          referenceImages,
          modelSettings: {
            aspectRatio: '21:9',
            outputFormat: 'webp',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation')
      }

      setState(s => ({ ...s, progress: 'Waiting for result...' }))

      // Poll for completion
      const imageUrl = await pollForCompletion(data.predictionId)

      if (!imageUrl) {
        throw new Error('Generation timed out')
      }

      // Update character with the generated sheet
      updateCharacter(characterId, { characterSheetUrl: imageUrl })

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return { success: true, imageUrl, predictionId: data.predictionId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [project, pollForCompletion, updateCharacter, setGenerating, setError])

  /**
   * Generate 9 variations for a story page
   */
  const generatePageVariations = useCallback(async (
    pageId: string
  ): Promise<GenerationResult> => {
    const page = project?.pages.find(p => p.id === pageId)
    if (!page) {
      return { success: false, error: 'Page not found' }
    }

    setState({ isGenerating: true, progress: 'Generating 9 variations...', error: null })
    setGenerating(true)

    try {
      // Build reference images array
      const referenceImages: string[] = []

      // 1. Add style guide if available
      if (project?.style?.styleGuideUrl) {
        referenceImages.push(project.style.styleGuideUrl)
      }

      // 2. Add all character sheets
      const characterSheetUrls = project?.characters
        .filter(c => c.characterSheetUrl)
        .map(c => c.characterSheetUrl!) || []
      referenceImages.push(...characterSheetUrls)

      // Build the page variations prompt
      const styleName = project?.style?.name || 'illustrated children\'s book'
      const characterTags = project?.characters.map(c => `@${c.tag || c.name.replace(/\s+/g, '')}`) || []

      const prompt = `Create a 3x3 grid of 9 DIFFERENT illustration variations for this children's book page:

PAGE TEXT:
"${page.text}"

CRITICAL: Separate each cell with a SOLID BLACK LINE (4-6 pixels wide).

STYLE: ${styleName}
CHARACTERS: ${characterTags.length > 0 ? characterTags.join(', ') : 'No named characters'}

THE 9 VARIATIONS (different compositions of the same scene):
1. Wide establishing shot
2. Medium scene shot
3. Character-focused close-up
4. Action moment
5. Reaction/emotion focus
6. Environmental detail
7. Dynamic angle (low or high)
8. Cozy/intimate framing
9. Classic storybook composition

REQUIREMENTS:
- All 9 tiles show the SAME story moment
- Each tile uses a DIFFERENT camera angle/composition
- Maintain character consistency using attached character sheets
- Match style guide exactly
- No text overlays on images
- 1:1 aspect ratio (square grid)

Output a perfect 3x3 grid with black separator lines.`

      const response = await fetch('/api/generation/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          prompt,
          referenceImages,
          modelSettings: {
            aspectRatio: '1:1',
            outputFormat: 'webp',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation')
      }

      setState(s => ({ ...s, progress: 'Waiting for result...' }))

      // Poll for completion
      const imageUrl = await pollForCompletion(data.predictionId)

      if (!imageUrl) {
        throw new Error('Generation timed out')
      }

      // For now, store the grid URL - frame extraction will be done in the UI
      // The actual frame extraction happens in PageGenerationStep using grid-detector
      updatePage(pageId, {
        gridImageUrl: imageUrl,
        variationUrls: [], // Will be populated after frame extraction
      })

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return { success: true, imageUrl, predictionId: data.predictionId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [project, pollForCompletion, updatePage, setGenerating, setError])

  return {
    // State
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,

    // Actions
    generateStyleGuide,
    generateCharacterSheet,
    generatePageVariations,
  }
}
