/**
 * Timeline Store
 * 
 * Zustand store for timeline editor state.
 */

import { create } from 'zustand'
import type { TimelineState, TimelineShot, TimelineSectionMarker } from '../types/timeline.types'
import { SECTION_COLORS } from '../types/timeline.types'

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
