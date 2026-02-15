import { useMemo } from 'react'
import { useStoryboardStore } from '../store'
import { useCustomStylesStore } from '@/features/shot-creator/store/custom-styles.store'
import { PRESET_STYLES, type StyleGuide, type PresetStyle } from '../types/storyboard.types'

interface EffectiveStyleResult {
    styleGuide: StyleGuide | null
    presetStyle: PresetStyle | null
}

/**
 * Hook to resolve the effective style guide based on selected preset/custom style
 * Provides memoized style guide resolution shared across components
 *
 * Returns both the StyleGuide (for prompt text) and the PresetStyle (for technical attributes)
 */
export function useEffectiveStyleGuide(): StyleGuide | null {
    return useEffectiveStyle().styleGuide
}

/**
 * Hook that returns both the resolved StyleGuide and the PresetStyle with technical attributes
 */
export function useEffectiveStyle(): EffectiveStyleResult {
    const { currentStyleGuide, selectedPresetStyle } = useStoryboardStore()
    const { getStyleById } = useCustomStylesStore()

    return useMemo(() => {
        // No preset selected - use current style guide (from DB or null)
        if (!selectedPresetStyle) return { styleGuide: currentStyleGuide, presetStyle: null }

        // Check preset styles first
        const preset = PRESET_STYLES.find(s => s.id === selectedPresetStyle)
        if (preset) {
            return {
                styleGuide: {
                    id: `preset-${selectedPresetStyle}`,
                    user_id: '',
                    name: preset.name,
                    style_prompt: preset.stylePrompt,
                    reference_image_url: preset.imagePath,
                    metadata: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                presetStyle: preset
            }
        }

        // Check custom styles
        const customStyle = getStyleById(selectedPresetStyle)
        if (customStyle) {
            return {
                styleGuide: {
                    id: customStyle.id,
                    user_id: '',
                    name: customStyle.name,
                    style_prompt: customStyle.stylePrompt,
                    reference_image_url: customStyle.imagePath,
                    metadata: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                presetStyle: null
            }
        }

        // Fallback to current style guide
        return { styleGuide: currentStyleGuide, presetStyle: null }
    }, [selectedPresetStyle, currentStyleGuide, getStyleById])
}
