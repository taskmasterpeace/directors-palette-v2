/**
 * usePromptTemplates Hook
 *
 * State management for prompt template editing in the admin UI.
 */

import { useState, useCallback, useEffect } from 'react'
import type {
  Token,
  PromptTemplate,
  TemplateSlot,
  ModuleType,
  TemplateConfig,
  TokenCategoryMeta,
} from '../types/prompt-template.types'
import {
  DEFAULT_CONFIG,
  DEFAULT_TOKENS,
  DEFAULT_TEMPLATES,
  TOKEN_CATEGORIES,
  BANNED_TERMS,
} from '../data/default-tokens'

interface UsePromptTemplatesState {
  tokens: Token[]
  templates: PromptTemplate[]
  categories: TokenCategoryMeta[]
  bannedTerms: string[]
  selectedModule: ModuleType
  selectedTemplate: PromptTemplate | null
  editingToken: Token | null
  hasUnsavedChanges: boolean
  isLoading: boolean
  error: string | null
}

interface UsePromptTemplatesActions {
  // Module/Template selection
  setSelectedModule: (module: ModuleType) => void
  setSelectedTemplate: (templateId: string | null) => void

  // Token CRUD
  addToken: (token: Token) => void
  updateToken: (tokenId: string, updates: Partial<Token>) => void
  deleteToken: (tokenId: string) => void
  setEditingToken: (token: Token | null) => void

  // Template CRUD
  addTemplate: (template: PromptTemplate) => void
  updateTemplate: (templateId: string, updates: Partial<PromptTemplate>) => void
  deleteTemplate: (templateId: string) => void
  duplicateTemplate: (templateId: string) => void

  // Template slots
  addSlotToTemplate: (templateId: string, slot: TemplateSlot) => void
  removeSlotFromTemplate: (templateId: string, slotId: string) => void
  reorderSlots: (templateId: string, sourceIndex: number, destIndex: number) => void
  updateSlot: (templateId: string, slotId: string, updates: Partial<TemplateSlot>) => void

  // Banned terms
  addBannedTerm: (term: string) => void
  removeBannedTerm: (term: string) => void

  // Persistence
  saveConfig: () => Promise<void>
  loadConfig: () => Promise<void>
  resetToDefaults: () => void
}

export type UsePromptTemplatesReturn = UsePromptTemplatesState & UsePromptTemplatesActions

const STORAGE_KEY = 'prompt-templates-config'

