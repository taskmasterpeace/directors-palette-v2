import { create } from "zustand";
import type {
    StoryProject,
    StoryShot,
    GenerationQueue,
    ExtractedEntity,
    ShotGroupingSuggestion
} from "../types/story.types";

export interface StoryCreatorStore {
    // ---- Projects State ----
    projects: StoryProject[]
    currentProject: StoryProject | null
    loadingProjects: boolean

    // ---- Shots State ----
    shots: StoryShot[]
    loadingShots: boolean
    currentPage: number
    totalPages: number
    shotsPerPage: number
    selectedShotIds: string[]

    // ---- Entities State ----
    extractedEntities: ExtractedEntity[]

    // ---- Queue State ----
    currentQueue: GenerationQueue | null
    loadingQueue: boolean

    // ---- UI State ----
    searchQuery: string
    selectedChapter: string | null
    showCompletedOnly: boolean
    groupingSuggestions: ShotGroupingSuggestion[]
    internalTab: 'input' | 'entities' | 'review' | 'queue'

    // ---- Project Actions ----
    setProjects: (projects: StoryProject[]) => void
    setCurrentProject: (project: StoryProject | null) => void
    addProject: (project: StoryProject) => void
    updateProject: (projectId: string, updates: Partial<StoryProject>) => void
    deleteProject: (projectId: string) => void
    setLoadingProjects: (loading: boolean) => void

    // ---- Shot Actions ----
    setShots: (shots: StoryShot[]) => void
    addShot: (shot: StoryShot) => void
    updateShot: (shotId: string, updates: Partial<StoryShot>) => void
    deleteShot: (shotId: string) => void
    setLoadingShots: (loading: boolean) => void
    setCurrentPage: (page: number) => void
    toggleShotSelection: (shotId: string) => void
    selectAllShots: () => void
    clearShotSelection: () => void

    // ---- Entity Actions ----
    setExtractedEntities: (entities: ExtractedEntity[]) => void
    updateEntity: (entityTag: string, updates: Partial<ExtractedEntity>) => void

    // ---- Queue Actions ----
    setCurrentQueue: (queue: GenerationQueue | null) => void
    updateQueueProgress: (progress: number, currentIndex: number) => void
    setLoadingQueue: (loading: boolean) => void

    // ---- UI Actions ----
    setSearchQuery: (query: string) => void
    setSelectedChapter: (chapter: string | null) => void
    setShowCompletedOnly: (show: boolean) => void
    setGroupingSuggestions: (suggestions: ShotGroupingSuggestion[]) => void
    setInternalTab: (tab: 'input' | 'entities' | 'review' | 'queue') => void

    // ---- Computed Getters ----
    getFilteredShots: () => StoryShot[]
    getPaginatedShots: () => StoryShot[]
    getChapters: () => string[]
    getSelectedShots: () => StoryShot[]
}

