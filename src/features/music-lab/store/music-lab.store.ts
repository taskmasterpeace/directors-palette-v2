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

            reset: () => set({
                project: { ...initialProject },
                isAnalyzing: false,
                analysisProgress: 0,
                analysisError: undefined
            })
        }),
        {
            name: 'music-lab-storage',
            partialize: (state) => ({ project: state.project })
        }
    )
)
