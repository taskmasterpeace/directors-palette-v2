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
    storagePath?: string     // Supabase Storage path for deletion
    thumbnailUrl?: string
    defaultGuidanceScale: number  // e.g. 1.0
    defaultLoraScale: number      // e.g. 1.0
    compatibleModels?: string[]  // If set, only show for these model IDs (e.g. ['flux-2-klein-9b'])
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
    loraThumbnails: Record<string, string>  // loraId → custom thumbnail URL override

    // Actions
    addLora: (lora: Omit<LoraItem, 'id' | 'createdAt'>) => string
    removeLora: (id: string) => void
    updateLora: (id: string, updates: Partial<Omit<LoraItem, 'id' | 'createdAt'>>) => void
    toggleActiveLora: (id: string) => void
    isLoraActive: (id: string) => boolean
    setLoraThumbnail: (id: string, url: string) => void
    getLoraThumbnail: (id: string, fallback?: string) => string | undefined

    // Community actions
    addFromCommunity: (loraId: string) => void
    removeFromCollection: (loraId: string) => void
    isInCollection: (loraId: string) => boolean

    // Rating actions
    markLoraUsed: (id: string) => void
    rateLora: (id: string, rating: number) => void
    getLoraRating: (id: string) => LoraRating | null
    isLoraUsed: (id: string) => boolean

    // Admin
    ensureAdminLoras: () => void  // Adds all built-in LoRAs for admin users

    // DB-backed actions
    fetchUserLoras: () => Promise<void>
    addLoraToDb: (lora: Omit<LoraItem, 'id' | 'createdAt'>) => Promise<string | null>
    removeLoraFromDb: (id: string) => Promise<boolean>
    migrateFromLocalStorage: () => Promise<void>

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

const LORA_STORAGE_BASE = 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/loras'

/** LoRAs compatible with Flux 2 Klein 9B (routed through fal.ai for quality) */
const FLUX2_9B_LORAS: LoraItem[] = [
    {
        id: 'claymation-k9b',
        name: 'Claymation',
        type: 'style',
        referenceTag: 'claymation',
        triggerWord: 'Claymation',
        weightsUrl: `${LORA_STORAGE_BASE}/claymation-k9b/Claymation_K9B.safetensors`,
        defaultGuidanceScale: 5.0,
        defaultLoraScale: 1.0,
        compatibleModels: ['flux-2-klein-9b'],
        createdAt: 0,
    },
    {
        id: 'inflate-k9b',
        name: 'Inflate',
        type: 'style',
        referenceTag: 'inflate',
        triggerWord: 'inflate the',
        weightsUrl: `${LORA_STORAGE_BASE}/inflate-k9b/infl8_k9b.safetensors`,
        defaultGuidanceScale: 5.0,
        defaultLoraScale: 1.0,
        compatibleModels: ['flux-2-klein-9b'],
        createdAt: 0,
    },
    {
        id: 'disney-golden-age-k9b',
        name: 'Disney Golden Age',
        type: 'style',
        referenceTag: 'disney-golden-age',
        triggerWord: 'dgastyle',
        weightsUrl: `${LORA_STORAGE_BASE}/disney-golden-age-k9b/Disney_Golden_Age_FluxK9B.safetensors`,
        defaultGuidanceScale: 5.0,
        defaultLoraScale: 1.0,
        compatibleModels: ['flux-2-klein-9b'],
        createdAt: 0,
    },
    {
        id: 'nava-k9b',
        name: 'Nava',
        type: 'style',
        referenceTag: 'n4va',
        triggerWord: 'n4va style',
        weightsUrl: 'https://v3b.fal.media/files/b/0a9290d5/bVKO5g_LGpEF9Rq-wn3WL_pytorch_lora_weights_comfy_converted.safetensors',
        defaultGuidanceScale: 5.0,
        defaultLoraScale: 1.0,
        compatibleModels: ['flux-2-klein-9b'],
        createdAt: 0,
    },
    {
        id: 'dcau-k9b',
        name: 'DCAU',
        type: 'style',
        referenceTag: 'dcau',
        triggerWord: 'DC animation style,with bold outlines,cel-shaded, muted color palette.',
        weightsUrl: `${LORA_STORAGE_BASE}/dcau-style/dcau_lora_weights.safetensors`,
        defaultGuidanceScale: 5.0,
        defaultLoraScale: 1.0,
        compatibleModels: ['flux-2-klein-9b'],
        createdAt: 0,
    },
    {
        id: 'cinematic-filmstill-k9b',
        name: 'Cinematic',
        type: 'style',
        referenceTag: 'cinematic',
        triggerWord: 'Cinematic, Film Still',
        weightsUrl: `${LORA_STORAGE_BASE}/cinematic-filmstill-k9b/FilmStill_Redmond.safetensors`,
        thumbnailUrl: `${LORA_STORAGE_BASE}/cinematic-filmstill-k9b/thumbnail.webp`,
        defaultGuidanceScale: 5.0,
        defaultLoraScale: 1.0,
        compatibleModels: ['flux-2-klein-9b'],
        createdAt: 0,
    },
]

const ALL_BUILT_IN_LORAS = [...BUILT_IN_LORAS, ...FLUX2_9B_LORAS]

export const BUILT_IN_LORA_IDS = new Set(ALL_BUILT_IN_LORAS.map(l => l.id))

/** All available LoRAs users can browse in the community tab */
export const COMMUNITY_LORAS: LoraItem[] = [
    ...FLUX2_9B_LORAS,
]

