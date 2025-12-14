/**
 * Timeline Types for Music Lab
 * 
 * Types for the visual timeline editor.
 */

// =============================================================================
// TIMELINE SHOT
// =============================================================================

export interface TimelineShot {
    id: string
    sectionId: string             // Which song section this belongs to

    // Timing
    startTime: number             // Start time in seconds
    endTime: number               // End time in seconds

    // Content
    prompt: string                // Shot prompt
    wardrobeLookId?: string       // Selected wardrobe for this shot
    locationId?: string           // Selected location

    // Visual
    previewImageUrl?: string      // Generated preview
    color?: string                // Color for the block

    // Source
    directorId?: string           // If from director proposal
    proposalId?: string
}

// =============================================================================
// TIMELINE SECTION MARKER
// =============================================================================

export interface TimelineSectionMarker {
    id: string
    type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'breakdown' | 'build' | 'drop'
    startTime: number
    endTime: number
    label: string
    color: string
}

// Section colors
export const SECTION_COLORS: Record<string, string> = {
    verse: '#3b82f6',      // Blue
    chorus: '#f59e0b',     // Amber
    bridge: '#8b5cf6',     // Purple
    intro: '#6b7280',      // Gray
    outro: '#6b7280',      // Gray
    breakdown: '#ec4899',  // Pink
    build: '#10b981',      // Emerald
    drop: '#ef4444'        // Red
}

// =============================================================================
// TIMELINE STATE
// =============================================================================

export interface TimelineState {
    // Audio
    audioUrl: string | null
    duration: number              // Total duration in seconds
    currentTime: number           // Playhead position
    isPlaying: boolean

    // Zoom/Pan
    zoom: number                  // 1 = full view, 2+ = zoomed in
    scrollPosition: number        // Scroll offset in pixels

    // Data
    shots: TimelineShot[]
    sectionMarkers: TimelineSectionMarker[]

    // Selection
    selectedShotId: string | null

    // Actions
    setAudioUrl: (url: string) => void
    setDuration: (duration: number) => void
    setCurrentTime: (time: number) => void
    setPlaying: (playing: boolean) => void
    setZoom: (zoom: number) => void
    setScrollPosition: (position: number) => void
    addShot: (shot: Omit<TimelineShot, 'id'>) => void
    updateShot: (id: string, updates: Partial<TimelineShot>) => void
    removeShot: (id: string) => void
    selectShot: (id: string | null) => void
    setSectionMarkers: (markers: TimelineSectionMarker[]) => void
    importFromSongAnalysis: (sections: Array<{ type: string; startTime: number; endTime: number }>) => void
    reset: () => void
}
