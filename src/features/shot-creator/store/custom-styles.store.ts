/**
 * Custom Styles Store
 * Manages user-created styles and preset overrides with localStorage persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PRESET_STYLES, PresetStyle, PresetStyleId } from '@/features/storyboard/types/storyboard.types'

export interface CustomStyle {
    id: string
    name: string
    description: string
    imagePath: string // Can be a data URL or uploaded URL
    stylePrompt: string
    isCustom: true
    createdAt: number
}

export type AnyStyle = PresetStyle | CustomStyle

interface CustomStylesStore {
    // State
    customStyles: CustomStyle[]
    hiddenPresetIds: PresetStyleId[] // Preset styles that user has "deleted" (hidden)
    presetOverrides: Record<string, Partial<PresetStyle>> // User overrides for preset styles

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

            getAllStyles: () => {
                const { customStyles, hiddenPresetIds, presetOverrides } = get()
                const visiblePresets = PRESET_STYLES
                    .filter((preset) => !hiddenPresetIds.includes(preset.id))
                    .map((preset) => {
                        const override = presetOverrides[preset.id]
                        return override ? { ...preset, ...override, id: preset.id } : preset
                    })
                return [...visiblePresets, ...customStyles]
            },

            getStyleById: (id) => {
                const { customStyles, hiddenPresetIds, presetOverrides } = get()

                // Check custom styles first
                const customStyle = customStyles.find((s) => s.id === id)
                if (customStyle) return customStyle

                // Check preset styles (even hidden ones for lookup purposes)
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
            migrate: (persistedState: unknown, version: number) => {
                const state = persistedState as Record<string, unknown>
                if (version < 2) {
                    return { ...state, presetOverrides: {} }
                }
                return state
            }
        }
    )
)