export const useLoraStore = create<LoraStore>()(
    persist(
        (set, get) => ({
            loras: [],  // Users start with no LoRAs — add from community
            activeLoraIds: [],
            loraRatings: {},
            usedLoraIds: [],
            loraThumbnails: {},

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

            setLoraThumbnail: (id, url) => {
                set((state) => ({
                    loraThumbnails: { ...state.loraThumbnails, [id]: url },
                }))
            },

            getLoraThumbnail: (id, fallback) => {
                return get().loraThumbnails[id] || fallback
            },

            ensureAdminLoras: () => {
                set((state) => {
                    const existingIds = new Set(state.loras.map(l => l.id))
                    const missing = ALL_BUILT_IN_LORAS.filter(l => !existingIds.has(l.id))
                    if (missing.length === 0) return state
                    return { loras: [...state.loras, ...missing] }
                })
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

            fetchUserLoras: async () => {
                try {
                    const res = await fetch('/api/lora/list')
                    if (!res.ok) return
                    const { loras: dbLoras } = await res.json()
                    if (!Array.isArray(dbLoras)) return
                    const mapped: LoraItem[] = dbLoras.map((row: Record<string, unknown>) => ({
                        id: row.id as string,
                        name: row.name as string,
                        type: (row.lora_type as 'character' | 'style') || 'style',
                        triggerWord: (row.trigger_word as string) || '',
                        weightsUrl: row.weights_url as string,
                        storagePath: row.storage_path as string | undefined,
                        thumbnailUrl: row.thumbnail_url as string | undefined,
                        defaultGuidanceScale: Number(row.default_guidance_scale) || 3.5,
                        defaultLoraScale: Number(row.default_lora_scale) || 1.0,
                        compatibleModels: (row.compatible_models as string[]) || [],
                        createdAt: new Date(row.created_at as string).getTime(),
                    }))
                    set((state) => {
                        // Merge: keep existing LoRAs, add/update DB LoRAs by ID
                        const dbIds = new Set(mapped.map(l => l.id))
                        const existing = state.loras.filter(l => !dbIds.has(l.id))
                        return { loras: [...existing, ...mapped] }
                    })
                } catch { /* silent — offline fallback to cached state */ }
            },

            addLoraToDb: async (lora) => {
                try {
                    const res = await fetch('/api/lora/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: lora.name,
                            loraType: lora.type || 'style',
                            triggerWord: lora.triggerWord,
                            weightsUrl: lora.weightsUrl,
                            storagePath: lora.storagePath,
                            thumbnailUrl: lora.thumbnailUrl,
                            defaultLoraScale: lora.defaultLoraScale,
                            defaultGuidanceScale: lora.defaultGuidanceScale,
                            compatibleModels: lora.compatibleModels,
                        }),
                    })
                    if (!res.ok) return null
                    const row = await res.json()
                    const newLora: LoraItem = {
                        id: row.id,
                        name: row.name,
                        type: row.lora_type || 'style',
                        triggerWord: row.trigger_word || '',
                        weightsUrl: row.weights_url,
                        storagePath: row.storage_path,
                        thumbnailUrl: row.thumbnail_url,
                        defaultGuidanceScale: Number(row.default_guidance_scale) || 3.5,
                        defaultLoraScale: Number(row.default_lora_scale) || 1.0,
                        compatibleModels: row.compatible_models || [],
                        createdAt: new Date(row.created_at).getTime(),
                    }
                    set((state) => ({ loras: [...state.loras, newLora] }))
                    return row.id
                } catch { return null }
            },

            removeLoraFromDb: async (id) => {
                try {
                    const res = await fetch(`/api/lora/${id}`, { method: 'DELETE' })
                    if (!res.ok) return false
                    set((state) => ({
                        loras: state.loras.filter(l => l.id !== id),
                        activeLoraIds: state.activeLoraIds.filter(lid => lid !== id),
                    }))
                    return true
                } catch { return false }
            },

            migrateFromLocalStorage: async () => {
                // One-time: sync localStorage LoRAs to DB if DB is empty
                const state = get()
                const userLoras = state.loras.filter(l => l.createdAt !== 0)
                if (userLoras.length === 0) return

                // Check if DB already has LoRAs
                const res = await fetch('/api/lora/list')
                if (!res.ok) return
                const { loras: dbLoras } = await res.json()
                if (dbLoras && dbLoras.length > 0) return // Already migrated

                // Sync each localStorage LoRA to DB
                for (const lora of userLoras) {
                    await fetch('/api/lora/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: lora.name,
                            loraType: lora.type || 'style',
                            triggerWord: lora.triggerWord,
                            weightsUrl: lora.weightsUrl,
                            thumbnailUrl: lora.thumbnailUrl,
                            defaultLoraScale: lora.defaultLoraScale,
                            defaultGuidanceScale: lora.defaultGuidanceScale,
                            compatibleModels: lora.compatibleModels,
                        }),
                    })
                }

                // Re-fetch to get DB-assigned IDs
                await get().fetchUserLoras()
            },
        }),
        {
            name: 'directors-palette-lora-store',
            version: 20,
            partialize: (state) => ({
                // Only persist UI state — LoRA items come from DB
                activeLoraIds: state.activeLoraIds,
                loraRatings: state.loraRatings,
                usedLoraIds: state.usedLoraIds,
                loraThumbnails: state.loraThumbnails,
            }),
            migrate: (persisted: unknown) => {
                const state = persisted as Record<string, unknown>
                return {
                    activeLoraIds: (state?.activeLoraIds as string[]) || [],
                    loraRatings: (state?.loraRatings as Record<string, LoraRating>) || {},
                    usedLoraIds: (state?.usedLoraIds as string[]) || [],
                    loraThumbnails: (state?.loraThumbnails as Record<string, string>) || {},
                }
            },
        }
    )
)
