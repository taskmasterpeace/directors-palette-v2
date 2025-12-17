/**
 * Timeline Store
 *
 * Zustand store for timeline editor state.
 */

import { create } from 'zustand'
import type { TimelineState, TimelineSectionMarker, SongAnalysisInput, TimelineShot } from '../types/timeline.types'
import { SECTION_COLORS } from '../types/timeline.types'
import type { DirectorProposal, DirectorFingerprint, ProposedShot } from '../types/director.types'
import { getAllDirectors } from '../data/directors.data'
import { TimelineGenerator } from '../services/timeline-generator.service'

export const useTimelineStore = create<TimelineState>()((set) => ({
    // Initial state
    audioUrl: null,
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    scrollPosition: 0,
    shots: [],
    sectionMarkers: [],
    selectedShotId: null,

    // Actions
    setAudioUrl: (url: string) => set({ audioUrl: url }),

    setDuration: (duration: number) => set({ duration }),

    setCurrentTime: (time: number) => set({ currentTime: time }),

    setPlaying: (playing: boolean) => set({ isPlaying: playing }),

    setZoom: (zoom: number) => set({ zoom: Math.max(1, Math.min(10, zoom)) }),

    setScrollPosition: (position: number) => set({ scrollPosition: position }),

    addShot: (shotData: Omit<TimelineShot, 'id'>) => set((state) => ({
        shots: [
            ...state.shots,
            {
                ...shotData,
                id: `shot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
        ]
    })),

    updateShot: (id: string, updates: Partial<TimelineShot>) => set((state) => ({
        shots: state.shots.map(shot =>
            shot.id === id ? { ...shot, ...updates } : shot
        )
    })),

    removeShot: (id: string) => set((state) => ({
        shots: state.shots.filter(shot => shot.id !== id),
        selectedShotId: state.selectedShotId === id ? null : state.selectedShotId
    })),

    selectShot: (id: string | null) => set({ selectedShotId: id }),

    setSectionMarkers: (markers: TimelineSectionMarker[]) => set({ sectionMarkers: markers }),

    importFromSongAnalysis: (sections) => set(() => {
        const markers: TimelineSectionMarker[] = sections.map((section, i) => ({
            id: `section_${i}`,
            type: section.type as TimelineSectionMarker['type'],
            startTime: section.startTime,
            endTime: section.endTime,
            label: section.type.charAt(0).toUpperCase() + section.type.slice(1),
            color: SECTION_COLORS[section.type] || '#6b7280'
        }))
        return { sectionMarkers: markers }
    }),

    importProposal: (proposal: DirectorProposal, songAnalysis?: SongAnalysisInput) => set((state) => {
        // Find director
        const director = getAllDirectors().find((d: DirectorFingerprint) => d.id === proposal.directorId)

        // Reconstruct Analysis if passed, or from state
        const analysis = songAnalysis ? {
            bpm: songAnalysis.bpm || 120,
            duration: songAnalysis.duration || state.duration,
            sections: songAnalysis.confirmedSections || songAnalysis.sections || []
        } : {
            bpm: 120, // Default if missing
            duration: state.duration,
            sections: state.sectionMarkers.map(m => ({
                type: m.type,
                startTime: m.startTime,
                endTime: m.endTime
            }))
        }

        if (director && analysis.sections.length > 0) {
            const generatedShots = TimelineGenerator.generateTimeline(analysis, proposal, director)
            return { shots: generatedShots }
        }

        // Fallback if no director/analysis found (just Key Shots)
        const newShots: TimelineShot[] = (proposal.keyShots || []).map((shot: ProposedShot) => ({
            id: shot.id || `shot_${Math.random().toString(36).substr(2, 9)}`,
            sectionId: shot.sectionId || 'unknown',
            startTime: shot.timestamp,
            endTime: shot.timestamp + 4,
            prompt: shot.basePrompt || shot.subject,
            previewImageUrl: shot.previewImageUrl,
            color: '#3b82f6',
            directorId: proposal.directorId,
            proposalId: proposal.id,
            wardrobeLookId: shot.wardrobeLookId,
            locationId: shot.locationId
        }))

        return { shots: newShots }
    }),

    reset: () => set({
        audioUrl: null,
        duration: 0,
        currentTime: 0,
        isPlaying: false,
        zoom: 1,
        scrollPosition: 0,
        shots: [],
        sectionMarkers: [],
        selectedShotId: null
    })
}))
