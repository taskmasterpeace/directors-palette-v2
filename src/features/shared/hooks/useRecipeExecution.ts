'use client'

import { useState, useCallback } from 'react'
import {
  executeRecipe,
  RecipeExecutionOptions,
  RecipeExecutionResult,
  findSystemRecipeByName,
} from '../services/recipe-execution.service'
import { useRecipeStore } from '@/features/shot-creator/store/recipe.store'
import type { RecipeFieldValues } from '@/features/shot-creator/types/recipe.types'
import type { ImageModel } from '@/features/shot-creator/types/image-generation.types'

interface RecipeExecutionState {
  isExecuting: boolean
  currentStage: number
  totalStages: number
  status: string
  error: string | null
}

interface UseRecipeExecutionReturn {
  // State
  state: RecipeExecutionState
  isExecuting: boolean
  progress: string
  error: string | null

  // Actions
  execute: (options: Omit<RecipeExecutionOptions, 'onProgress'>) => Promise<RecipeExecutionResult>
  executeSystemRecipe: (
    recipeName: string,
    fieldValues: RecipeFieldValues,
    stageReferenceImages: string[][],
    options?: { model?: ImageModel; aspectRatio?: string }
  ) => Promise<RecipeExecutionResult>
  reset: () => void
}

/**
 * React hook for executing multi-stage recipes with pipe chaining
 *
 * Usage:
 * ```tsx
 * const { execute, isExecuting, progress, error } = useRecipeExecution()
 *
 * const result = await execute({
 *   recipe: myRecipe,
 *   fieldValues: { CHARACTER_NAME: 'Alice', STYLE_NAME: 'Watercolor' },
 *   stageReferenceImages: [
 *     ['https://...source-photo.jpg'],
 *     ['https://...style-guide.jpg'],
 *     ['https://...template.png'],
 *   ],
 *   model: 'nano-banana-pro',
 *   aspectRatio: '21:9',
 * })
 * ```
 */
export function useRecipeExecution(): UseRecipeExecutionReturn {
  const [state, setState] = useState<RecipeExecutionState>({
    isExecuting: false,
    currentStage: 0,
    totalStages: 0,
    status: '',
    error: null,
  })

  const { recipes } = useRecipeStore()

  // Handle progress updates from the service
  const handleProgress = useCallback((stage: number, totalStages: number, status: string) => {
    setState(prev => ({
      ...prev,
      currentStage: stage,
      totalStages,
      status,
    }))
  }, [])

  // Execute a recipe with provided options
  const execute = useCallback(async (
    options: Omit<RecipeExecutionOptions, 'onProgress'>
  ): Promise<RecipeExecutionResult> => {
    setState({
      isExecuting: true,
      currentStage: 0,
      totalStages: options.recipe.stages.length,
      status: 'Starting recipe execution...',
      error: null,
    })

    try {
      const result = await executeRecipe({
        ...options,
        onProgress: handleProgress,
      })

      if (result.success) {
        setState(prev => ({
          ...prev,
          isExecuting: false,
          status: 'Recipe completed!',
        }))
      } else {
        setState(prev => ({
          ...prev,
          isExecuting: false,
          status: 'Recipe failed',
          error: result.error || 'Unknown error',
        }))
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recipe execution failed'
      setState(prev => ({
        ...prev,
        isExecuting: false,
        status: 'Recipe failed',
        error: errorMessage,
      }))

      return {
        success: false,
        imageUrls: [],
        error: errorMessage,
      }
    }
  }, [handleProgress])

  // Execute a system recipe by name (convenience method for internal features)
  const executeSystemRecipe = useCallback(async (
    recipeName: string,
    fieldValues: RecipeFieldValues,
    stageReferenceImages: string[][],
    options?: { model?: ImageModel; aspectRatio?: string }
  ): Promise<RecipeExecutionResult> => {
    // Find the system recipe by name
    const recipe = findSystemRecipeByName(recipes, recipeName)

    if (!recipe) {
      const error = `System recipe not found: ${recipeName}`
      setState(prev => ({ ...prev, error }))
      return { success: false, imageUrls: [], error }
    }

    return execute({
      recipe,
      fieldValues,
      stageReferenceImages,
      model: options?.model,
      aspectRatio: options?.aspectRatio,
    })
  }, [recipes, execute])

  // Reset state
  const reset = useCallback(() => {
    setState({
      isExecuting: false,
      currentStage: 0,
      totalStages: 0,
      status: '',
      error: null,
    })
  }, [])

  // Computed progress string
  const progress = state.totalStages > 0
    ? `Stage ${state.currentStage + 1}/${state.totalStages}: ${state.status}`
    : state.status

  return {
    state,
    isExecuting: state.isExecuting,
    progress,
    error: state.error,
    execute,
    executeSystemRecipe,
    reset,
  }
}
