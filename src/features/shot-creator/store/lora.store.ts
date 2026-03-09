/**
 * LoRA Store
 * Manages user-uploaded LoRA weights with localStorage persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LoraItem {
    id: string
    name: string
    type?: 'character' | 'style'      // Default 'style' for existing LoRAs
    referenceTag?: string              // e.g. 'nava', 'pixar' - used as @tag in prompts
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

    // Community actions
    addFromCommunity: (loraId: string) => void
    removeFromCollection: (loraId: string) => void
    isInCollection: (loraId: string) => boolean

    // Computed
    getActiveLora: () => LoraItem | null
}

const BUILT_IN_LORAS: LoraItem[] = [
    {
        id: 'nava-style',
        name: 'Nava',
        type: 'style',
        referenceTag: 'nava',
        triggerWord: 'in the style of nava',
        weightsUrl: 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/loras/nava-style/nava_lora_weights.safetensors',
        thumbnailUrl: '/images/lora/nava-style.png',
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.3,
        createdAt: 0,
    },
    {
        id: 'pixar-style',
        name: 'Pixar',
        type: 'style',
        referenceTag: 'pixar',
        triggerWord: 'DisneyIZT,,',
        weightsUrl: 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/loras/pixar-style/pixar_disney_lora_weights.safetensors',
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.0,
        createdAt: 0,
    },
]

const LORA_STORAGE_BASE = 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/loras'

/** All available LoRAs users can browse in the community tab */
export const COMMUNITY_LORAS: LoraItem[] = [
    {
        id: 'nava-style',
        name: 'Nava',
        type: 'style',
        referenceTag: 'nava',
        triggerWord: 'in the style of nava',
        weightsUrl: `${LORA_STORAGE_BASE}/nava-style/nava_lora_weights.safetensors`,
        thumbnailUrl: '/images/lora/nava-style.png',
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.3,
        createdAt: 0,
    },
    {
        id: 'pixar-style',
        name: 'Pixar',
        type: 'style',
        referenceTag: 'pixar',
        triggerWord: 'DisneyIZT,,',
        weightsUrl: `${LORA_STORAGE_BASE}/pixar-style/pixar_disney_lora_weights.safetensors`,
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.0,
        createdAt: 0,
    },
    {
        id: 'poster-movie',
        name: 'Poster Movie',
        type: 'style',
        referenceTag: 'poster-movie',
        triggerWord: 'Poster Movie.',
        weightsUrl: `${LORA_STORAGE_BASE}/poster-movie/poster-movie_weights.safetensors`,
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.0,
        createdAt: 0,
    },
    {
        id: 'childish',
        name: 'Childish',
        type: 'style',
        referenceTag: 'childish',
        triggerWord: 'a childish crayon drawing',
        weightsUrl: `${LORA_STORAGE_BASE}/childish/childish_weights.safetensors`,
        thumbnailUrl: `${LORA_STORAGE_BASE}/childish/childish_thumbnail.png`,
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.0,
        createdAt: 0,
    },
    {
        id: 'impressionism',
        name: 'Impressionism',
        type: 'style',
        referenceTag: 'impressionism',
        triggerWord: 'ArsMJStyle, Impressionism',
        weightsUrl: `${LORA_STORAGE_BASE}/impressionism/impressionism_weights.safetensors`,
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 0.8,
        createdAt: 0,
    },
    {
        id: 'c64-pixel-art',
        name: 'C64 Pixel Art',
        type: 'style',
        referenceTag: 'c64',
        triggerWord: 'C64style pixel art',
        weightsUrl: `${LORA_STORAGE_BASE}/c64-pixel-art/c64-pixel-art_weights.safetensors`,
        thumbnailUrl: `${LORA_STORAGE_BASE}/c64-pixel-art/c64-pixel-art_thumbnail.png`,
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.0,
        createdAt: 0,
    },
    {
        id: 'sat-morn-cartoon',
        name: 'Sat Morn Cartoon',
        type: 'style',
        referenceTag: 'smc',
        triggerWord: 'smcstyle cartoon',
        weightsUrl: `${LORA_STORAGE_BASE}/sat-morn-cartoon/sat-morn-cartoon_weights.safetensors`,
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 1.0,
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

            addFromCommunity: (loraId) => {
                const community = COMMUNITY_LORAS.find((l) => l.id === loraId)
                if (!community) return
                const { loras } = get()
                if (loras.some((l) => l.id === loraId)) return
                set((state) => ({
                    loras: [...state.loras, { ...community }],
                }))
            },

            removeFromCollection: (loraId) => {
                set((state) => ({
                    loras: state.loras.filter((l) => l.id !== loraId),
                    activeLoraId: state.activeLoraId === loraId ? null : state.activeLoraId,
                }))
            },

            isInCollection: (loraId) => {
                const { loras } = get()
                return loras.some((l) => l.id === loraId)
            },

            getActiveLora: () => {
                const { loras, activeLoraId } = get()
                if (!activeLoraId) return null
                return loras.find((l) => l.id === activeLoraId) ?? null
            },
        }),
        {
            name: 'directors-palette-lora-store',
            version: 7,
            migrate: (persisted: unknown) => {
                const state = persisted as Record<string, unknown>
                const loras = (state?.loras as LoraItem[]) || []
                const builtInIds = new Set(BUILT_IN_LORAS.map(l => l.id))
                // Remove old built-ins no longer in the list (createdAt === 0 means built-in)
                const filtered = loras.filter(l => l.createdAt !== 0 || builtInIds.has(l.id))
                // Ensure built-in LoRAs are present and up-to-date
                for (const builtIn of BUILT_IN_LORAS) {
                    const existing = filtered.find((l) => l.id === builtIn.id)
                    if (!existing) {
                        filtered.push(builtIn)
                    } else {
                        existing.defaultLoraScale = builtIn.defaultLoraScale
                        existing.defaultGuidanceScale = builtIn.defaultGuidanceScale
                        existing.type = builtIn.type
                        existing.referenceTag = builtIn.referenceTag
                    }
                }
                return { ...state, loras: filtered }
            },
        }
    )
)
