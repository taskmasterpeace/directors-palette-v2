/**
 * Custom Styles Store
 *
 * Single source of truth for styles shown in Shot Creator, in priority order:
 *   1. Admin-managed system styles from the DB (`style_guides` where is_system=true)
 *      — fetched via /api/admin/style-sheets?public=true on mount. These win.
 *   2. Hardcoded PRESET_STYLES — only shown when (a) not hidden by the user AND
 *      (b) no DB row has "seeded" over them (metadata.preset_id match). These
 *      are a fallback: if the admin wipes the DB, users still see built-ins.
 *   3. User's own custom styles — local-only, persisted to localStorage.
 *
 * The admin can promote any hardcoded preset into the DB via the "Seed Presets"
 * button on the Style Sheets tab. Once seeded, the DB row replaces the hardcoded
 * one in the picker and becomes fully editable/deletable via the admin UI.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PRESET_STYLES, PresetStyle, PresetStyleId } from '@/features/storyboard/types/storyboard.types'
import { logger } from '@/lib/logger'

export interface CustomStyle {
    id: string
    name: string
    description: string
    imagePath: string // Can be a data URL or uploaded URL
    stylePrompt: string
    isCustom: true
    createdAt: number
}

export interface SystemStyle {
    id: string
    name: string
    description: string
    imagePath: string
    stylePrompt: string
    isSystem: true
    /** If this DB row was seeded from a hardcoded PRESET_STYLES entry, this is the preset id (e.g. "claymation"). */
    presetId?: string
}

export type AnyStyle = PresetStyle | CustomStyle | SystemStyle

interface CustomStylesStore {
    // State
    customStyles: CustomStyle[]
    hiddenPresetIds: PresetStyleId[] // Preset styles that user has "deleted" (hidden)
    presetOverrides: Record<string, Partial<PresetStyle>> // User overrides for preset styles
    systemStyles: SystemStyle[] // Admin-published styles, fetched from the API (not persisted)
    systemStylesStatus: 'idle' | 'loading' | 'loaded' | 'error'

    // Actions
    addCustomStyle: (style: Omit<CustomStyle, 'id' | 'isCustom' | 'createdAt'>) => string
    updateCustomStyle: (id: string, updates: Partial<Omit<CustomStyle, 'id' | 'isCustom' | 'createdAt'>>) => void
    deleteCustomStyle: (id: string) => void
    hidePresetStyle: (id: PresetStyleId) => void
    unhidePresetStyle: (id: PresetStyleId) => void
    setPresetOverride: (id: PresetStyleId, overrides: Partial<PresetStyle>) => void
    resetPresetOverride: (id: PresetStyleId) => void
    hasPresetOverride: (id: string) => boolean
    resetToDefaults: () => void
    loadSystemStyles: () => Promise<void>

    // Computed helpers
    getAllStyles: () => AnyStyle[]
    getStyleById: (id: string) => AnyStyle | undefined
    isStyleHidden: (id: string) => boolean
}

