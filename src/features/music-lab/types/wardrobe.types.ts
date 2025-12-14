/**
 * Wardrobe Types (Simplified)
 * 
 * Follows the same pattern as PresetStyle in storyboard.
 * Just name + image, no complex descriptions.
 */

// =============================================================================
// WARDROBE LOOK (matches PresetStyle pattern)
// =============================================================================

export interface WardrobeLook {
    id: string
    name: string                    // "Street King", "Elegant Evening"
    imagePath: string               // Path to wardrobe reference image

    // Optional
    forSections?: string[]          // Section IDs this look is for
    source?: 'preset' | 'user' | 'director-proposal'
    sourceDirectorId?: string
}

// Pre-built wardrobe presets (like PRESET_STYLES)
export type WardrobePresetId =
    | 'streetwear'
    | 'formal'
    | 'casual'
    | 'luxury'
    | 'athletic'
    | 'vintage'

export const WARDROBE_PRESETS: WardrobeLook[] = [
    {
        id: 'streetwear',
        name: 'Streetwear',
        imagePath: '/wardrobe/streetwear.jpg',
        source: 'preset'
    },
    {
        id: 'formal',
        name: 'Formal',
        imagePath: '/wardrobe/formal.jpg',
        source: 'preset'
    },
    {
        id: 'casual',
        name: 'Casual',
        imagePath: '/wardrobe/casual.jpg',
        source: 'preset'
    },
    {
        id: 'luxury',
        name: 'Luxury',
        imagePath: '/wardrobe/luxury.jpg',
        source: 'preset'
    },
    {
        id: 'athletic',
        name: 'Athletic',
        imagePath: '/wardrobe/athletic.jpg',
        source: 'preset'
    },
    {
        id: 'vintage',
        name: 'Vintage',
        imagePath: '/wardrobe/vintage.jpg',
        source: 'preset'
    }
]

// =============================================================================
// STORE STATE (simplified)
// =============================================================================

export interface WardrobeState {
    looks: WardrobeLook[]
    selectedLookId: string | null

    // Actions
    addLook: (name: string, imagePath: string, forSections?: string[]) => void
    removeLook: (id: string) => void
    selectLook: (id: string | null) => void
    getLookById: (id: string) => WardrobeLook | undefined
    reset: () => void
}
