import { useMemo } from 'react'
import { useStoryboardStore } from '../store'
import { useCustomStylesStore } from '@/features/shot-creator/store/custom-styles.store'
import { PRESET_STYLES, type StyleGuide } from '../types/storyboard.types'

/**
 * Hook to resolve the effective style guide based on selected preset/custom style
 * Provides memoized style guide resolution shared across components
 */
export function useEffectiveStyleGuide(): StyleGuide | null {
    const { currentStyleGuide, selectedPresetStyle } = useStoryboardStore()
    const { getStyleById } = useCustomStylesStore()

    return useMemo(() => {
        // No preset selected - use current style guide (from DB or null)
        if (!selectedPresetStyle) return currentStyleGuide

        // Check preset styles first
        const preset = PRESET_STYLES.find(s => s.id === selectedPresetStyle)
        if (preset) {
            return {
                id: `preset-${selectedPresetStyle}`,
                user_id: '',
                name: preset.name,
                style_prompt: preset.stylePrompt,
                reference_image_url: preset.imagePath,
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        }

        // Check custom styles
        const customStyle = getStyleById(selectedPresetStyle)
        if (customStyle) {
            return {
                id: customStyle.id,
                user_id: '',
                name: customStyle.name,
                style_prompt: customStyle.stylePrompt,
                reference_image_url: customStyle.imagePath,
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        }

        // Fallback to current style guide
        return currentStyleGuide
    }, [selectedPresetStyle, currentStyleGuide, getStyleById])
}
