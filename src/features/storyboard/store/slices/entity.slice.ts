import type { StoreApi } from 'zustand'
import type { StoryboardStore } from '../storyboard.store'
import type {
    Storyboard,
    StoryboardShot,
    StoryboardCharacter,
    StoryboardLocation,
    StyleGuide,
} from '../../types/storyboard.types'

type Set = StoreApi<StoryboardStore>['setState']
type Get = StoreApi<StoryboardStore>['getState']

// Initial state for entity slice
export const entityInitialState = {
    storyboards: [] as Storyboard[],
    currentStoryboard: null as Storyboard | null,
    loadingStoryboards: false,

    characters: [] as StoryboardCharacter[],
    loadingCharacters: false,

    locations: [] as StoryboardLocation[],
    loadingLocations: false,

    styleGuides: [] as StyleGuide[],
    currentStyleGuide: null as StyleGuide | null,
    selectedPresetStyle: null as string | null,
    loadingStyleGuides: false,

    shots: [] as StoryboardShot[],
    loadingShots: false,
    selectedShotIds: [] as string[],
}

export const createEntitySlice = (set: Set, get: Get) => ({
    ...entityInitialState,

    // ---- Storyboard Actions ----
    setStoryboards: (storyboards: Storyboard[]) => set({ storyboards }),
    setCurrentStoryboard: (storyboard: Storyboard | null) => set({ currentStoryboard: storyboard }),
    addStoryboard: (storyboard: Storyboard) => set((state) => ({
        storyboards: [storyboard, ...state.storyboards]
    })),
    updateStoryboard: (id: string, updates: Partial<Storyboard>) => set((state) => ({
        storyboards: state.storyboards.map((s) =>
            s.id === id ? { ...s, ...updates } : s
        ),
        currentStoryboard: state.currentStoryboard?.id === id
            ? { ...state.currentStoryboard, ...updates }
            : state.currentStoryboard
    })),
    deleteStoryboard: (id: string) => set((state) => ({
        storyboards: state.storyboards.filter((s) => s.id !== id),
        currentStoryboard: state.currentStoryboard?.id === id ? null : state.currentStoryboard
    })),
    setLoadingStoryboards: (loading: boolean) => set({ loadingStoryboards: loading }),

    // ---- Character Actions ----
    setCharacters: (characters: StoryboardCharacter[]) => set({ characters }),
    addCharacter: (character: StoryboardCharacter) => set((state) => ({
        characters: [...state.characters, character]
    })),
    updateCharacter: (id: string, updates: Partial<StoryboardCharacter>) => set((state) => ({
        characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
        )
    })),
    deleteCharacter: (id: string) => set((state) => ({
        characters: state.characters.filter((c) => c.id !== id)
    })),
    toggleCharacterReference: (id: string) => set((state) => ({
        characters: state.characters.map((c) =>
            c.id === id ? { ...c, has_reference: !c.has_reference } : c
        )
    })),
    setLoadingCharacters: (loading: boolean) => set({ loadingCharacters: loading }),

    // ---- Location Actions ----
    setLocations: (locations: StoryboardLocation[]) => set({ locations }),
    addLocation: (location: StoryboardLocation) => set((state) => ({
        locations: [...state.locations, location]
    })),
    updateLocation: (id: string, updates: Partial<StoryboardLocation>) => set((state) => ({
        locations: state.locations.map((l) =>
            l.id === id ? { ...l, ...updates } : l
        )
    })),
    deleteLocation: (id: string) => set((state) => ({
        locations: state.locations.filter((l) => l.id !== id)
    })),
    toggleLocationReference: (id: string) => set((state) => ({
        locations: state.locations.map((l) =>
            l.id === id ? { ...l, has_reference: !l.has_reference } : l
        )
    })),
    setLoadingLocations: (loading: boolean) => set({ loadingLocations: loading }),

    // ---- Style Guide Actions ----
    setStyleGuides: (guides: StyleGuide[]) => set({ styleGuides: guides }),
    setCurrentStyleGuide: (guide: StyleGuide | null) => set({ currentStyleGuide: guide }),
    setSelectedPresetStyle: (presetId: string | null) => set({
        selectedPresetStyle: presetId,
        // Clear custom style guide when selecting preset
        currentStyleGuide: presetId ? null : undefined
    }),
    addStyleGuide: (guide: StyleGuide) => set((state) => ({
        styleGuides: [...state.styleGuides, guide]
    })),
    updateStyleGuide: (id: string, updates: Partial<StyleGuide>) => set((state) => ({
        styleGuides: state.styleGuides.map((g) =>
            g.id === id ? { ...g, ...updates } : g
        ),
        currentStyleGuide: state.currentStyleGuide?.id === id
            ? { ...state.currentStyleGuide, ...updates }
            : state.currentStyleGuide
    })),
    deleteStyleGuide: (id: string) => set((state) => ({
        styleGuides: state.styleGuides.filter((g) => g.id !== id),
        currentStyleGuide: state.currentStyleGuide?.id === id ? null : state.currentStyleGuide
    })),
    setLoadingStyleGuides: (loading: boolean) => set({ loadingStyleGuides: loading }),

    // ---- Shot Actions ----
    setShots: (shots: StoryboardShot[]) => set({ shots: shots.sort((a, b) => a.sequence_number - b.sequence_number) }),
    addShot: (shot: StoryboardShot) => set((state) => ({
        shots: [...state.shots, shot].sort((a, b) => a.sequence_number - b.sequence_number)
    })),
    updateShot: (id: string, updates: Partial<StoryboardShot>) => set((state) => ({
        shots: state.shots.map((s) =>
            s.id === id ? { ...s, ...updates } : s
        )
    })),
    deleteShot: (id: string) => set((state) => ({
        shots: state.shots.filter((s) => s.id !== id),
        selectedShotIds: state.selectedShotIds.filter(sid => sid !== id)
    })),
    setLoadingShots: (loading: boolean) => set({ loadingShots: loading }),
    toggleShotSelection: (id: string) => set((state) => ({
        selectedShotIds: state.selectedShotIds.includes(id)
            ? state.selectedShotIds.filter(sid => sid !== id)
            : [...state.selectedShotIds, id]
    })),
    selectAllShots: () => set((state) => ({
        selectedShotIds: state.shots.map(s => s.id)
    })),
    clearShotSelection: () => set({ selectedShotIds: [] }),

    // ---- Character Library Actions ----
    saveCharacterToLibrary: (id: string, tag: string, galleryId: string) => set((state) => ({
        characters: state.characters.map((c) =>
            c.id === id ? {
                ...c,
                reference_gallery_id: galleryId,
                metadata: { ...c.metadata, reference_tag: tag }
            } : c
        )
    })),
    removeCharacterFromLibrary: (id: string) => set((state) => ({
        characters: state.characters.map((c) =>
            c.id === id ? {
                ...c,
                metadata: { ...c.metadata, reference_tag: undefined }
            } : c
        )
    })),

    // ---- Computed Getters ----
    getCharactersWithReferences: () => {
        return get().characters.filter(c => c.has_reference)
    },

    getLocationsWithReferences: () => {
        return get().locations.filter(l => l.has_reference)
    },

    getSelectedShots: () => {
        const state = get()
        return state.shots.filter(s => state.selectedShotIds.includes(s.id))
    },

    getShotBySequence: (sequence: number) => {
        return get().shots.find(s => s.sequence_number === sequence)
    },
})
