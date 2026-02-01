/**
 * Reference Sheet Types
 *
 * Types for Identity Lock, Wardrobe Sheet, and Location Sheet generation
 * in Music Lab workflow.
 */

export type SheetStatus = 'idle' | 'generating' | 'complete' | 'error'

export interface IdentityLockSheet {
    status: SheetStatus
    imageUrl: string | null
    artistName: string
    artistDescription: string
    error?: string
}

export interface WardrobeItem {
    id: string
    name: string
    description: string
}

export interface WardrobeSheet {
    status: SheetStatus
    imageUrl: string | null
    characterName: string
    wardrobes: WardrobeItem[]
    error?: string
}

export interface LocationItem {
    id: string
    name: string
    description: string
}

export interface LocationSheet {
    status: SheetStatus
    imageUrl: string | null
    characterName: string
    locations: LocationItem[]
    error?: string
}

export interface ReferenceSheets {
    identityLock: IdentityLockSheet
    wardrobeSheet: WardrobeSheet
    locationSheet: LocationSheet
}

// Default state factory
export function createDefaultReferenceSheets(): ReferenceSheets {
    return {
        identityLock: {
            status: 'idle',
            imageUrl: null,
            artistName: '',
            artistDescription: ''
        },
        wardrobeSheet: {
            status: 'idle',
            imageUrl: null,
            characterName: '',
            wardrobes: [
                { id: '1', name: 'Look 1', description: '' },
                { id: '2', name: 'Look 2', description: '' },
                { id: '3', name: 'Look 3', description: '' }
            ]
        },
        locationSheet: {
            status: 'idle',
            imageUrl: null,
            characterName: '',
            locations: [
                { id: '1', name: 'Location 1', description: '' },
                { id: '2', name: 'Location 2', description: '' },
                { id: '3', name: 'Location 3', description: '' }
            ]
        }
    }
}
