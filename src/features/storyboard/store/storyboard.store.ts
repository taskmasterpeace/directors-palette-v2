import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    Storyboard,
    StoryboardShot,
    StoryboardCharacter,
    StoryboardLocation,
    StyleGuide,
    BRollShot,
    ContactSheetVariant,
    StoryboardGenerationQueue,
    LLMSettings,
    BreakdownLevel,
    ShotBreakdownResult,
    ExtractionResult,
    GeneratedShotPrompt,
    GeneratedImageData,
} from "../types/storyboard.types";
import type { StoryChapter, ChapterDetectionResult } from "../services/chapter-detection.service";

export type StoryboardTab = 'input' | 'entities' | 'style' | 'shots' | 'generation' | 'gallery'

// Generation settings that persist
export interface GenerationSettings {
    aspectRatio: string
    resolution: '1K' | '2K' | '4K'
}

// Global generation progress state (moved from local component state)
export interface GenerationProgress {
    isGenerating: boolean
    current: number
    total: number
    currentShotSequence?: number
    aborted?: boolean
}

export interface StoryboardStore {
    // ---- Storyboard State ----
    storyboards: Storyboard[]
    currentStoryboard: Storyboard | null
    loadingStoryboards: boolean

    // ---- Characters State ----
    characters: StoryboardCharacter[]
    loadingCharacters: boolean

    // ---- Locations State ----
    locations: StoryboardLocation[]
    loadingLocations: boolean

    // ---- Style Guides State ----
    styleGuides: StyleGuide[]
    currentStyleGuide: StyleGuide | null
    selectedPresetStyle: string | null  // Can be PresetStyleId or custom style ID
    loadingStyleGuides: boolean

    // ---- Shots State ----
    shots: StoryboardShot[]
    loadingShots: boolean
    selectedShotIds: string[]

    // ---- B-Roll State ----
    brollShots: BRollShot[]
    loadingBroll: boolean

    // ---- Contact Sheet State ----
    contactSheetModalOpen: boolean
    contactSheetShotId: string | null
    contactSheetVariants: ContactSheetVariant[]
    loadingContactSheet: boolean

    // ---- Queue State ----
    currentQueue: StoryboardGenerationQueue | null
    loadingQueue: boolean

    // ---- LLM Settings State ----
    llmSettings: LLMSettings | null
    loadingLLMSettings: boolean

    // ---- Shot Breakdown State ----
    breakdownLevel: BreakdownLevel
    breakdownResult: ShotBreakdownResult | null

    // ---- Generated Prompts State ----
    generatedPrompts: GeneratedShotPrompt[]
    isGeneratingPrompts: boolean
    promptsGenerated: boolean

    // ---- Extraction State ----
    extractionResult: ExtractionResult | null
    isExtracting: boolean

    // ---- Generated Images State ----
    generatedImages: Record<number, GeneratedImageData>

    // ---- Chapter State ----
    chapters: StoryChapter[]
    activeChapterIndex: number
    shouldShowChapters: boolean
    chapterDetectionReason: string

    // ---- UI State ----
    internalTab: StoryboardTab
    storyText: string // Current story text in input
    searchQuery: string
    selectedModel: string // OpenRouter model selection
    isPreviewCollapsed: boolean // Collapse Color-Coded Preview after generation

    // ---- Shot Lab UI State ----
    isShotLabOpen: boolean
    activeLabShotSequence: number | null
    openShotLab: (sequence: number) => void
    closeShotLab: () => void

    // ---- Generation Settings (persisted) ----
    generationSettings: GenerationSettings
    globalPromptPrefix: string  // Prepended to all prompts
    globalPromptSuffix: string  // Appended to all prompts

    // ---- Shot Notes (per-shot guidance for AI) ----
    shotNotes: Record<number, string>  // sequence -> user notes

    // ---- Save Indicator ----
    lastSavedAt: number | null  // Timestamp of last save

    // ---- Global Generation Progress (moved from local state) ----
    generationProgress: GenerationProgress | null

    // ---- Storyboard Actions ----
    setStoryboards: (storyboards: Storyboard[]) => void
    setCurrentStoryboard: (storyboard: Storyboard | null) => void
    addStoryboard: (storyboard: Storyboard) => void
    updateStoryboard: (id: string, updates: Partial<Storyboard>) => void
    deleteStoryboard: (id: string) => void
    setLoadingStoryboards: (loading: boolean) => void

