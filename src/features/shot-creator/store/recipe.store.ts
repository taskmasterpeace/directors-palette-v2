import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Recipe,
  RecipeStage,
  RecipeFieldValues,
  QuickAccessItem,
  RecipeCategory,
  RecipeReferenceImage,
  RecipeValidation,
  DEFAULT_RECIPE_CATEGORIES,
  SAMPLE_RECIPES,
  parseStageTemplate,
  buildRecipePrompts,
  validateRecipe,
} from '../types/recipe.types'

interface RecipeState {
  // Recipes
  recipes: Recipe[]
  categories: RecipeCategory[]

  // Quick Access (up to 9 items)
  quickAccessItems: QuickAccessItem[]

  // Active recipe state (when filling out a recipe form)
  activeRecipeId: string | null
  activeFieldValues: RecipeFieldValues

  // Actions - Recipes
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Recipe
  updateRecipe: (id: string, updates: Partial<Omit<Recipe, 'id' | 'createdAt'>>) => void
  deleteRecipe: (id: string) => void
  getRecipe: (id: string) => Recipe | undefined

  // Actions - Recipe Stages
  addStageToRecipe: (recipeId: string) => void
  removeStageFromRecipe: (recipeId: string, stageId: string) => void
  updateStageTemplate: (recipeId: string, stageId: string, template: string) => void
  addReferenceImageToStage: (recipeId: string, stageId: string, image: RecipeReferenceImage) => void
  removeReferenceImageFromStage: (recipeId: string, stageId: string, imageId: string) => void

  // Actions - Quick Access
  addToQuickAccess: (recipeId: string, label: string) => boolean
  removeFromQuickAccess: (id: string) => void
  reorderQuickAccess: (items: QuickAccessItem[]) => void
  updateQuickAccessLabel: (id: string, label: string) => void

  // Actions - Active Recipe
  setActiveRecipe: (recipeId: string | null) => void
  setFieldValue: (fieldId: string, value: string) => void
  clearFieldValues: () => void
  getActiveRecipe: () => Recipe | null
  getActiveValidation: () => RecipeValidation | null
  buildActivePrompts: () => string[] | null

  // Actions - Categories
  addCategory: (name: string, icon: string) => RecipeCategory
  updateCategory: (id: string, updates: Partial<Omit<RecipeCategory, 'id' | 'isDefault'>>) => void
  deleteCategory: (id: string) => boolean

