import { getClient } from "@/lib/db/client"
import { create } from 'zustand'
import { DEFAULT_CATEGORIES } from "../constants"
import { promptLibrarySettingsService } from "../services/prompt-library-settings.service"

export interface PromptCategory {
  id: string
  name: string
  icon: string
  color: string
  order: number
  isEditable: boolean
}

export interface SavedPrompt {
  id: string
  userId: string
  prompt: string
  title: string
  categoryId: string
  tags: string[]
  isQuickAccess: boolean
  reference?: string // @reference tag for easy access
  usage: {
    count: number
    lastUsed: string
  }
  metadata: {
    model?: string
    source?: string
    createdAt: string
    updatedAt: string
  }
}

interface PromptLibraryState {
  // Data
  prompts: SavedPrompt[]
  categories: PromptCategory[]
  quickPrompts: SavedPrompt[]
  searchQuery: string
  selectedCategory: string | null
  selectedPrompt: SavedPrompt | null
  isLoading: boolean
  error: string | null

  // Actions - Categories
  addCategory: (category: Omit<PromptCategory, 'id'>) => Promise<void>
  updateCategory: (id: string, updates: Partial<PromptCategory>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Actions - Prompts
  addPrompt: (prompt: Omit<SavedPrompt, 'userId' | 'usage' | 'id'> & { id?: string; metadata?: Partial<SavedPrompt['metadata']> }) => Promise<void>
  updatePrompt: (id: string, updates: Partial<SavedPrompt>) => Promise<void>
  deletePrompt: (id: string) => Promise<void>
  toggleQuickAccess: (id: string) => Promise<void>

  // Actions - Search & Filter
  setSearchQuery: (query: string) => void
  setSelectedCategory: (categoryId: string | null) => void
  setSelectedPrompt: (prompt: SavedPrompt | null) => void

  // Actions - Data Management
  loadUserPrompts: (userId: string) => Promise<void>
  saveToSettings: (userId: string) => Promise<void>
  debouncedSaveToSettings: (userId: string) => void
  clearAllPrompts: () => void
  deduplicatePrompts: () => void

  // Computed
  getFilteredPrompts: () => SavedPrompt[]
  getPromptsByCategory: (categoryId: string) => SavedPrompt[]
  getPromptByReference: (reference: string) => SavedPrompt | undefined
  getAllReferences: () => string[]
}

// Debounce timer stored outside of Zustand state to avoid re-renders
let saveTimeout: NodeJS.Timeout | null = null

export const usePromptLibraryStore = create<PromptLibraryState>()((set, get) => ({
      prompts: [],
      categories: DEFAULT_CATEGORIES,
      quickPrompts: [],
      searchQuery: '',
      selectedCategory: null,
      selectedPrompt: null,
      isLoading: false,
      error: null,

      // Categories
      addCategory: async (category) => {
        const newCategory: PromptCategory = {
          ...category,
          id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isEditable: true
        }

        set(state => ({
          categories: [...state.categories, newCategory]
        }))

        // Save to settings in background (debounced)
        getCurrentUserId().then(userId => {
          if (userId) get().debouncedSaveToSettings(userId)
        })
      },

      updateCategory: async (id, updates) => {
        set(state => ({
          categories: state.categories.map(cat =>
            cat.id === id && cat.isEditable ? { ...cat, ...updates } : cat
          )
        }))

        // Save to settings in background (debounced)
        getCurrentUserId().then(userId => {
          if (userId) get().debouncedSaveToSettings(userId)
        })
      },

      deleteCategory: async (id) => {
        const category = get().categories.find(c => c.id === id)
        if (!category?.isEditable) return

        // Move prompts to 'custom' category
        set(state => ({
          categories: state.categories.filter(cat => cat.id !== id),
          prompts: state.prompts.map(prompt =>
            prompt.categoryId === id ? { ...prompt, categoryId: 'custom' } : prompt
          )
        }))

        // Save to settings in background (debounced)
        getCurrentUserId().then(userId => {
          if (userId) get().debouncedSaveToSettings(userId)
        })
      },

      // Prompts
      addPrompt: async (promptData) => {
        const userId = await getCurrentUserId() || 'guest'
        const state = get()

        // Check if prompt already exists by title+categoryId combination
        const existingPrompt = state.prompts.find(p =>
          (p.title === promptData.title && p.categoryId === promptData.categoryId)
        )

        if (existingPrompt) {
          throw new Error('A prompt with this title already exists in this category')
        }

        const newPrompt: SavedPrompt = {
          ...promptData,
          id: promptData.id || `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          reference: promptData.reference || `@${promptData.title.toLowerCase().replace(/\s+/g, '_')}`,
          usage: {
            count: 0,
            lastUsed: new Date().toISOString()
          },
          metadata: {
            ...promptData.metadata,
            createdAt: promptData.metadata?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }

        set(state => {
          const updatedPrompts = [...state.prompts, newPrompt]
          const quickPrompts = newPrompt.isQuickAccess
            ? [...state.quickPrompts, newPrompt]
            : state.quickPrompts

          return {
            prompts: updatedPrompts,
            quickPrompts
          }
        })

        if (userId !== 'guest') {
          get().debouncedSaveToSettings(userId)
        }
      },

      updatePrompt: async (id, updates) => {
        set(state => {
          const updatedPrompts = state.prompts.map(prompt =>
            prompt.id === id
              ? {
                ...prompt,
                ...updates,
                metadata: {
                  ...prompt.metadata,
                  updatedAt: new Date().toISOString()
                }
              }
              : prompt
          )

          const quickPrompts = updatedPrompts.filter(p => p.isQuickAccess)

          return {
            prompts: updatedPrompts,
            quickPrompts
          }
        })

        // Save to settings in background (debounced)
        getCurrentUserId().then(userId => {
          if (userId) get().debouncedSaveToSettings(userId)
        })
      },

      deletePrompt: async (id) => {
        set(state => ({
          prompts: state.prompts.filter(prompt => prompt.id !== id),
          quickPrompts: state.quickPrompts.filter(prompt => prompt.id !== id)
        }))

        // Save to settings in background (debounced)
        getCurrentUserId().then(userId => {
          if (userId) get().debouncedSaveToSettings(userId)
        })
      },

      toggleQuickAccess: async (id) => {
        set(state => {
          const updatedPrompts = state.prompts.map(prompt =>
            prompt.id === id
              ? { ...prompt, isQuickAccess: !prompt.isQuickAccess }
              : prompt
          )

          const quickPrompts = updatedPrompts.filter(p => p.isQuickAccess)

          return {
            prompts: updatedPrompts,
            quickPrompts
          }
        })

        // Save to settings in background (debounced)
        getCurrentUserId().then(userId => {
          if (userId) get().debouncedSaveToSettings(userId)
        })
      },

      // Search & Filter
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
      setSelectedPrompt: (prompt) => set({ selectedPrompt: prompt }),

      // Data Management
      loadUserPrompts: async (userId) => {
        set({ isLoading: true, error: null })
        const supabase = await getClient()
        try {
          // If no Supabase or no userId, work in offline mode
          if (!supabase || !userId || userId === 'guest') {
            set({ isLoading: false })
            return
          }

          // Load prompts from settings service
          const settings = await promptLibrarySettingsService.loadSettings(userId)

          if (settings) {
            // Merge default categories with custom ones from settings
            const customCategories = settings.categories.filter(c => c.isEditable)

            set({
              prompts: settings.prompts,
              quickPrompts: settings.quickPrompts,
              categories: [
                ...DEFAULT_CATEGORIES,
                ...customCategories
              ],
              isLoading: false
            })
          } else {
            set({ isLoading: false })
          }
        } catch (error) {
          console.warn('Prompt Library: Working in offline mode due to:', error instanceof Error ? error.message : error)
          // Don't set error state, just work offline
          set({ isLoading: false })
        }
      },

      saveToSettings: async (userId) => {
        // Skip saving if no userId or guest user
        if (!userId || userId === 'guest') {
          return
        }

        try {
          const state = get()

          // Save to settings service
          await promptLibrarySettingsService.saveSettings(userId, {
            prompts: state.prompts,
            categories: state.categories,
            quickPrompts: state.quickPrompts
          })
        } catch (error) {
          console.warn('Failed to save to settings (will retry later):', error instanceof Error ? error.message : error)
          // Don't throw - just log and continue
        }
      },

      // Debounced save to prevent excessive Supabase calls
      debouncedSaveToSettings: (userId) => {
        // Skip saving if no userId or guest user
        if (!userId || userId === 'guest') {
          return
        }

        // Clear existing timeout
        if (saveTimeout) {
          clearTimeout(saveTimeout)
        }

        // Set new timeout - save after 1 second of inactivity
        saveTimeout = setTimeout(() => {
          get().saveToSettings(userId)
        }, 1000)
      },

      clearAllPrompts: () => {
        set({
          prompts: [],
          quickPrompts: [],
          searchQuery: '',
          selectedCategory: null,
          selectedPrompt: null
        })
      },

      deduplicatePrompts: () => {
        set(state => {
          // Deduplicate by ID, keeping only the first occurrence
          const seenIds = new Set<string>()
          const deduplicatedPrompts = state.prompts.filter(prompt => {
            if (seenIds.has(prompt.id)) {
              return false // Skip duplicate
            }
            seenIds.add(prompt.id)
            return true
          })

          // Regenerate quick prompts from deduplicated prompts
          const quickPrompts = deduplicatedPrompts.filter(p => p.isQuickAccess)

          return {
            prompts: deduplicatedPrompts,
            quickPrompts
          }
        })
      },

      // Computed
      getFilteredPrompts: () => {
        const state = get()
        let filtered = state.prompts

        // Filter by category
        if (state.selectedCategory) {
          filtered = filtered.filter(p => p.categoryId === state.selectedCategory)
        }

        // Filter by search query
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase()
          filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.prompt.toLowerCase().includes(query) ||
            p.tags.some(tag => tag.toLowerCase().includes(query)) ||
            p.reference?.toLowerCase().includes(query)
          )
        }

        return filtered
      },

      getPromptsByCategory: (categoryId) => {
        return get().prompts.filter(p => p.categoryId === categoryId)
      },

      getPromptByReference: (reference) => {
        return get().prompts.find(p => p.reference === reference)
      },

      getAllReferences: () => {
        return get().prompts
          .map(p => p.reference)
          .filter((ref): ref is string => ref !== undefined)
      }
    }))

// Helper to get current user ID (SSR-safe)
async function getCurrentUserId(): Promise<string> {
  if (typeof window === 'undefined') return '' // SSR check
  const supabase = await getClient()
  if (!supabase) return ''
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || ''
  } catch (error) {
    console.error('Failed to get user ID:', error)
    return ''
  }
}