    // ---- Character Actions ----
    setCharacters: (characters: StoryboardCharacter[]) => void
    addCharacter: (character: StoryboardCharacter) => void
    updateCharacter: (id: string, updates: Partial<StoryboardCharacter>) => void
    deleteCharacter: (id: string) => void
    toggleCharacterReference: (id: string) => void
    setLoadingCharacters: (loading: boolean) => void

    // ---- Location Actions ----
    setLocations: (locations: StoryboardLocation[]) => void
    addLocation: (location: StoryboardLocation) => void
    updateLocation: (id: string, updates: Partial<StoryboardLocation>) => void
    deleteLocation: (id: string) => void
    toggleLocationReference: (id: string) => void
    setLoadingLocations: (loading: boolean) => void

    // ---- Style Guide Actions ----
    setStyleGuides: (guides: StyleGuide[]) => void
    setCurrentStyleGuide: (guide: StyleGuide | null) => void
    setSelectedPresetStyle: (presetId: string | null) => void
    addStyleGuide: (guide: StyleGuide) => void
    updateStyleGuide: (id: string, updates: Partial<StyleGuide>) => void
    deleteStyleGuide: (id: string) => void
    setLoadingStyleGuides: (loading: boolean) => void

    // ---- Shot Actions ----
    setShots: (shots: StoryboardShot[]) => void
    addShot: (shot: StoryboardShot) => void
    updateShot: (id: string, updates: Partial<StoryboardShot>) => void
    deleteShot: (id: string) => void
    setLoadingShots: (loading: boolean) => void
    toggleShotSelection: (id: string) => void
    selectAllShots: () => void
    clearShotSelection: () => void

    // ---- B-Roll Actions ----
    setBRollShots: (shots: BRollShot[]) => void
    addBRollShot: (shot: BRollShot) => void
    updateBRollShot: (id: string, updates: Partial<BRollShot>) => void
    deleteBRollShot: (id: string) => void
    setLoadingBroll: (loading: boolean) => void

    // ---- Contact Sheet Actions ----
    openContactSheetModal: (shotId: string) => void
    closeContactSheetModal: () => void
    setContactSheetVariants: (variants: ContactSheetVariant[]) => void
    updateContactSheetVariant: (id: string, updates: Partial<ContactSheetVariant>) => void
    setLoadingContactSheet: (loading: boolean) => void

    // ---- Queue Actions ----
    setCurrentQueue: (queue: StoryboardGenerationQueue | null) => void
    updateQueueProgress: (progress: number, currentIndex: number) => void
    setLoadingQueue: (loading: boolean) => void

    // ---- LLM Settings Actions ----
    setLLMSettings: (settings: LLMSettings | null) => void
    setLoadingLLMSettings: (loading: boolean) => void

    // ---- Shot Breakdown Actions ----
    setBreakdownLevel: (level: BreakdownLevel) => void
    setBreakdownResult: (result: ShotBreakdownResult | null) => void

    // ---- Generated Prompts Actions ----
    setGeneratedPrompts: (prompts: GeneratedShotPrompt[]) => void
    addGeneratedPrompts: (prompts: GeneratedShotPrompt[]) => void
    updateGeneratedPrompt: (sequence: number, prompt: string) => void
    updateGeneratedShot: (sequence: number, updates: Partial<GeneratedShotPrompt>) => void
    updateGeneratedPromptMetadata: (sequence: number, metadata: Partial<GeneratedShotPrompt['metadata']>) => void
    clearGeneratedPrompts: () => void
    setIsGeneratingPrompts: (generating: boolean) => void

    // ---- Extraction Actions ----
    setExtractionResult: (result: ExtractionResult | null) => void
    setIsExtracting: (extracting: boolean) => void

    // ---- Generated Images Actions ----
    setGeneratedImage: (shotNumber: number, data: GeneratedImageData) => void
    updateGeneratedImageStatus: (shotNumber: number, status: 'pending' | 'generating' | 'completed' | 'failed', imageUrl?: string, error?: string) => void
    clearGeneratedImages: () => void

    // ---- Chapter Actions ----
    setChapters: (result: ChapterDetectionResult) => void
    setActiveChapter: (index: number) => void
    clearChapters: () => void
    getChapterSegments: (chapterIndex: number) => GeneratedShotPrompt[]

