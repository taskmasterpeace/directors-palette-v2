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

export interface LoraRating {
    rating: number      // 1-5 stars
    ratedAt: number     // timestamp
}

interface LoraStore {
    // State
    loras: LoraItem[]
    activeLoraIds: string[]
    loraRatings: Record<string, LoraRating>
    usedLoraIds: string[]

    // Actions
    addLora: (lora: Omit<LoraItem, 'id' | 'createdAt'>) => string
    removeLora: (id: string) => void
    updateLora: (id: string, updates: Partial<Omit<LoraItem, 'id' | 'createdAt'>>) => void
    toggleActiveLora: (id: string) => void
    isLoraActive: (id: string) => boolean

    // Community actions
    addFromCommunity: (loraId: string) => void
    removeFromCollection: (loraId: string) => void
    isInCollection: (loraId: string) => boolean

    // Rating actions
    markLoraUsed: (id: string) => void
    rateLora: (id: string, rating: number) => void
    getLoraRating: (id: string) => LoraRating | null
    isLoraUsed: (id: string) => boolean

    // Computed
    getActiveLoras: () => LoraItem[]
    getActiveLora: () => LoraItem | null  // backward compat — returns first active
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

export const BUILT_IN_LORA_IDS = new Set(BUILT_IN_LORAS.map(l => l.id))

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
        triggerWord: 'POSTER',
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
        defaultLoraScale: 0.4,
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
    {
        id: 'zit-comic1',
        name: 'ZIT Comic',
        type: 'style',
        referenceTag: 'zit',
        triggerWord: 'zit_comic1_v1',
        weightsUrl: `${LORA_STORAGE_BASE}/zit-comic1/zit_comic1_v1.safetensors`,
        defaultGuidanceScale: 1.0,
        defaultLoraScale: 0.95,
        createdAt: 0,
    },
]

export const useLoraStore = create<LoraStore>()(
    persist(
        (set, get) => ({
            loras: BUILT_IN_LORAS,
            activeLoraIds: [],
            loraRatings: {},
            usedLoraIds: [],

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
                    activeLoraIds: state.activeLoraIds.filter((lid) => lid !== id),
                }))
            },

            updateLora: (id, updates) => {
                set((state) => ({
                    loras: state.loras.map((l) =>
                        l.id === id ? { ...l, ...updates } : l
                    ),
                }))
            },

            toggleActiveLora: (id) => {
                set((state) => {
                    const isActive = state.activeLoraIds.includes(id)
                    return {
                        activeLoraIds: isActive
                            ? state.activeLoraIds.filter((lid) => lid !== id)
                            : [...state.activeLoraIds, id],
                    }
                })
            },

            isLoraActive: (id) => {
                const { activeLoraIds } = get()
                return activeLoraIds.includes(id)
            },

            addFromCommunity: (loraId) => {
                const community = COMMUNITY_LORAS.find((l) => l.id === loraId)
                if (!community) return
                // Use functional update for atomic dedup check + add
                set((state) => {
                    if (state.loras.some((l) => l.id === loraId)) return state
                    return { loras: [...state.loras, { ...community }] }
                })
            },

            removeFromCollection: (loraId) => {
                set((state) => ({
                    loras: state.loras.filter((l) => l.id !== loraId),
                    activeLoraIds: state.activeLoraIds.filter((lid) => lid !== loraId),
                }))
            },

            isInCollection: (loraId) => {
                const { loras } = get()
                return loras.some((l) => l.id === loraId)
            },

            markLoraUsed: (id) => {
                const { usedLoraIds } = get()
                if (usedLoraIds.includes(id)) return
                set({ usedLoraIds: [...usedLoraIds, id] })
            },

            rateLora: (id, rating) => {
                set((state) => ({
                    loraRatings: {
                        ...state.loraRatings,
                        [id]: { rating, ratedAt: Date.now() },
                    },
                }))
            },

            getLoraRating: (id) => {
                const { loraRatings } = get()
                return loraRatings[id] ?? null
            },

            isLoraUsed: (id) => {
                const { usedLoraIds } = get()
                return usedLoraIds.includes(id)
            },

            getActiveLoras: () => {
                const { loras, activeLoraIds } = get()
                return activeLoraIds
                    .map((id) => loras.find((l) => l.id === id))
                    .filter((l): l is LoraItem => l !== undefined)
            },

            getActiveLora: () => {
                const { loras, activeLoraIds } = get()
                if (activeLoraIds.length === 0) return null
                return loras.find((l) => l.id === activeLoraIds[0]) ?? null
            },
        }),
        {
            name: 'directors-palette-lora-store',
            version: 10,
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
                // Ensure rating fields exist (v9)
                const loraRatings = (state?.loraRatings as Record<string, LoraRating>) || {}
                const usedLoraIds = (state?.usedLoraIds as string[]) || []
                // Migrate activeLoraId (string|null) → activeLoraIds (string[]) (v10)
                const oldActiveId = state?.activeLoraId as string | null | undefined
                const activeLoraIds = (state?.activeLoraIds as string[]) || (oldActiveId ? [oldActiveId] : [])
                return { ...state, loras: filtered, loraRatings, usedLoraIds, activeLoraIds }
            },
        }
    )
)
