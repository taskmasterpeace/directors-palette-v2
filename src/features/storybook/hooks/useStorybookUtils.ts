'use client'

import { useCallback, useRef } from 'react'
import { useStorybookStore } from '../store/storybook.store'
import { useRecipes } from '@/features/shot-creator/hooks/useRecipes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { BookFormat } from '../types/storybook.types'
import {
  getOrCreateStorybookFolder,
  buildStorybookMetadata,
  type StorybookAssetType,
} from '../services/storybook-folder.service'
import { getModelCost } from '@/config'
import { logger } from '@/lib/logger'

// Cost constants for storybook generations (nano-banana-pro)
export const STORYBOOK_MODEL = 'nano-banana-pro'
export const STORYBOOK_COST_PER_IMAGE = getModelCost(STORYBOOK_MODEL) // $0.25 = 25 pts

// Default system recipe names for storybook (used as fallbacks)
export const DEFAULT_RECIPE_NAMES = {
  STYLE_GUIDE: 'Storybook Style Guide',
  CHARACTER_SHEET: 'Storybook Character Sheet (Single-Stage)',
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
  return '2:1'
}

/**
 * Convert aspect ratio string to CSS aspect-ratio value
 * e.g., "4:5" -> "4/5"
 */
export function aspectRatioToCss(aspectRatio: string): string {
  return aspectRatio.replace(':', '/')
}

export interface GenerationResult {
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
export interface DualPageResult {
  success: boolean
  leftPageImageUrl?: string
  rightPageImageUrl?: string
  error?: string
  predictionId?: string
}

export interface GenerationState {
  isGenerating: boolean
  progress: string
  error: string | null
}

/**
 * Hook for recipe name lookup with validation
 */
export function useRecipeLookup() {
  const { recipes } = useRecipes()

  const getRecipeName = useCallback((
    configRecipeId: string | undefined,
    defaultName: string
  ): string => {
    if (configRecipeId) {
      const recipe = recipes.find(r => r.id === configRecipeId)
      if (recipe) return recipe.name
      logger.storybook.warn('Configured recipe ID not found, falling back to default', { configRecipeId })
    }

    const defaultRecipe = recipes.find(r => r.name === defaultName)
    if (!defaultRecipe) {
      logger.storybook.warn('Default recipe not found', { defaultName, availableCount: recipes.length })
    }

    return defaultName
  }, [recipes])

  return { getRecipeName }
}

/**
 * Hook for storybook folder management (gallery organization)
 */
export function useStorybookFolderId() {
  const { user } = useAuth()
  const { project } = useStorybookStore()
  const folderIdCache = useRef<{ projectId: string; folderId: string | null } | null>(null)

  const getStorybookFolderId = useCallback(async (): Promise<string | null> => {
    if (!user?.id || !project?.id) return null

    if (folderIdCache.current?.projectId === project.id) {
      return folderIdCache.current.folderId
    }

    const folderId = await getOrCreateStorybookFolder(
      user.id,
      project.id,
      project.title || 'Untitled Book'
    )

    folderIdCache.current = { projectId: project.id, folderId }
    return folderId
  }, [user?.id, project?.id, project?.title])

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

  return { getStorybookFolderId, getStorybookMetadata }
}