  // Initialize with sample recipes
  initializeSampleRecipes: () => void
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set, get) => ({
      recipes: [],
      categories: DEFAULT_RECIPE_CATEGORIES,
      quickAccessItems: [],
      activeRecipeId: null,
      activeFieldValues: {},

      // Recipe CRUD
      addRecipe: (recipeData) => {
        const id = `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const now = Date.now()

        // Parse stages and fields
        const stages = recipeData.stages.map((stage, index) => ({
          ...stage,
          id: `stage_${index}_${Date.now()}`,
          fields: parseStageTemplate(stage.template, index),
        }))

        const newRecipe: Recipe = {
          ...recipeData,
          id,
          stages,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          recipes: [...state.recipes, newRecipe],
        }))

        // If marked as quick access, add to quick access bar
        if (recipeData.isQuickAccess && recipeData.quickAccessLabel) {
          get().addToQuickAccess(id, recipeData.quickAccessLabel)
        }

        return newRecipe
      },

      updateRecipe: (id, updates) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id !== id) return recipe

            // If stages are updated, re-parse fields
            let newStages = recipe.stages
            if (updates.stages) {
              newStages = updates.stages.map((stage, index) => ({
                ...stage,
                fields: parseStageTemplate(stage.template, index),
              }))
            }

            return {
              ...recipe,
              ...updates,
              stages: newStages,
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      deleteRecipe: (id) => {
        // Remove from quick access if present
        const quickAccessItem = get().quickAccessItems.find(
          (item) => item.recipeId === id
        )
        if (quickAccessItem) {
          get().removeFromQuickAccess(quickAccessItem.id)
        }

        // Clear active recipe if it's the one being deleted
        if (get().activeRecipeId === id) {
          set({ activeRecipeId: null, activeFieldValues: {} })
        }

        set((state) => ({
          recipes: state.recipes.filter((r) => r.id !== id),
        }))
      },

      getRecipe: (id) => {
        return get().recipes.find((r) => r.id === id)
      },

      // Stage Management
      addStageToRecipe: (recipeId) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id !== recipeId) return recipe

            const newStageIndex = recipe.stages.length
            const newStage: RecipeStage = {
              id: `stage_${newStageIndex}_${Date.now()}`,
              order: newStageIndex,
              template: '',
              fields: [],
              referenceImages: [],
            }

            return {
              ...recipe,
              stages: [...recipe.stages, newStage],
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      removeStageFromRecipe: (recipeId, stageId) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id !== recipeId) return recipe
            if (recipe.stages.length <= 1) return recipe // Must have at least 1 stage

            const newStages = recipe.stages
              .filter((s) => s.id !== stageId)
              .map((s, index) => ({ ...s, order: index }))

            return {
              ...recipe,
              stages: newStages,
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      updateStageTemplate: (recipeId, stageId, template) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id !== recipeId) return recipe

            const newStages = recipe.stages.map((stage) => {
              if (stage.id !== stageId) return stage
              return {
                ...stage,
                template,
                fields: parseStageTemplate(template, stage.order),
              }
            })

            return {
              ...recipe,
              stages: newStages,
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      addReferenceImageToStage: (recipeId, stageId, image) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id !== recipeId) return recipe

            const newStages = recipe.stages.map((stage) => {
              if (stage.id !== stageId) return stage
              return {
                ...stage,
                referenceImages: [...stage.referenceImages, image],
              }
            })

            return {
              ...recipe,
              stages: newStages,
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      removeReferenceImageFromStage: (recipeId, stageId, imageId) => {
        set((state) => ({
          recipes: state.recipes.map((recipe) => {
            if (recipe.id !== recipeId) return recipe

            const newStages = recipe.stages.map((stage) => {
              if (stage.id !== stageId) return stage
              return {
                ...stage,
                referenceImages: stage.referenceImages.filter((img) => img.id !== imageId),
              }
            })

            return {
              ...recipe,
              stages: newStages,
              updatedAt: Date.now(),
            }
          }),
        }))
      },

      // Quick Access (max 9 items)
      addToQuickAccess: (recipeId, label) => {
        const items = get().quickAccessItems
        if (items.length >= 9) {
          return false // Max 9 items
        }

        // Check if already exists
        if (items.some((item) => item.recipeId === recipeId)) {
          return false
        }

        const id = `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const order = items.length

        set((state) => ({
          quickAccessItems: [
            ...state.quickAccessItems,
            { id, type: 'recipe', label, recipeId, order },
          ],
        }))

        return true
      },

      removeFromQuickAccess: (id) => {
        set((state) => {
          const filtered = state.quickAccessItems.filter((item) => item.id !== id)
          return {
            quickAccessItems: filtered.map((item, index) => ({
              ...item,
              order: index,
            })),
          }
        })
      },

      reorderQuickAccess: (items) => {
        set({
          quickAccessItems: items.map((item, index) => ({
            ...item,
            order: index,
          })),
        })
      },

      updateQuickAccessLabel: (id, label) => {
        set((state) => ({
          quickAccessItems: state.quickAccessItems.map((item) =>
            item.id === id ? { ...item, label } : item
          ),
        }))
      },

      // Active Recipe
      setActiveRecipe: (recipeId) => {
        set({ activeRecipeId: recipeId, activeFieldValues: {} })
      },

      setFieldValue: (fieldId, value) => {
        set((state) => ({
          activeFieldValues: {
            ...state.activeFieldValues,
            [fieldId]: value,
          },
        }))
      },

      clearFieldValues: () => {
        set({ activeFieldValues: {} })
      },

      getActiveRecipe: () => {
        const { activeRecipeId, recipes } = get()
        if (!activeRecipeId) return null
        return recipes.find((r) => r.id === activeRecipeId) || null
      },

      getActiveValidation: () => {
        const recipe = get().getActiveRecipe()
        if (!recipe) return null
        return validateRecipe(recipe.stages, get().activeFieldValues)
      },

      buildActivePrompts: () => {
        const recipe = get().getActiveRecipe()
        if (!recipe) return null
        return buildRecipePrompts(recipe.stages, get().activeFieldValues)
      },

      // Categories
      addCategory: (name, icon) => {
        const id = `cat_${Date.now()}`
        const newCategory: RecipeCategory = { id, name, icon, isDefault: false }
        set((state) => ({
          categories: [...state.categories, newCategory],
        }))
        return newCategory
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id && !cat.isDefault ? { ...cat, ...updates } : cat
          ),
        }))
      },

      deleteCategory: (id) => {
        const category = get().categories.find((c) => c.id === id)
        if (!category || category.isDefault) {
          return false // Can't delete default categories
        }

        // Move recipes in this category to 'custom'
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          recipes: state.recipes.map((recipe) =>
            recipe.categoryId === id ? { ...recipe, categoryId: 'custom' } : recipe
          ),
        }))
        return true
      },

      // Initialize sample recipes
      initializeSampleRecipes: () => {
        const { recipes, addRecipe } = get()
        if (recipes.length > 0) return // Already initialized

        for (const sample of SAMPLE_RECIPES) {
          addRecipe(sample)
        }
      },
    }),
    {
      name: 'shot-creator-recipes-v3', // Updated with new sample recipes
      partialize: (state) => ({
        recipes: state.recipes,
        categories: state.categories,
        quickAccessItems: state.quickAccessItems,
      }),
    }
  )
)

// Initialize sample recipes on first load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useRecipeStore.getState().initializeSampleRecipes()
  }, 100)
}
