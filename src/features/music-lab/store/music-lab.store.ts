/**
 * Music Lab Store
 *
 * Zustand store for Music Lab state management.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
    MusicLabState,
    MusicLabProject,
    MusicLabStatus,
    ArtistProfile,
    ArtistNotes,
    GenreSelection,
    LocationRequest,
    SongAnalysis,
    SongSection
} from '../types/music-lab.types'
import type { WardrobeItem, LocationItem } from '../types/reference-sheet.types'
import { createDefaultReferenceSheets } from '../types/reference-sheet.types'

const initialProject: Partial<MusicLabProject> = {
    artist: {
        name: ''
    },
    artistNotes: {
        perSectionNotes: {}
    },
    genreSelection: {
        genre: 'hip-hop',
        subgenre: ''
    },
    locationRequests: [],
    status: 'setup'
}

export const useMusicLabStore = create<MusicLabState>()(
    persist(
        (set, _get) => ({
            // Initial state
            project: { ...initialProject },
            referenceSheets: createDefaultReferenceSheets(),
            isAnalyzing: false,
            analysisProgress: 0,
            analysisError: undefined,

            // Actions
            setArtist: (artist: ArtistProfile) => set((state) => ({
                project: { ...state.project, artist }
            })),

            setArtistNotes: (notes: ArtistNotes) => set((state) => ({
                project: { ...state.project, artistNotes: notes }
            })),

            setGenre: (genre: GenreSelection) => set((state) => ({
                project: { ...state.project, genreSelection: genre }
            })),

            setStyle: (styleId: string, styleName: string) => set((state) => ({
                project: { ...state.project, styleId, styleName }
            })),

            addLocationRequest: (location: Omit<LocationRequest, 'id'>) => set((state) => ({
                project: {
                    ...state.project,
                    locationRequests: [
                        ...(state.project.locationRequests || []),
                        { ...location, id: crypto.randomUUID() }
                    ]
                }
            })),

            removeLocationRequest: (id: string) => set((state) => ({
                project: {
                    ...state.project,
                    locationRequests: (state.project.locationRequests || []).filter(l => l.id !== id)
                }
            })),

            setAudioFile: (url: string, fileName: string) => set((state) => ({
                project: { ...state.project, audioUrl: url, audioFileName: fileName }
            })),

            setManualLyrics: (lyrics: string) => set((state) => ({
                project: { ...state.project, manualLyrics: lyrics }
            })),

            setSongAnalysis: (analysis: SongAnalysis) => set((state) => ({
                project: { ...state.project, songAnalysis: analysis },
                isAnalyzing: false,
                analysisProgress: 100
            })),

            confirmSections: (sections: SongSection[]) => set((state) => ({
                project: {
                    ...state.project,
                    songAnalysis: state.project.songAnalysis
                        ? { ...state.project.songAnalysis, confirmedSections: sections }
                        : undefined,
                    status: 'generating-proposals'
                }
            })),

            setStatus: (status: MusicLabStatus) => set((state) => ({
                project: { ...state.project, status }
            })),

            setUseVocalIsolation: (use: boolean) => set((state) => ({
                project: { ...state.project, useVocalIsolation: use }
            })),

            // Reference Sheet Actions
            setIdentityLockInput: (artistName: string, artistDescription: string) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    identityLock: {
                        ...state.referenceSheets.identityLock,
                        artistName,
                        artistDescription
                    }
                }
            })),

            setIdentityLockResult: (imageUrl: string | null, error?: string) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    identityLock: {
                        ...state.referenceSheets.identityLock,
                        imageUrl,
                        status: error ? 'error' : 'complete',
                        error
                    }
                }
            })),

            setIdentityLockStatus: (status) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    identityLock: {
                        ...state.referenceSheets.identityLock,
                        status
                    }
                }
            })),

            setWardrobeInput: (characterName: string, wardrobes: WardrobeItem[]) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    wardrobeSheet: {
                        ...state.referenceSheets.wardrobeSheet,
                        characterName,
                        wardrobes
                    }
                }
            })),

            setWardrobeResult: (imageUrl: string | null, error?: string) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    wardrobeSheet: {
                        ...state.referenceSheets.wardrobeSheet,
                        imageUrl,
                        status: error ? 'error' : 'complete',
                        error
                    }
                }
            })),

            setWardrobeStatus: (status) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    wardrobeSheet: {
                        ...state.referenceSheets.wardrobeSheet,
                        status
                    }
                }
            })),

            setLocationInput: (characterName: string, locations: LocationItem[]) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    locationSheet: {
                        ...state.referenceSheets.locationSheet,
                        characterName,
                        locations
                    }
                }
            })),

            setLocationResult: (imageUrl: string | null, error?: string) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    locationSheet: {
                        ...state.referenceSheets.locationSheet,
                        imageUrl,
                        status: error ? 'error' : 'complete',
                        error
                    }
                }
            })),

            setLocationStatus: (status) => set((state) => ({
                referenceSheets: {
                    ...state.referenceSheets,
                    locationSheet: {
                        ...state.referenceSheets.locationSheet,
                        status
                    }
                }
            })),

            reset: () => set({
                project: { ...initialProject },
                referenceSheets: createDefaultReferenceSheets(),
                isAnalyzing: false,
                analysisProgress: 0,
                analysisError: undefined
            })
        }),
        {
            name: 'music-lab-storage',
            partialize: (state) => ({
                project: state.project,
                referenceSheets: state.referenceSheets
            })
        }
    )
)