    // ---- UI Actions ----
    setInternalTab: (tab: StoryboardTab) => void
    setStoryText: (text: string) => void
    setSearchQuery: (query: string) => void
    setSelectedModel: (model: string) => void
    setPreviewCollapsed: (collapsed: boolean) => void
    togglePreviewCollapsed: () => void

    // ---- Generation Settings Actions ----
    setGenerationSettings: (settings: Partial<GenerationSettings>) => void
    setGlobalPromptPrefix: (prefix: string) => void
    setGlobalPromptSuffix: (suffix: string) => void

    // ---- Shot Notes Actions ----
    setShotNote: (sequence: number, note: string) => void
    clearShotNotes: () => void

    // ---- Generation Progress Actions ----
    setGenerationProgress: (progress: GenerationProgress | null) => void
    updateGenerationProgress: (updates: Partial<GenerationProgress>) => void
    startGeneration: (total: number) => void
    completeGeneration: () => void
    abortGeneration: () => void

    // ---- Reset ----
    resetStoryboard: () => void

    // ---- Computed Getters ----
    getCharactersWithReferences: () => StoryboardCharacter[]
    getLocationsWithReferences: () => StoryboardLocation[]
    getSelectedShots: () => StoryboardShot[]
    getShotBySequence: (sequence: number) => StoryboardShot | undefined
}

const initialState = {
    storyboards: [],
    currentStoryboard: null,
    loadingStoryboards: false,

    characters: [],
    loadingCharacters: false,

    locations: [],
    loadingLocations: false,

    styleGuides: [],
    currentStyleGuide: null,
    selectedPresetStyle: null,
    loadingStyleGuides: false,

    shots: [],
    loadingShots: false,
    selectedShotIds: [],

    brollShots: [],
    loadingBroll: false,

    contactSheetModalOpen: false,
    contactSheetShotId: null,
    contactSheetVariants: [],
    loadingContactSheet: false,

    currentQueue: null,
    loadingQueue: false,

    llmSettings: null,
    loadingLLMSettings: false,

    breakdownLevel: 2 as BreakdownLevel,
    breakdownResult: null,

    generatedPrompts: [],
    isGeneratingPrompts: false,
    promptsGenerated: false,

    extractionResult: null,
    isExtracting: false,

    generatedImages: {},

    chapters: [],
    activeChapterIndex: 0,
    shouldShowChapters: false,
    chapterDetectionReason: '',

    internalTab: 'input' as StoryboardTab,
    storyText: '',
    searchQuery: '',
    selectedModel: 'openai/gpt-4o-mini',
    isPreviewCollapsed: false,

    // Generation settings
    generationSettings: {
        aspectRatio: '16:9',
        resolution: '2K' as const
    },
    globalPromptPrefix: '',
    globalPromptSuffix: '',

    // Shot notes
    shotNotes: {},

    // Save indicator
    lastSavedAt: null,

    // Generation progress (global state)
    generationProgress: null
}

// Fields to persist (user's work-in-progress)
// NOTE: Avoid persisting large arrays (breakdownResult, generatedPrompts)
// as they can exceed localStorage quota (~5MB) with many shots
const PERSISTED_FIELDS = [
    'storyText',
    'breakdownLevel',
    // 'breakdownResult', // Too large - can have 60+ segments with full text
    // 'generatedPrompts', // Too large - can have 60+ prompts with metadata
    // 'promptsGenerated', // Depends on generatedPrompts
    'characters',
    'locations',
    'selectedPresetStyle',
    'currentStyleGuide',
    'extractionResult',
    // 'chapters', // Can be re-detected from breakdownResult
    'activeChapterIndex',
    'shouldShowChapters',
    'chapterDetectionReason',
    'selectedModel',
    'internalTab',
    // New persisted fields
    'generationSettings',
    'globalPromptPrefix',
    'globalPromptSuffix',
    'shotNotes'
] as const

