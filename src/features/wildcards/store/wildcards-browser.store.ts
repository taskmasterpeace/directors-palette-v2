'use client'

import { create } from 'zustand'

interface WildcardsBrowserStore {
    // Selected wildcard ID in the sidebar
    selectedWildcardId: string | null
    setSelectedWildcardId: (id: string | null) => void

    // Is creating a new wildcard (vs editing existing)
    isCreatingNew: boolean
    setIsCreatingNew: (isCreating: boolean) => void

    // AI generation state
    isGenerating: boolean
    setIsGenerating: (isGenerating: boolean) => void

    // Draft content for new/edited wildcard
    draftName: string
    draftContent: string
    draftCategory: string
    draftDescription: string
    setDraftName: (name: string) => void
    setDraftContent: (content: string) => void
    setDraftCategory: (category: string) => void
    setDraftDescription: (description: string) => void

    // Reset draft to empty state
    resetDraft: () => void

    // Load draft from existing wildcard
    loadDraft: (name: string, content: string, category?: string, description?: string) => void
}

export const useWildcardsBrowserStore = create<WildcardsBrowserStore>((set) => ({
    selectedWildcardId: null,
    setSelectedWildcardId: (id) => set({ selectedWildcardId: id }),

    isCreatingNew: false,
    setIsCreatingNew: (isCreating) => set({ isCreatingNew: isCreating }),

    isGenerating: false,
    setIsGenerating: (isGenerating) => set({ isGenerating: isGenerating }),

    draftName: '',
    draftContent: '',
    draftCategory: '',
    draftDescription: '',
    setDraftName: (name) => set({ draftName: name }),
    setDraftContent: (content) => set({ draftContent: content }),
    setDraftCategory: (category) => set({ draftCategory: category }),
    setDraftDescription: (description) => set({ draftDescription: description }),

    resetDraft: () => set({
        draftName: '',
        draftContent: '',
        draftCategory: '',
        draftDescription: '',
        isCreatingNew: false,
        selectedWildcardId: null,
    }),

    loadDraft: (name, content, category = '', description = '') => set({
        draftName: name,
        draftContent: content,
        draftCategory: category,
        draftDescription: description,
    }),
}))
