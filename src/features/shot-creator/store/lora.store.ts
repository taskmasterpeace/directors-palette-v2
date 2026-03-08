/**
 * LoRA Store
 * Manages user-uploaded LoRA weights with localStorage persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LoraItem {
    id: string
    name: string
    triggerWord: string
    weightsUrl: string       // Supabase Storage public URL
    thumbnailUrl?: string
    defaultGuidanceScale: number  // e.g. 1.0
    defaultLoraScale: number      // e.g. 1.0
    createdAt: number
}

interface LoraStore {
    // State
    loras: LoraItem[]
    activeLoraId: string | null

    // Actions
    addLora: (lora: Omit<LoraItem, 'id' | 'createdAt'>) => string
    removeLora: (id: string) => void
    updateLora: (id: string, updates: Partial<Omit<LoraItem, 'id' | 'createdAt'>>) => void
    setActiveLora: (id: string | null) => void

    // Computed
    getActiveLora: () => LoraItem | null
}

const BUILT_IN_LORAS: LoraItem[] = [
    {
        id: 'nava-style',
        name: 'Nava',
        triggerWord: 'in the style of nava',
        weightsUrl: 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/loras/nava-style/nava_lora_weights.safetensors',
        thumbnailUrl: '/images/lora/nava-style.png',
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.3,
        createdAt: 0,
    },
    {
        id: 'battlerap-style',
        name: 'Battle Rap',
        triggerWord: 'in the style of battlerap',
        weightsUrl: 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/loras/battlerap-style/battlerap_lora_weights.safetensors',
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.3,
        createdAt: 0,
    },
]

export const useLoraStore = create<LoraStore>()(
    persist(
        (set, get) => ({
            loras: BUILT_IN_LORAS,
            activeLoraId: null,

            addLora: (lora) => {
                const id = `lora_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                const newLora: LoraItem = {
                    ...lora,
                    id,
                    createdAt: Date.now(),
                }
                set((state) => ({
                    loras: [...state.loras, newLora],
                }))
                return id
            },

            removeLora: (id) => {
                set((state) => ({
                    loras: state.loras.filter((l) => l.id !== id),
                    activeLoraId: state.activeLoraId === id ? null : state.activeLoraId,
                }))
            },

            updateLora: (id, updates) => {
                set((state) => ({
                    loras: state.loras.map((l) =>
                        l.id === id ? { ...l, ...updates } : l
                    ),
                }))
            },

            setActiveLora: (id) => {
                set({ activeLoraId: id })
            },

            getActiveLora: () => {
                const { loras, activeLoraId } = get()
                if (!activeLoraId) return null
                return loras.find((l) => l.id === activeLoraId) ?? null
            },
        }),
        {
            name: 'directors-palette-lora-store',
            version: 3,
            migrate: (persisted: unknown) => {
                const state = persisted as Record<string, unknown>
                const loras = (state?.loras as LoraItem[]) || []
                // Ensure built-in LoRAs are present and up-to-date
                for (const builtIn of BUILT_IN_LORAS) {
                    const existing = loras.find((l) => l.id === builtIn.id)
                    if (!existing) {
                        loras.push(builtIn)
                    } else {
                        // Update built-in defaults
                        existing.defaultLoraScale = builtIn.defaultLoraScale
                        existing.defaultGuidanceScale = builtIn.defaultGuidanceScale
                    }
                }
                return { ...state, loras }
            },
        }
    )
)
