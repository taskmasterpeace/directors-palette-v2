/**
 * Wardrobe Store (Simplified)
 * 
 * Zustand store for wardrobe management.
 * Follows same pattern as storyboard's style selection.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WardrobeState } from '../types/wardrobe.types'
import { WARDROBE_PRESETS } from '../types/wardrobe.types'

export const useWardrobeStore = create<WardrobeState>()(
    persist(
        (set, get) => ({
            // Initial state - include presets
            looks: [...WARDROBE_PRESETS],
            selectedLookId: null,

            // Actions
            addLook: (name: string, imagePath: string, forSections?: string[]) => set((state) => ({
                looks: [
                    ...state.looks,
                    {
                        id: `look_${Date.now()}`,
                        name,
                        imagePath,
                        forSections,
                        source: 'user' as const
                    }
                ]
            })),

            removeLook: (id: string) => set((state) => ({
                looks: state.looks.filter(l => l.id !== id),
                selectedLookId: state.selectedLookId === id ? null : state.selectedLookId
            })),

            selectLook: (id: string | null) => set({ selectedLookId: id }),

            getLookById: (id: string) => {
                return get().looks.find(l => l.id === id)
            },

            reset: () => set({
                looks: [...WARDROBE_PRESETS],
                selectedLookId: null
            })
        }),
        {
            name: 'wardrobe-storage',
            partialize: (state) => ({
                looks: state.looks.filter(l => l.source !== 'preset'), // Only persist user looks
                selectedLookId: state.selectedLookId
            })
        }
    )
)
