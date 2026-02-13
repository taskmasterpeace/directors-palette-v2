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
  getDualAspectRatio,
  useRecipeLookup,
  useStorybookFolderId,
  type GenerationResult,
  type DualPageResult,
  type GenerationState,
} from './useStorybookUtils'

/**
 * Hook for page illustration generation (single, dual, spread)
 */
export function usePageGeneration() {
  const {
    project,
    updatePage,
  } = useStorybookStore()

  const { setGenerating, setError } = useGenerationStateStore()

  const { getRecipeName } = useRecipeLookup()
  const { getStorybookFolderId, getStorybookMetadata } = useStorybookFolderId()

  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: '',
    error: null,
  })

  /**
   * Build character tags string from bookCharacters
   */
  const buildCharacterTags = useCallback((): string => {
    const allCharacterDescriptions = (project?.bookCharacters || []).map(c => {
      const tag = c.tag || `@${c.name.replace(/\s+/g, '')}`
      const parts = [c.description, c.outfitDescription ? `wearing ${c.outfitDescription}` : ''].filter(Boolean).join(', ')
      return parts ? `${tag}: ${parts}` : tag
    })
    return allCharacterDescriptions.length > 0 ? allCharacterDescriptions.join(', ') : 'No named characters'
  }, [project?.bookCharacters])

  /**
   * Build reference images array (style guide + character sheets)
   */
  const buildReferenceImages = useCallback((): string[] => {
    const referenceImages: string[] = []
    if (project?.style?.styleGuideUrl) {
      referenceImages.push(project.style.styleGuideUrl)
    }
    const characterSheetUrls = (project?.bookCharacters || [])
      .filter(c => c.characterSheetUrl)
      .map(c => c.characterSheetUrl!)
    referenceImages.push(...characterSheetUrls)
    return referenceImages
  }, [project?.style?.styleGuideUrl, project?.bookCharacters])

  /**
   * Generate a single page illustration
   */
  const generatePage = useCallback(async (
    pageId: string
  ): Promise<GenerationResult> => {
    const page = project?.pages.find(p => p.id === pageId)
    if (!page) {
      return { success: false, error: 'Page not found' }
    }

    const cost = Math.ceil(STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating page illustration (${cost} pts)`, { duration: 2000 })

    setState({ isGenerating: true, progress: 'Generating page illustration...', error: null })
    setGenerating(true)

    try {
      const pageIndex = project?.pages.findIndex(p => p.id === pageId) ?? -1
      const isFirstPage = pageIndex === 0
      const characterTags = buildCharacterTags()

      let fieldValues: Record<string, string>
      let recipeName: string

      if (isFirstPage) {
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

      const referenceImages = buildReferenceImages()
      const aspectRatio = getAspectRatioForBookFormat(project?.bookFormat)
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
          folderId,
          extraMetadata,
        }),
      })

      const data = await safeJsonParse(response)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate page')
      }

      updatePage(pageId, { imageUrl: data.imageUrl })

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
  }, [project, updatePage, setGenerating, setError, getRecipeName, getStorybookFolderId, getStorybookMetadata, buildCharacterTags, buildReferenceImages])

  /**
   * Generate a dual-page spread (two pages in one image, then split)
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

    const leftPageIndex = project?.pages.findIndex(p => p.id === leftPageId) ?? -1
    const rightPageIndex = project?.pages.findIndex(p => p.id === rightPageId) ?? -1

    const cost = Math.ceil(STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating dual page spread (${cost} pts)`, { duration: 2000 })

    setState({ isGenerating: true, progress: `Generating pages ${leftPageIndex + 1}-${rightPageIndex + 1} as spread...`, error: null })
    setGenerating(true)

    try {
      const characterTags = buildCharacterTags()
      const previousPage = leftPageIndex > 0 ? project?.pages[leftPageIndex - 1] : null

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

      const referenceImages = buildReferenceImages()
      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('page', { pageNumber: leftPageIndex + 1 })

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

      const data = await safeJsonParse(response)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate dual page')
      }

      const splitResponse = await fetch('/api/tools/grid-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: data.imageUrl,
          cols: 2,
          rows: 1,
        }),
      })

      const splitData = await safeJsonParse(splitResponse)

      if (!splitResponse.ok || !splitData.success) {
        throw new Error(splitData.error || 'Failed to split dual page image')
      }

      const [leftPageImageUrl, rightPageImageUrl] = splitData.imageUrls || []

      updatePage(leftPageId, { imageUrl: leftPageImageUrl })
      updatePage(rightPageId, { imageUrl: rightPageImageUrl })

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
  }, [project, updatePage, setGenerating, setError, getStorybookFolderId, getStorybookMetadata, buildCharacterTags, buildReferenceImages])

  /**
   * Generate a spread image for the beats/spreads architecture
   */
  const generateSpreadImage = useCallback(async (
    spread: { id: string; text: string; sceneDescription: string; spreadNumber: number }
  ): Promise<{ success: boolean; imageUrl?: string; rightImageUrl?: string; error?: string }> => {
    if (!project) {
      return { success: false, error: 'No project found' }
    }

    const cost = Math.ceil(STORYBOOK_COST_PER_IMAGE * 100)
    toast.info(`Generating spread ${spread.spreadNumber} (${cost} pts)`, { duration: 2000 })

    setState({
      isGenerating: true,
      progress: `Generating spread ${spread.spreadNumber}...`,
      error: null
    })
    setGenerating(true)

    try {
      const characterTags = buildCharacterTags()
      const spreadIndex = (project.spreads || []).findIndex(s => s.id === spread.id)
      const previousSpread = spreadIndex > 0 ? project.spreads?.[spreadIndex - 1] : null

      const fieldValues: Record<string, string> = {
        'stage0_field0_previous_page_text': previousSpread?.text || '',
        'stage0_field1_left_page_number': ((spreadIndex * 2) + 1).toString(),
        'stage0_field2_left_page_text': spread.text,
        'stage0_field3_left_scene_description': spread.sceneDescription,
        'stage0_field4_right_page_number': ((spreadIndex * 2) + 2).toString(),
        'stage0_field5_right_page_text': '',
        'stage0_field6_right_scene_description': spread.sceneDescription,
        'stage0_field7_character_names': characterTags,
        'stage0_field8_mood': 'Warm',
        'stage0_field9_target_age': project?.targetAge.toString() || '5',
      }

      const referenceImages = buildReferenceImages()
      const folderId = await getStorybookFolderId()
      const extraMetadata = getStorybookMetadata('page', { pageNumber: spread.spreadNumber })

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

      const data = await safeJsonParse(response)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate spread image')
      }

      const splitResponse = await fetch('/api/tools/grid-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: data.imageUrl,
          cols: 2,
          rows: 1,
        }),
      })

      const splitData = await safeJsonParse(splitResponse)

      if (!splitResponse.ok || !splitData.success) {
        throw new Error(splitData.error || 'Failed to split spread image')
      }

      const [leftImageUrl, rightImageUrl] = splitData.imageUrls || []

      setState({ isGenerating: false, progress: '', error: null })
      setGenerating(false)

      return {
        success: true,
        imageUrl: leftImageUrl,
        rightImageUrl: rightImageUrl,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Spread generation failed'
      setState({ isGenerating: false, progress: '', error: errorMessage })
      setGenerating(false)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [project, setGenerating, setError, getStorybookFolderId, getStorybookMetadata, buildCharacterTags, buildReferenceImages])

  /**
   * Generate multiple pages in parallel with controlled concurrency.
   * Supports both single-page and spread (dual-page) modes.
   */
  const generatePagesParallel = useCallback(async (
    pageIds: string[],
    options?: {
      concurrency?: number
      useSpreadMode?: boolean
      onProgress?: (message: string) => void
    }
  ): Promise<{ succeeded: number; failed: number }> => {
    const concurrency = options?.concurrency ?? 3
    const useSpreadMode = options?.useSpreadMode ?? false
    const onProgress = options?.onProgress

    if (!project || pageIds.length === 0) {
      return { succeeded: 0, failed: 0 }
    }

    // Build work units: either single pages or spread pairs
    type WorkUnit = { type: 'single'; pageId: string } | { type: 'spread'; leftId: string; rightId: string }
    const workUnits: WorkUnit[] = []

    if (useSpreadMode) {
      const allPages = project.pages
      let i = 0
      while (i < pageIds.length) {
        const currentIdx = allPages.findIndex(p => p.id === pageIds[i])
        const nextId = pageIds[i + 1]
        const nextIdx = nextId ? allPages.findIndex(p => p.id === nextId) : -1

        if (nextId && nextIdx === currentIdx + 1) {
          workUnits.push({ type: 'spread', leftId: pageIds[i], rightId: nextId })
          i += 2
        } else {
          workUnits.push({ type: 'single', pageId: pageIds[i] })
          i += 1
        }
      }
    } else {
      pageIds.forEach(id => workUnits.push({ type: 'single', pageId: id }))
    }

    let succeeded = 0
    let failed = 0
    let completed = 0

    // Parallel execution with controlled concurrency
    const queue = [...workUnits]

    const processUnit = async (unit: WorkUnit): Promise<void> => {
      completed++
      const label = unit.type === 'spread'
        ? `spread ${completed}/${workUnits.length}`
        : `page ${completed}/${workUnits.length}`
      onProgress?.(`Generating ${label}...`)

      if (unit.type === 'spread') {
        const result = await generateDualPage(unit.leftId, unit.rightId)
        if (result.success) succeeded += 2
        else failed += 2
      } else {
        const result = await generatePage(unit.pageId)
        if (result.success) succeeded++
        else failed++
      }
    }

    await new Promise<void>((resolve) => {
      let running = 0
      let idx = 0

      const next = () => {
        while (running < concurrency && idx < queue.length) {
          const unit = queue[idx++]
          running++
          processUnit(unit).finally(() => {
            running--
            if (running === 0 && idx >= queue.length) {
              resolve()
            } else {
              next()
            }
          })
        }
        if (running === 0 && idx >= queue.length) {
          resolve()
        }
      }

      next()
    })

    return { succeeded, failed }
  }, [project, generatePage, generateDualPage])

  return {
    generatePage,
    generateDualPage,
    generateSpreadImage,
    generatePagesParallel,
    isGenerating: state.isGenerating,
    progress: state.progress,
    error: state.error,
  }
}
