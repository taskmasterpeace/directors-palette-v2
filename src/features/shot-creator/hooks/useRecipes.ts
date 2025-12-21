/**
 * useRecipes Hook
 * Provides access to recipes with automatic initialization based on user authentication.
 * This hook should be used instead of directly accessing useRecipeStore in components.
 */

'use client'

import { useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRecipeStore } from '../store/recipe.store'

/**
 * Hook to access recipes with automatic initialization.
 * Initializes the recipe store when user is authenticated.
 */
export function useRecipes() {
  const { user, isLoading: authLoading } = useAuth()
  const store = useRecipeStore()

  // Initialize recipes when user is available
  useEffect(() => {
    if (!authLoading && user?.id && !store.isInitialized) {
      store.initialize(user.id)
    }
  }, [authLoading, user?.id, store.isInitialized, store.initialize])

  // Re-initialize if user changes
  useEffect(() => {
    if (user?.id && store.currentUserId && user.id !== store.currentUserId) {
      store.initialize(user.id)
    }
  }, [user?.id, store.currentUserId, store.initialize])

  return {
    // State
    recipes: store.recipes,
    categories: store.categories,
    quickAccessItems: store.quickAccessItems,
    activeRecipeId: store.activeRecipeId,
    activeFieldValues: store.activeFieldValues,
    isLoading: store.isLoading || authLoading,
    isInitialized: store.isInitialized,

    // Recipe CRUD
    addRecipe: store.addRecipe,
    updateRecipe: store.updateRecipe,
    deleteRecipe: store.deleteRecipe,
    duplicateRecipe: store.duplicateRecipe,
    getRecipe: store.getRecipe,
    refreshRecipes: store.refreshRecipes,

    // Stage Management
    addStageToRecipe: store.addStageToRecipe,
    removeStageFromRecipe: store.removeStageFromRecipe,
    updateStageTemplate: store.updateStageTemplate,
    addReferenceImageToStage: store.addReferenceImageToStage,
    removeReferenceImageFromStage: store.removeReferenceImageFromStage,

    // Quick Access
    addToQuickAccess: store.addToQuickAccess,
    removeFromQuickAccess: store.removeFromQuickAccess,
    reorderQuickAccess: store.reorderQuickAccess,
    updateQuickAccessLabel: store.updateQuickAccessLabel,

    // Active Recipe
    setActiveRecipe: store.setActiveRecipe,
    setFieldValue: store.setFieldValue,
    clearFieldValues: store.clearFieldValues,
    getActiveRecipe: store.getActiveRecipe,
    getActiveValidation: store.getActiveValidation,
    buildActivePrompts: store.buildActivePrompts,

    // Categories
    addCategory: store.addCategory,
    updateCategory: store.updateCategory,
    deleteCategory: store.deleteCategory,
  }
}

/**
 * Hook to just get the active recipe state (for recipe form components).
 * Lighter weight than useRecipes for components that only need active recipe.
 */
export function useActiveRecipe() {
  const store = useRecipeStore()

  return {
    activeRecipeId: store.activeRecipeId,
    activeFieldValues: store.activeFieldValues,
    setActiveRecipe: store.setActiveRecipe,
    setFieldValue: store.setFieldValue,
    clearFieldValues: store.clearFieldValues,
    getActiveRecipe: store.getActiveRecipe,
    getActiveValidation: store.getActiveValidation,
    buildActivePrompts: store.buildActivePrompts,
  }
}

/**
 * Hook to just get quick access items.
 */
export function useQuickAccess() {
  const { user, isLoading: authLoading } = useAuth()
  const store = useRecipeStore()

  // Initialize if needed
  useEffect(() => {
    if (!authLoading && user?.id && !store.isInitialized) {
      store.initialize(user.id)
    }
  }, [authLoading, user?.id, store.isInitialized, store.initialize])

  return {
    quickAccessItems: store.quickAccessItems,
    recipes: store.recipes, // Needed to resolve recipe details
    isLoading: store.isLoading || authLoading,
    addToQuickAccess: store.addToQuickAccess,
    removeFromQuickAccess: store.removeFromQuickAccess,
    reorderQuickAccess: store.reorderQuickAccess,
    updateQuickAccessLabel: store.updateQuickAccessLabel,
    getRecipe: store.getRecipe,
    setActiveRecipe: store.setActiveRecipe,
  }
}