export const useCustomStylesStore = create<CustomStylesStore>()(
    persist(
        (set, get) => ({
            customStyles: [],
            hiddenPresetIds: [],
            presetOverrides: {},
            systemStyles: [],
            systemStylesStatus: 'idle',

            addCustomStyle: (styleData) => {
                const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                const newStyle: CustomStyle = {
                    ...styleData,
                    id,
                    isCustom: true,
                    createdAt: Date.now(),
                }
                set((state) => ({
                    customStyles: [...state.customStyles, newStyle]
                }))
                return id
            },

            updateCustomStyle: (id, updates) => {
                set((state) => ({
                    customStyles: state.customStyles.map((style) =>
                        style.id === id ? { ...style, ...updates } : style
                    )
                }))
            },

            deleteCustomStyle: (id) => {
                set((state) => ({
                    customStyles: state.customStyles.filter((style) => style.id !== id)
                }))
            },

            hidePresetStyle: (id) => {
                set((state) => ({
                    hiddenPresetIds: state.hiddenPresetIds.includes(id)
                        ? state.hiddenPresetIds
                        : [...state.hiddenPresetIds, id]
                }))
            },

            unhidePresetStyle: (id) => {
                set((state) => ({
                    hiddenPresetIds: state.hiddenPresetIds.filter((presetId) => presetId !== id)
                }))
            },

            setPresetOverride: (id, overrides) => {
                set((state) => ({
                    presetOverrides: {
                        ...state.presetOverrides,
                        [id]: { ...state.presetOverrides[id], ...overrides }
                    }
                }))
            },

            resetPresetOverride: (id) => {
                set((state) => {
                    const { [id]: _, ...rest } = state.presetOverrides
                    return { presetOverrides: rest }
                })
            },

            hasPresetOverride: (id) => {
                return id in get().presetOverrides
            },

            resetToDefaults: () => {
                set({
                    customStyles: [],
                    hiddenPresetIds: [],
                    presetOverrides: {}
                })
            },

            loadSystemStyles: async () => {
                // Single-flight: don't refetch if already loading or just loaded.
                const current = get().systemStylesStatus
                if (current === 'loading' || current === 'loaded') return
                set({ systemStylesStatus: 'loading' })

                try {
                    const res = await fetch('/api/admin/style-sheets?public=true', {
                        headers: { 'Accept': 'application/json' },
                    })
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const data = await res.json() as { styles?: Array<{ id: string; name: string; description: string | null; style_prompt: string | null; image_url: string | null; metadata?: { preset_id?: string } | null }> }

                    const systemStyles: SystemStyle[] = (data.styles || []).map((row) => ({
                        id: row.id,
                        name: row.name,
                        description: row.description || '',
                        imagePath: row.image_url || '',
                        stylePrompt: row.style_prompt || `in the ${row.name} style`,
                        isSystem: true,
                        presetId: row.metadata?.preset_id,
                    }))

                    set({ systemStyles, systemStylesStatus: 'loaded' })
                } catch (error) {
                    logger.shotCreator.warn('Failed to load system styles', {
                        error: error instanceof Error ? error.message : String(error),
                    })
                    set({ systemStylesStatus: 'error' })
                }
            },

            getAllStyles: () => {
                const { customStyles, systemStyles, hiddenPresetIds, presetOverrides } = get()
                // DB system styles with a preset_id "shadow" the hardcoded preset of the same id —
                // the admin's DB row wins (single source of truth). Hardcoded presets only surface
                // when (a) not hidden by user AND (b) no DB row has seeded over them.
                const seededPresetIds = new Set(
                    systemStyles.map((s) => s.presetId).filter((id): id is string => !!id)
                )
                const visiblePresets = PRESET_STYLES
                    .filter((preset) => !hiddenPresetIds.includes(preset.id))
                    .filter((preset) => !seededPresetIds.has(preset.id))
                    .map((preset) => {
                        const override = presetOverrides[preset.id]
                        return override ? { ...preset, ...override, id: preset.id } : preset
                    })
                // Order: admin-managed system styles first (source of truth) → fallback presets → user's own customs
                return [...systemStyles, ...visiblePresets, ...customStyles]
            },

            getStyleById: (id) => {
                const { customStyles, systemStyles, hiddenPresetIds, presetOverrides } = get()

                // Check custom styles first
                const customStyle = customStyles.find((s) => s.id === id)
                if (customStyle) return customStyle

                // Check system styles (admin-published) by DB UUID
                const systemStyleByUuid = systemStyles.find((s) => s.id === id)
                if (systemStyleByUuid) return systemStyleByUuid

                // Legacy-compatible: if the stored setting still holds the hardcoded preset id
                // (e.g. 'claymation'), resolve it to the seeded DB row — admin-managed row wins.
                const systemStyleByPresetId = systemStyles.find((s) => s.presetId === id)
                if (systemStyleByPresetId) return systemStyleByPresetId

                // Fallback to hardcoded preset
                const presetStyle = PRESET_STYLES.find((s) => s.id === id)
                if (presetStyle && !hiddenPresetIds.includes(presetStyle.id)) {
                    const override = presetOverrides[presetStyle.id]
                    return override ? { ...presetStyle, ...override, id: presetStyle.id } : presetStyle
                }

                return undefined
            },

            isStyleHidden: (id) => {
                const { hiddenPresetIds } = get()
                return hiddenPresetIds.includes(id as PresetStyleId)
            }
        }),
        {
            name: 'directors-palette-custom-styles',
            version: 2,
            storage: createJSONStorage(() => localStorage),
            migrate: (persistedState: unknown, version: number) => {
                const state = persistedState as Record<string, unknown>
                if (version < 2) {
                    return { ...state, presetOverrides: {} }
                }
                return state
            },
            // System styles come from the DB — never persist them. Always re-fetch
            // so admin-side changes propagate on next load.
            partialize: (state) => ({
                customStyles: state.customStyles,
                hiddenPresetIds: state.hiddenPresetIds,
                presetOverrides: state.presetOverrides,
            }),
        }
    )
)