export function usePromptTemplates(): UsePromptTemplatesReturn {
  const [state, setState] = useState<UsePromptTemplatesState>({
    tokens: DEFAULT_TOKENS,
    templates: DEFAULT_TEMPLATES,
    categories: TOKEN_CATEGORIES,
    bannedTerms: BANNED_TERMS,
    selectedModule: 'storyboard',
    selectedTemplate: null,
    editingToken: null,
    hasUnsavedChanges: false,
    isLoading: false,
    error: null,
  })

  // Load config on mount
  useEffect(() => {
    loadConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select template when module changes
  useEffect(() => {
    const moduleTemplates = state.templates.filter(t => t.moduleId === state.selectedModule)
    if (moduleTemplates.length > 0 && !state.selectedTemplate) {
      setState(prev => ({
        ...prev,
        selectedTemplate: moduleTemplates[0],
      }))
    } else if (state.selectedTemplate && state.selectedTemplate.moduleId !== state.selectedModule) {
      setState(prev => ({
        ...prev,
        selectedTemplate: moduleTemplates[0] || null,
      }))
    }
  }, [state.selectedModule, state.templates, state.selectedTemplate])

  // Module/Template selection
  const setSelectedModule = useCallback((module: ModuleType) => {
    setState(prev => ({
      ...prev,
      selectedModule: module,
      selectedTemplate: null,
    }))
  }, [])

  const setSelectedTemplate = useCallback((templateId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedTemplate: templateId
        ? prev.templates.find(t => t.id === templateId) || null
        : null,
    }))
  }, [])

  // Token CRUD
  const addToken = useCallback((token: Token) => {
    setState(prev => ({
      ...prev,
      tokens: [...prev.tokens, token],
      hasUnsavedChanges: true,
    }))
  }, [])

  const updateToken = useCallback((tokenId: string, updates: Partial<Token>) => {
    setState(prev => ({
      ...prev,
      tokens: prev.tokens.map(t =>
        t.id === tokenId ? { ...t, ...updates } : t
      ),
      hasUnsavedChanges: true,
    }))
  }, [])

  const deleteToken = useCallback((tokenId: string) => {
    setState(prev => ({
      ...prev,
      tokens: prev.tokens.filter(t => t.id !== tokenId),
      // Also remove from all templates
      templates: prev.templates.map(template => ({
        ...template,
        slots: template.slots.filter(s => s.tokenId !== tokenId),
      })),
      hasUnsavedChanges: true,
    }))
  }, [])

  const setEditingToken = useCallback((token: Token | null) => {
    setState(prev => ({
      ...prev,
      editingToken: token,
    }))
  }, [])

  // Template CRUD
  const addTemplate = useCallback((template: PromptTemplate) => {
    setState(prev => ({
      ...prev,
      templates: [...prev.templates, template],
      selectedTemplate: template,
      hasUnsavedChanges: true,
    }))
  }, [])

  const updateTemplate = useCallback((templateId: string, updates: Partial<PromptTemplate>) => {
    setState(prev => {
      const updatedTemplates = prev.templates.map(t =>
        t.id === templateId
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      )
      return {
        ...prev,
        templates: updatedTemplates,
        selectedTemplate: prev.selectedTemplate?.id === templateId
          ? updatedTemplates.find(t => t.id === templateId) || null
          : prev.selectedTemplate,
        hasUnsavedChanges: true,
      }
    })
  }, [])

  const deleteTemplate = useCallback((templateId: string) => {
    setState(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== templateId),
      selectedTemplate: prev.selectedTemplate?.id === templateId
        ? null
        : prev.selectedTemplate,
      hasUnsavedChanges: true,
    }))
  }, [])

  const duplicateTemplate = useCallback((templateId: string) => {
    setState(prev => {
      const template = prev.templates.find(t => t.id === templateId)
      if (!template) return prev

      const newTemplate: PromptTemplate = {
        ...template,
        id: crypto.randomUUID(),
        name: `${template.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      return {
        ...prev,
        templates: [...prev.templates, newTemplate],
        selectedTemplate: newTemplate,
        hasUnsavedChanges: true,
      }
    })
  }, [])

  // Template slots
  const addSlotToTemplate = useCallback((templateId: string, slot: TemplateSlot) => {
    updateTemplate(templateId, {
      slots: [
        ...(state.templates.find(t => t.id === templateId)?.slots || []),
        slot,
      ],
    })
  }, [state.templates, updateTemplate])

  const removeSlotFromTemplate = useCallback((templateId: string, slotId: string) => {
    const template = state.templates.find(t => t.id === templateId)
    if (!template) return

    updateTemplate(templateId, {
      slots: template.slots.filter(s => s.id !== slotId),
    })
  }, [state.templates, updateTemplate])

  const reorderSlots = useCallback((templateId: string, sourceIndex: number, destIndex: number) => {
    const template = state.templates.find(t => t.id === templateId)
    if (!template) return

    const newSlots = [...template.slots]
    const [removed] = newSlots.splice(sourceIndex, 1)
    newSlots.splice(destIndex, 0, removed)

    updateTemplate(templateId, { slots: newSlots })
  }, [state.templates, updateTemplate])

  const updateSlot = useCallback((templateId: string, slotId: string, updates: Partial<TemplateSlot>) => {
    const template = state.templates.find(t => t.id === templateId)
    if (!template) return

    updateTemplate(templateId, {
      slots: template.slots.map(s =>
        s.id === slotId ? { ...s, ...updates } : s
      ),
    })
  }, [state.templates, updateTemplate])

  // Banned terms
  const addBannedTerm = useCallback((term: string) => {
    if (!term.trim()) return
    setState(prev => ({
      ...prev,
      bannedTerms: [...prev.bannedTerms, term.trim().toLowerCase()],
      hasUnsavedChanges: true,
    }))
  }, [])

  const removeBannedTerm = useCallback((term: string) => {
    setState(prev => ({
      ...prev,
      bannedTerms: prev.bannedTerms.filter(t => t !== term),
      hasUnsavedChanges: true,
    }))
  }, [])

  // Persistence
  const saveConfig = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const config: TemplateConfig = {
        version: DEFAULT_CONFIG.version,
        tokens: state.tokens,
        templates: state.templates,
        categories: state.categories,
      }

      // For MVP, save to localStorage
      // Later: save to API/database
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))

      setState(prev => ({
        ...prev,
        hasUnsavedChanges: false,
        isLoading: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save config',
        isLoading: false,
      }))
    }
  }, [state.tokens, state.templates, state.categories])

  const loadConfig = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // For MVP, load from localStorage
      // Later: load from API/database
      const saved = localStorage.getItem(STORAGE_KEY)

      if (saved) {
        const config: TemplateConfig = JSON.parse(saved)
        setState(prev => ({
          ...prev,
          tokens: config.tokens || DEFAULT_TOKENS,
          templates: config.templates || DEFAULT_TEMPLATES,
          categories: config.categories || TOKEN_CATEGORIES,
          hasUnsavedChanges: false,
          isLoading: false,
        }))
      } else {
        setState(prev => ({
          ...prev,
          hasUnsavedChanges: false,
          isLoading: false,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load config',
        isLoading: false,
      }))
    }
  }, [])

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({
      tokens: DEFAULT_TOKENS,
      templates: DEFAULT_TEMPLATES,
      categories: TOKEN_CATEGORIES,
      bannedTerms: BANNED_TERMS,
      selectedModule: 'storyboard',
      selectedTemplate: null,
      editingToken: null,
      hasUnsavedChanges: false,
      isLoading: false,
      error: null,
    })
  }, [])

  return {
    ...state,
    setSelectedModule,
    setSelectedTemplate,
    addToken,
    updateToken,
    deleteToken,
    setEditingToken,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    addSlotToTemplate,
    removeSlotFromTemplate,
    reorderSlots,
    updateSlot,
    addBannedTerm,
    removeBannedTerm,
    saveConfig,
    loadConfig,
    resetToDefaults,
  }
}
