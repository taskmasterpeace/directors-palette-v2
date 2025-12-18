import { create } from 'zustand'
import {
  Recipe,
  RecipeStage,
  RecipeFieldValues,
  QuickAccessItem,
  RecipeCategory,
  RecipeReferenceImage,
  RecipeValidation,
  DEFAULT_RECIPE_CATEGORIES,
  parseStageTemplate,
  buildRecipePrompts,
  validateRecipe,
} from '../types/recipe.types'
import { recipeService, DbQuickAccessItem } from '../services/recipe.service'

interface RecipeState {
  // Recipes
  recipes: Recipe[]
  categories: RecipeCategory[]
  isLoading: boolean
  isInitialized: boolean
  currentUserId: string | null

  // Quick Access (up to 9 items)
  quickAccessItems: QuickAccessItem[]

  // Active recipe state (when filling out a recipe form)
  activeRecipeId: string | null
  activeFieldValues: RecipeFieldValues

  // Actions - Initialize & Sync
  initialize: (userId: string) => Promise<void>
  refreshRecipes: () => Promise<void>

  // Actions - Recipes
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Recipe | null>
  updateRecipe: (id: string, updates: Partial<Omit<Recipe, 'id' | 'createdAt'>>) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  getRecipe: (id: string) => Recipe | undefined

  // Actions - Recipe Stages
  addStageToRecipe: (recipeId: string) => Promise<void>
  removeStageFromRecipe: (recipeId: string, stageId: string) => Promise<void>
  updateStageTemplate: (recipeId: string, stageId: string, template: string) => Promise<void>
  addReferenceImageToStage: (recipeId: string, stageId: string, image: RecipeReferenceImage) => Promise<void>
  removeReferenceImageFromStage: (recipeId: string, stageId: string, imageId: string) => Promise<void>

  // Actions - Quick Access
  addToQuickAccess: (recipeId: string, label: string) => Promise<boolean>
  removeFromQuickAccess: (id: string) => Promise<void>
  reorderQuickAccess: (items: QuickAccessItem[]) => Promise<void>
  updateQuickAccessLabel: (id: string, label: string) => Promise<void>

  // Actions - Active Recipe (local state only)
  setActiveRecipe: (recipeId: string | null) => void
  setFieldValue: (fieldId: string, value: string) => void
  clearFieldValues: () => void
  getActiveRecipe: () => Recipe | null
  getActiveValidation: () => RecipeValidation | null
  buildActivePrompts: () => string[] | null

  // Actions - Categories (local only for now)
  addCategory: (name: string, icon: string) => RecipeCategory
  updateCategory: (id: string, updates: Partial<Omit<RecipeCategory, 'id' | 'isDefault'>>) => void
  deleteCategory: (id: string) => boolean
}

// Convert DB quick access item to store format
function dbQuickAccessToStore(dbItem: DbQuickAccessItem): QuickAccessItem {
  return {
    id: dbItem.id,
    type: 'recipe',
    label: dbItem.label,
    recipeId: dbItem.recipe_id,
    order: dbItem.display_order,
  }
}