export const useStoryboardStore = create<StoryboardStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ---- Storyboard Actions ----
            setStoryboards: (storyboards) => set({ storyboards }),
            setCurrentStoryboard: (storyboard) => set({ currentStoryboard: storyboard }),
            addStoryboard: (storyboard) => set((state) => ({
                storyboards: [storyboard, ...state.storyboards]
            })),
            updateStoryboard: (id, updates) => set((state) => ({
                storyboards: state.storyboards.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                ),
                currentStoryboard: state.currentStoryboard?.id === id
                    ? { ...state.currentStoryboard, ...updates }
                    : state.currentStoryboard
            })),
            deleteStoryboard: (id) => set((state) => ({
                storyboards: state.storyboards.filter((s) => s.id !== id),
                currentStoryboard: state.currentStoryboard?.id === id ? null : state.currentStoryboard
            })),
            setLoadingStoryboards: (loading) => set({ loadingStoryboards: loading }),

            // ---- Character Actions ----
            setCharacters: (characters) => set({ characters }),
            addCharacter: (character) => set((state) => ({
                characters: [...state.characters, character]
            })),
            updateCharacter: (id, updates) => set((state) => ({
                characters: state.characters.map((c) =>
                    c.id === id ? { ...c, ...updates } : c
                )
            })),
            deleteCharacter: (id) => set((state) => ({
                characters: state.characters.filter((c) => c.id !== id)
            })),
            toggleCharacterReference: (id) => set((state) => ({
                characters: state.characters.map((c) =>
                    c.id === id ? { ...c, has_reference: !c.has_reference } : c
                )
            })),
            setLoadingCharacters: (loading) => set({ loadingCharacters: loading }),

            // ---- Location Actions ----
            setLocations: (locations) => set({ locations }),
            addLocation: (location) => set((state) => ({
                locations: [...state.locations, location]
            })),
            updateLocation: (id, updates) => set((state) => ({
                locations: state.locations.map((l) =>
                    l.id === id ? { ...l, ...updates } : l
                )
            })),
            deleteLocation: (id) => set((state) => ({
                locations: state.locations.filter((l) => l.id !== id)
            })),
            toggleLocationReference: (id) => set((state) => ({
                locations: state.locations.map((l) =>
                    l.id === id ? { ...l, has_reference: !l.has_reference } : l
                )
            })),
            setLoadingLocations: (loading) => set({ loadingLocations: loading }),

            // ---- Style Guide Actions ----
            setStyleGuides: (guides) => set({ styleGuides: guides }),
            setCurrentStyleGuide: (guide) => set({ currentStyleGuide: guide }),
            setSelectedPresetStyle: (presetId) => set({
                selectedPresetStyle: presetId,
                // Clear custom style guide when selecting preset
                currentStyleGuide: presetId ? null : undefined
            }),
            addStyleGuide: (guide) => set((state) => ({
                styleGuides: [...state.styleGuides, guide]
            })),
            updateStyleGuide: (id, updates) => set((state) => ({
                styleGuides: state.styleGuides.map((g) =>
                    g.id === id ? { ...g, ...updates } : g
                ),
                currentStyleGuide: state.currentStyleGuide?.id === id
                    ? { ...state.currentStyleGuide, ...updates }
                    : state.currentStyleGuide
            })),
            deleteStyleGuide: (id) => set((state) => ({
                styleGuides: state.styleGuides.filter((g) => g.id !== id),
                currentStyleGuide: state.currentStyleGuide?.id === id ? null : state.currentStyleGuide
            })),
            setLoadingStyleGuides: (loading) => set({ loadingStyleGuides: loading }),

            // ---- Shot Actions ----
            setShots: (shots) => set({ shots: shots.sort((a, b) => a.sequence_number - b.sequence_number) }),
            addShot: (shot) => set((state) => ({
                shots: [...state.shots, shot].sort((a, b) => a.sequence_number - b.sequence_number)
            })),
            updateShot: (id, updates) => set((state) => ({
                shots: state.shots.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                )
            })),
            deleteShot: (id) => set((state) => ({
                shots: state.shots.filter((s) => s.id !== id),
                selectedShotIds: state.selectedShotIds.filter(sid => sid !== id)
            })),
            setLoadingShots: (loading) => set({ loadingShots: loading }),
            toggleShotSelection: (id) => set((state) => ({
                selectedShotIds: state.selectedShotIds.includes(id)
                    ? state.selectedShotIds.filter(sid => sid !== id)
                    : [...state.selectedShotIds, id]
            })),
            selectAllShots: () => set((state) => ({
                selectedShotIds: state.shots.map(s => s.id)
            })),
            clearShotSelection: () => set({ selectedShotIds: [] }),

            // ---- B-Roll Actions ----
            setBRollShots: (shots) => set({ brollShots: shots }),
            addBRollShot: (shot) => set((state) => ({
                brollShots: [...state.brollShots, shot]
            })),
            updateBRollShot: (id, updates) => set((state) => ({
                brollShots: state.brollShots.map((s) =>
                    s.id === id ? { ...s, ...updates } : s
                )
            })),
            deleteBRollShot: (id) => set((state) => ({
                brollShots: state.brollShots.filter((s) => s.id !== id)
            })),
            setLoadingBroll: (loading) => set({ loadingBroll: loading }),

            // ---- Contact Sheet Actions ----
            openContactSheetModal: (shotId) => set({
                contactSheetModalOpen: true,
                contactSheetShotId: shotId
            }),
            closeContactSheetModal: () => set({
                contactSheetModalOpen: false,
                contactSheetShotId: null,
                contactSheetVariants: []
            }),
            setContactSheetVariants: (variants) => set({ contactSheetVariants: variants }),
            updateContactSheetVariant: (id, updates) => set((state) => ({
                contactSheetVariants: state.contactSheetVariants.map((v) =>
                    v.id === id ? { ...v, ...updates } : v
                )
            })),
            setLoadingContactSheet: (loading) => set({ loadingContactSheet: loading }),

            // ---- Queue Actions ----
            setCurrentQueue: (queue) => set({ currentQueue: queue }),
            updateQueueProgress: (progress, currentIndex) => set((state) => ({
                currentQueue: state.currentQueue
                    ? { ...state.currentQueue, progress, current_shot_index: currentIndex }
                    : null
            })),
            setLoadingQueue: (loading) => set({ loadingQueue: loading }),

            // ---- LLM Settings Actions ----
            setLLMSettings: (settings) => set({ llmSettings: settings }),
            setLoadingLLMSettings: (loading) => set({ loadingLLMSettings: loading }),

            // ---- Shot Breakdown Actions ----
            setBreakdownLevel: (level) => set({ breakdownLevel: level }),
            setBreakdownResult: (result) => set({ breakdownResult: result }),

            // ---- Generated Prompts Actions ----
            setGeneratedPrompts: (prompts) => set({
                generatedPrompts: prompts,
                promptsGenerated: prompts.length > 0
            }),
            addGeneratedPrompts: (prompts) => set((state) => {
                // Merge new prompts, avoiding duplicates by sequence number
                const existingSequences = new Set(state.generatedPrompts.map(p => p.sequence))
                const newPrompts = prompts.filter(p => !existingSequences.has(p.sequence))
                const merged = [...state.generatedPrompts, ...newPrompts].sort((a, b) => a.sequence - b.sequence)
                return {
                    generatedPrompts: merged,
                    promptsGenerated: merged.length > 0,
                    // Auto-collapse preview when prompts are generated
                    isPreviewCollapsed: merged.length > 0 ? true : state.isPreviewCollapsed
                }
            }),
            updateGeneratedPrompt: (sequence, prompt) => set((state) => ({
                generatedPrompts: state.generatedPrompts.map((p) =>
                    p.sequence === sequence ? { ...p, prompt, edited: true } : p
                )
            })),
            updateGeneratedShot: (sequence, updates) => set((state) => ({
                generatedPrompts: state.generatedPrompts.map((p) =>
                    p.sequence === sequence ? { ...p, ...updates } : p
                )
            })),
            updateGeneratedPromptMetadata: (sequence, metadata) => set((state) => ({
                generatedPrompts: state.generatedPrompts.map((p) =>
                    p.sequence === sequence ? { ...p, metadata: { ...p.metadata, ...metadata } } : p
                )
            })),
            clearGeneratedPrompts: () => set({
                generatedPrompts: [],
                promptsGenerated: false
            }),
            setIsGeneratingPrompts: (generating) => set({ isGeneratingPrompts: generating }),

            // ---- Extraction Actions ----
            setExtractionResult: (result) => set({ extractionResult: result }),
            setIsExtracting: (extracting) => set({ isExtracting: extracting }),

            // ---- Generated Images Actions ----
            setGeneratedImage: (shotNumber, data) => set((state) => ({
                generatedImages: { ...state.generatedImages, [shotNumber]: data }
            })),
            updateGeneratedImageStatus: (shotNumber, status, imageUrl, error) => set((state) => ({
                generatedImages: {
                    ...state.generatedImages,
                    [shotNumber]: {
                        ...state.generatedImages[shotNumber],
                        status,
                        ...(imageUrl && { imageUrl }),
                        ...(error && { error })
                    }
                }
            })),
            clearGeneratedImages: () => set({ generatedImages: {} }),

            // ---- Chapter Actions ----
            setChapters: (result) => set({
                chapters: result.chapters,
                shouldShowChapters: result.shouldChapter,
                chapterDetectionReason: result.reason,
                activeChapterIndex: 0
            }),
            setActiveChapter: (index) => set({ activeChapterIndex: index }),
            clearChapters: () => set({
                chapters: [],
                shouldShowChapters: false,
                chapterDetectionReason: '',
                activeChapterIndex: 0
            }),
            getChapterSegments: (chapterIndex) => {
                const state = get()
                const chapter = state.chapters[chapterIndex]
                if (!chapter) return state.generatedPrompts

                // If no segments mapped to chapters yet, return all
                if (chapter.segmentIndices.length === 0) {
                    return state.generatedPrompts
                }

                return state.generatedPrompts.filter(p =>
                    chapter.segmentIndices.includes(p.sequence)
                )
            },

            // ---- UI Actions ----
            setInternalTab: (tab) => set({ internalTab: tab }),
            setStoryText: (text) => set((state) => {
                // Detect significant text change (e.g., pasting a new story)
                // If the text changed by more than 50% or length changed by more than 500 chars
                // clear extraction results to avoid stale data
                const oldText = state.storyText
                const lengthChange = Math.abs(text.length - oldText.length)
                const isSignificantChange = lengthChange > 500 ||
                    (oldText.length > 100 && text.length > 100 && lengthChange > oldText.length * 0.5)

                if (isSignificantChange) {
                    console.log('Significant story change detected, clearing old extraction data')
                    return {
                        storyText: text,
                        // Clear extraction-related data
                        extractionResult: null,
                        characters: [],
                        locations: [],
                        // Clear generated data
                        generatedPrompts: [],
                        promptsGenerated: false,
                        generatedImages: {},
                        // Reset chapter detection
                        chapters: [],
                        shouldShowChapters: false,
                        chapterDetectionReason: '',
                        activeChapterIndex: 0,
                        // Clear breakdown (will be recalculated)
                        breakdownResult: null
                    }
                }
                return { storyText: text }
            }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setSelectedModel: (model) => set({ selectedModel: model }),
            setPreviewCollapsed: (collapsed) => set({ isPreviewCollapsed: collapsed }),
            togglePreviewCollapsed: () => set((state) => ({ isPreviewCollapsed: !state.isPreviewCollapsed })),

            // ---- Shot Lab UI Actions ----
            isShotLabOpen: false,
            activeLabShotSequence: null,
            openShotLab: (sequence: number) => set({ isShotLabOpen: true, activeLabShotSequence: sequence }),
            closeShotLab: () => set({ isShotLabOpen: false, activeLabShotSequence: null }),

            // ---- Generation Settings Actions ----
            setGenerationSettings: (settings) => set((state) => ({
                generationSettings: { ...state.generationSettings, ...settings },
                lastSavedAt: Date.now()
            })),
            setGlobalPromptPrefix: (prefix) => set({ globalPromptPrefix: prefix, lastSavedAt: Date.now() }),
            setGlobalPromptSuffix: (suffix) => set({ globalPromptSuffix: suffix, lastSavedAt: Date.now() }),

            // ---- Shot Notes Actions ----
            setShotNote: (sequence, note) => set((state) => ({
                shotNotes: { ...state.shotNotes, [sequence]: note },
                lastSavedAt: Date.now()
            })),
            clearShotNotes: () => set({ shotNotes: {}, lastSavedAt: Date.now() }),

            // ---- Generation Progress Actions ----
            setGenerationProgress: (progress) => set({ generationProgress: progress }),
            updateGenerationProgress: (updates) => set((state) => ({
                generationProgress: state.generationProgress
                    ? { ...state.generationProgress, ...updates }
                    : null
            })),
            startGeneration: (total) => set({
                generationProgress: {
                    isGenerating: true,
                    current: 0,
                    total,
                    aborted: false
                }
            }),
            completeGeneration: () => set({
                generationProgress: null
            }),
            abortGeneration: () => set((state) => ({
                generationProgress: state.generationProgress
                    ? { ...state.generationProgress, isGenerating: false, aborted: true }
                    : null
            })),

            // ---- Reset ----
            resetStoryboard: () => set({
                ...initialState,
                storyboards: get().storyboards, // Keep storyboards list
                styleGuides: get().styleGuides, // Keep style guides
                llmSettings: get().llmSettings, // Keep LLM settings
                generatedImages: {}, // Clear generated images
                generatedPrompts: [], // Clear generated prompts
                promptsGenerated: false
            }),

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

            getShotBySequence: (sequence) => {
                return get().shots.find(s => s.sequence_number === sequence)
            }
        }),
        {
            name: 'storyboard-storage',
            partialize: (state) => {
                // Only persist selected fields
                const persisted: Partial<StoryboardStore> = {}
                for (const key of PERSISTED_FIELDS) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (persisted as any)[key] = state[key]
                }
                return persisted
            },
            // Custom storage with quota error handling
            storage: {
                getItem: (name) => {
                    try {
                        if (typeof window === 'undefined') return null
                        const str = localStorage.getItem(name)
                        return str ? JSON.parse(str) : null
                    } catch (e) {
                        console.warn('Failed to read from localStorage:', e)
                        return null
                    }
                },
                setItem: (name, value) => {
                    try {
                        if (typeof window === 'undefined') return
                        localStorage.setItem(name, JSON.stringify(value))
                        // Trigger save indicator by dispatching custom event
                        window.dispatchEvent(new CustomEvent('storyboard-saved', { detail: Date.now() }))
                    } catch (e) {
                        // QuotaExceededError - selective cleanup, preserve user's core work
                        if (e instanceof Error && e.name === 'QuotaExceededError') {
                            console.warn('localStorage quota exceeded, attempting selective cleanup')

                            try {
                                // Get the current value being saved (it's the state object)
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const stateToSave = typeof value === 'object' ? (value as any).state || value : value

                                // Create a reduced state that preserves user's core work
                                // but clears large regenerable data
                                const reducedState = {
                                    ...stateToSave,
                                    // Keep user's original input (their work)
                                    storyText: stateToSave.storyText,
                                    breakdownLevel: stateToSave.breakdownLevel,
                                    // Keep first 10 characters/locations (can be large with images)
                                    characters: stateToSave.characters?.slice?.(0, 10) || [],
                                    locations: stateToSave.locations?.slice?.(0, 10) || [],
                                    // Keep style settings (small)
                                    selectedPresetStyle: stateToSave.selectedPresetStyle,
                                    currentStyleGuide: stateToSave.currentStyleGuide,
                                    // Keep generation settings (small)
                                    generationSettings: stateToSave.generationSettings,
                                    globalPromptPrefix: stateToSave.globalPromptPrefix,
                                    globalPromptSuffix: stateToSave.globalPromptSuffix,
                                    // Clear large regenerable data
                                    extractionResult: null,
                                    shotNotes: {},
                                }

                                // Build proper persist structure
                                const reducedValue = typeof value === 'object' && 'state' in (value as object)
                                    ? { ...value, state: reducedState }
                                    : reducedState

                                localStorage.setItem(name, JSON.stringify(reducedValue))

                                // Notify user via custom event (can be caught by UI)
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('storyboard-quota-warning', {
                                        detail: {
                                            message: 'Storage limit reached. Some data was cleared but your story and core settings are preserved.',
                                            timestamp: Date.now()
                                        }
                                    }))
                                }
                                console.warn('Storage limit reached. Cleared regenerable data to preserve user work.')
                            } catch (retryError) {
                                // Last resort: try to clear completely and save minimal
                                console.error('Failed to save even after selective cleanup:', retryError)
                                try {
                                    localStorage.removeItem(name)
                                    // Dispatch error event
                                    if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('storyboard-quota-error', {
                                            detail: {
                                                message: 'Storage full. Unable to save progress. Please export your work.',
                                                timestamp: Date.now()
                                            }
                                        }))
                                    }
                                } catch {
                                    // Complete failure, nothing we can do
                                }
                            }
                        } else {
                            console.warn('Failed to write to localStorage:', e)
                        }
                    }
                },
                removeItem: (name) => {
                    try {
                        if (typeof window === 'undefined') return
                        localStorage.removeItem(name)
                    } catch (e) {
                        console.warn('Failed to remove from localStorage:', e)
                    }
                }
            }
        }
    )
)