export const useStoryCreatorStore = create<StoryCreatorStore>()((set, get) => ({
    // ---- Initial State ----
    projects: [],
    currentProject: null,
    loadingProjects: false,

    shots: [],
    loadingShots: false,
    currentPage: 1,
    totalPages: 0,
    shotsPerPage: 20,
    selectedShotIds: [],

    extractedEntities: [],

    currentQueue: null,
    loadingQueue: false,

    searchQuery: '',
    selectedChapter: null,
    showCompletedOnly: false,
    groupingSuggestions: [],
    internalTab: 'input',

    // ---- Project Actions ----
    setProjects: (projects) => set({ projects }),
    setCurrentProject: (project) => set({ currentProject: project }),
    addProject: (project) => set((state) => ({
        projects: [project, ...state.projects]
    })),
    updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, ...updates } : p
        ),
        currentProject: state.currentProject?.id === projectId
            ? { ...state.currentProject, ...updates }
            : state.currentProject
    })),
    deleteProject: (projectId) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject
    })),
    setLoadingProjects: (loading) => set({ loadingProjects: loading }),

    // ---- Shot Actions ----
    setShots: (shots) => {
        const totalPages = Math.ceil(shots.length / get().shotsPerPage)
        set({ shots, totalPages })
    },
    addShot: (shot) => set((state) => {
        const newShots = [...state.shots, shot].sort((a, b) => a.sequence_number - b.sequence_number)
        const totalPages = Math.ceil(newShots.length / state.shotsPerPage)
        return { shots: newShots, totalPages }
    }),
    updateShot: (shotId, updates) => set((state) => ({
        shots: state.shots.map((s) =>
            s.id === shotId ? { ...s, ...updates } : s
        )
    })),
    deleteShot: (shotId) => set((state) => {
        const newShots = state.shots.filter((s) => s.id !== shotId)
        const totalPages = Math.ceil(newShots.length / state.shotsPerPage)
        const currentPage = Math.min(state.currentPage, Math.max(1, totalPages))
        return {
            shots: newShots,
            totalPages,
            currentPage,
            selectedShotIds: state.selectedShotIds.filter(id => id !== shotId)
        }
    }),
    setLoadingShots: (loading) => set({ loadingShots: loading }),
    setCurrentPage: (page) => set({ currentPage: page }),
    toggleShotSelection: (shotId) => set((state) => {
        const isSelected = state.selectedShotIds.includes(shotId)
        return {
            selectedShotIds: isSelected
                ? state.selectedShotIds.filter(id => id !== shotId)
                : [...state.selectedShotIds, shotId]
        }
    }),
    selectAllShots: () => set((state) => ({
        selectedShotIds: state.shots.map(s => s.id)
    })),
    clearShotSelection: () => set({ selectedShotIds: [] }),

    // ---- Entity Actions ----
    setExtractedEntities: (entities) => set({ extractedEntities: entities }),
    updateEntity: (entityTag, updates) => set((state) => ({
        extractedEntities: state.extractedEntities.map((e) =>
            e.tag === entityTag ? { ...e, ...updates } : e
        )
    })),

    // ---- Queue Actions ----
    setCurrentQueue: (queue) => set({ currentQueue: queue }),
    updateQueueProgress: (progress, currentIndex) => set((state) => ({
        currentQueue: state.currentQueue
            ? { ...state.currentQueue, progress, current_shot_index: currentIndex }
            : null
    })),
    setLoadingQueue: (loading) => set({ loadingQueue: loading }),

    // ---- UI Actions ----
    setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
    setSelectedChapter: (chapter) => set({ selectedChapter: chapter, currentPage: 1 }),
    setShowCompletedOnly: (show) => set({ showCompletedOnly: show, currentPage: 1 }),
    setGroupingSuggestions: (suggestions) => set({ groupingSuggestions: suggestions }),
    setInternalTab: (tab) => set({ internalTab: tab }),

    // ---- Computed Getters ----
    getFilteredShots: () => {
        const state = get()
        let filtered = state.shots

        // Filter by search query
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase()
            filtered = filtered.filter(s =>
                s.prompt.toLowerCase().includes(query) ||
                s.reference_tags.some(tag => tag.toLowerCase().includes(query))
            )
        }

        // Filter by chapter
        if (state.selectedChapter) {
            filtered = filtered.filter(s => s.chapter === state.selectedChapter)
        }

        // Filter by completed status
        if (state.showCompletedOnly) {
            filtered = filtered.filter(s => s.status === 'completed')
        }

        return filtered
    },

    getPaginatedShots: () => {
        const state = get()
        const filtered = state.getFilteredShots()
        const start = (state.currentPage - 1) * state.shotsPerPage
        const end = start + state.shotsPerPage
        return filtered.slice(start, end)
    },

    getChapters: () => {
        const state = get()
        const chapters = new Set<string>()
        state.shots.forEach(shot => {
            if (shot.chapter) {
                chapters.add(shot.chapter)
            }
        })
        return Array.from(chapters).sort()
    },

    getSelectedShots: () => {
        const state = get()
        return state.shots.filter(s => state.selectedShotIds.includes(s.id))
    }
}));