export const useRecipeStore = create<RecipeState>()((set, get) => ({
  recipes: [],
  categories: DEFAULT_RECIPE_CATEGORIES,
  quickAccessItems: [],
  activeRecipeId: null,
  activeFieldValues: {},
  isLoading: false,
  isInitialized: false,
  currentUserId: null,

  // Initialize store with user's recipes from database
  initialize: async (userId: string) => {
    const state = get()

    // Skip if already initialized for this user
    if (state.isInitialized && state.currentUserId === userId) {
      return
    }

    set({ isLoading: true })

    try {
      // Fetch recipes and quick access items in parallel
      const [recipes, quickAccessItems] = await Promise.all([
        recipeService.getRecipes(userId),
        recipeService.getQuickAccessItems(userId),
      ])

      set({
        recipes,
        quickAccessItems: quickAccessItems.map(dbQuickAccessToStore),
        isLoading: false,
        isInitialized: true,
        currentUserId: userId,
      })

      console.log(`📚 Loaded ${recipes.length} recipes for user`)
    } catch (error) {
      console.error('Error initializing recipe store:', error)
      set({ isLoading: false })
    }
  },

  // Refresh recipes from database
  refreshRecipes: async () => {
    const userId = get().currentUserId
    if (!userId) return

    set({ isLoading: true })

    try {
      const [recipes, quickAccessItems] = await Promise.all([
        recipeService.getRecipes(userId),
        recipeService.getQuickAccessItems(userId),
      ])

      set({
        recipes,
        quickAccessItems: quickAccessItems.map(dbQuickAccessToStore),
        isLoading: false,
      })
    } catch (error) {
      console.error('Error refreshing recipes:', error)
      set({ isLoading: false })
    }
  },

  // Recipe CRUD
  addRecipe: async (recipeData) => {
    const userId = get().currentUserId
    if (!userId) {
      console.error('Cannot add recipe: No user ID')
      return null
    }

    // Parse stages and fields
    const stages = recipeData.stages.map((stage, index) => ({
      ...stage,
      id: stage.id || `stage_${index}_${Date.now()}`,
      fields: parseStageTemplate(stage.template, index),
    }))

    const recipeWithStages = { ...recipeData, stages }

    // Create in database
    const newRecipe = await recipeService.createRecipe(recipeWithStages, userId)
    if (!newRecipe) {
      console.error('Failed to create recipe in database')
      return null
    }

    // Update local state
    set((state) => ({
      recipes: [newRecipe, ...state.recipes],
    }))

    // If marked as quick access, add to quick access bar
    if (recipeData.isQuickAccess && recipeData.quickAccessLabel) {
      await get().addToQuickAccess(newRecipe.id, recipeData.quickAccessLabel)
    }

    return newRecipe
  },

  updateRecipe: async (id, updates) => {
    const userId = get().currentUserId
    if (!userId) return

    // If stages are updated, re-parse fields
    const processedUpdates = {
      ...updates,
      ...(updates.stages && {
        stages: updates.stages.map((stage, index) => ({
          ...stage,
          fields: parseStageTemplate(stage.template, index),
        }))
      })
    }

    // Update in database
    const updatedRecipe = await recipeService.updateRecipe(id, processedUpdates, userId)
    if (!updatedRecipe) {
      console.error('Failed to update recipe in database')
      return
    }

    // Update local state
    set((state) => ({
      recipes: state.recipes.map((recipe) =>
        recipe.id === id ? updatedRecipe : recipe
      ),
    }))
  },

  deleteRecipe: async (id) => {
    const userId = get().currentUserId
    if (!userId) return

    // Remove from quick access if present
    const quickAccessItem = get().quickAccessItems.find(
      (item) => item.recipeId === id
    )
    if (quickAccessItem) {
      await get().removeFromQuickAccess(quickAccessItem.id)
    }

    // Clear active recipe if it's the one being deleted
    if (get().activeRecipeId === id) {
      set({ activeRecipeId: null, activeFieldValues: {} })
    }

    // Delete from database
    const success = await recipeService.deleteRecipe(id, userId)
    if (!success) {
      console.error('Failed to delete recipe from database')
      return
    }

    // Update local state
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
    }))
  },

  getRecipe: (id) => {
    return get().recipes.find((r) => r.id === id)
  },

  // Stage Management
  addStageToRecipe: async (recipeId) => {
    const recipe = get().getRecipe(recipeId)
    if (!recipe) return

    const newStageIndex = recipe.stages.length
    const newStage: RecipeStage = {
      id: `stage_${newStageIndex}_${Date.now()}`,
      order: newStageIndex,
      template: '',
      fields: [],
      referenceImages: [],
    }

    await get().updateRecipe(recipeId, {
      stages: [...recipe.stages, newStage],
    })
  },

  removeStageFromRecipe: async (recipeId, stageId) => {
    const recipe = get().getRecipe(recipeId)
    if (!recipe || recipe.stages.length <= 1) return

    const newStages = recipe.stages
      .filter((s) => s.id !== stageId)
      .map((s, index) => ({ ...s, order: index }))

    await get().updateRecipe(recipeId, { stages: newStages })
  },

  updateStageTemplate: async (recipeId, stageId, template) => {
    const recipe = get().getRecipe(recipeId)
    if (!recipe) return

    const newStages = recipe.stages.map((stage) => {
      if (stage.id !== stageId) return stage
      return {
        ...stage,
        template,
        fields: parseStageTemplate(template, stage.order),
      }
    })

    await get().updateRecipe(recipeId, { stages: newStages })
  },

  addReferenceImageToStage: async (recipeId, stageId, image) => {
    const userId = get().currentUserId
    if (!userId) return

    const updatedRecipe = await recipeService.addReferenceImageToStage(
      recipeId,
      stageId,
      image,
      userId
    )

    if (updatedRecipe) {
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === recipeId ? updatedRecipe : r
        ),
      }))
    }
  },

  removeReferenceImageFromStage: async (recipeId, stageId, imageId) => {
    const userId = get().currentUserId
    if (!userId) return

    const updatedRecipe = await recipeService.removeReferenceImageFromStage(
      recipeId,
      stageId,
      imageId,
      userId
    )

    if (updatedRecipe) {
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === recipeId ? updatedRecipe : r
        ),
      }))
    }
  },

  // Quick Access (max 9 items)
  addToQuickAccess: async (recipeId, label) => {
    const userId = get().currentUserId
    if (!userId) return false

    const items = get().quickAccessItems
    if (items.length >= 9) return false
    if (items.some((item) => item.recipeId === recipeId)) return false

    const dbItem = await recipeService.addToQuickAccess(recipeId, label, userId)
    if (!dbItem) return false

    set((state) => ({
      quickAccessItems: [
        ...state.quickAccessItems,
        dbQuickAccessToStore(dbItem),
      ],
    }))

    return true
  },

  removeFromQuickAccess: async (id) => {
    const userId = get().currentUserId
    if (!userId) return

    const success = await recipeService.removeFromQuickAccess(id, userId)
    if (!success) return

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

  reorderQuickAccess: async (items) => {
    const userId = get().currentUserId
    if (!userId) return

    const reorderedItems = items.map((item, index) => ({
      ...item,
      order: index,
    }))

    // Update local state immediately for responsiveness
    set({ quickAccessItems: reorderedItems })

    // Sync to database
    await recipeService.reorderQuickAccess(
      reorderedItems.map((item) => ({ id: item.id, order: item.order })),
      userId
    )
  },

  updateQuickAccessLabel: async (id, label) => {
    const userId = get().currentUserId
    if (!userId) return

    const success = await recipeService.updateQuickAccessLabel(id, label, userId)
    if (!success) return

    set((state) => ({
      quickAccessItems: state.quickAccessItems.map((item) =>
        item.id === id ? { ...item, label } : item
      ),
    }))
  },

  // Active Recipe (local state only - no database sync needed)
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

  // Categories (local only for now - could be moved to DB later)
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
      return false
    }

    set((state) => ({
      categories: state.categories.filter((cat) => cat.id !== id),
    }))
    return true
  },
}))
