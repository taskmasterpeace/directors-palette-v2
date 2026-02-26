import type { StoreApi } from 'zustand'
import type { StoryboardStore, StoryboardTab, GenerationSettings, GenerationProgress } from '../storyboard.store'
import type { ModelId } from '@/config'
import { logger } from '@/lib/logger'

type Set = StoreApi<StoryboardStore>['setState']
type Get = StoreApi<StoryboardStore>['getState']

// Initial state for UI slice
export const uiInitialState = {
    internalTab: 'input' as StoryboardTab,
    storyText: '',
    searchQuery: '',
    selectedModel: 'openai/gpt-4.1-mini',
    isPreviewCollapsed: false,
    viewMode: 'tabs' as const,

    // Character sheet pre-selection
    preSelectedCharacterId: null as string | null,

    // IndexedDB project persistence
    activeProjectId: null as number | null,

    // Director selection
    selectedDirectorId: null as string | null,

    // Shot Lab UI state
    isShotLabOpen: false,
    activeLabShotSequence: null as number | null,

    // Generation settings
    generationSettings: {
        aspectRatio: '16:9',
        resolution: '2K' as const,
        imageModel: 'nano-banana-2' as ModelId
    } as GenerationSettings,
    globalPromptPrefix: '',
    globalPromptSuffix: '',

    // Shot notes
    shotNotes: {} as Record<number, string>,

    // Save indicator
    lastSavedAt: null as number | null,

    // Generation progress (global state)
    generationProgress: null as GenerationProgress | null,
}

export const createUiSlice = (set: Set, get: Get) => ({
    ...uiInitialState,

    // ---- UI Actions ----
    setInternalTab: (tab: StoryboardTab) => set({ internalTab: tab }),
    setStoryText: (text: string) => set((state) => {
        // Detect significant text change (e.g., pasting a new story)
        // If the text changed by more than 50% or length changed by more than 500 chars
        // clear extraction results to avoid stale data
        const oldText = state.storyText
        const lengthChange = Math.abs(text.length - oldText.length)
        const isSignificantChange = lengthChange > 500 ||
            (oldText.length > 100 && text.length > 100 && lengthChange > oldText.length * 0.5)

        if (isSignificantChange) {
            logger.storyboard.info('Significant story change detected, clearing old extraction data')
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
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSelectedModel: (model: string) => set({ selectedModel: model }),
    setPreviewCollapsed: (collapsed: boolean) => set({ isPreviewCollapsed: collapsed }),
    togglePreviewCollapsed: () => set((state) => ({ isPreviewCollapsed: !state.isPreviewCollapsed })),
    setViewMode: (mode: 'tabs' | 'canvas') => set({ viewMode: mode }),

    // ---- Character Sheet Pre-Selection Actions ----
    setPreSelectedCharacterId: (id: string | null) => set({ preSelectedCharacterId: id }),

    // ---- IndexedDB Project Persistence Actions ----
    setActiveProjectId: (id: number | null) => set({ activeProjectId: id }),

    // ---- Shot Lab UI Actions ----
    openShotLab: (sequence: number) => set({ isShotLabOpen: true, activeLabShotSequence: sequence }),
    closeShotLab: () => set({ isShotLabOpen: false, activeLabShotSequence: null }),

    // ---- Director Selection Actions ----
    setSelectedDirector: (directorId: string | null) => set({ selectedDirectorId: directorId }),

    // ---- Generation Settings Actions ----
    setGenerationSettings: (settings: Partial<GenerationSettings>) => set((state) => ({
        generationSettings: { ...state.generationSettings, ...settings },
        lastSavedAt: Date.now()
    })),
    setGlobalPromptPrefix: (prefix: string) => set({ globalPromptPrefix: prefix, lastSavedAt: Date.now() }),
    setGlobalPromptSuffix: (suffix: string) => set({ globalPromptSuffix: suffix, lastSavedAt: Date.now() }),

    // ---- Shot Notes Actions ----
    setShotNote: (sequence: number, note: string) => set((state) => ({
        shotNotes: { ...state.shotNotes, [sequence]: note },
        lastSavedAt: Date.now()
    })),
    clearShotNotes: () => set({ shotNotes: {}, lastSavedAt: Date.now() }),

    // ---- Generation Progress Actions ----
    setGenerationProgress: (progress: GenerationProgress | null) => set({ generationProgress: progress }),
    updateGenerationProgress: (updates: Partial<GenerationProgress>) => set((state) => ({
        generationProgress: state.generationProgress
            ? { ...state.generationProgress, ...updates }
            : null
    })),
    startGeneration: (total: number) => set({
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
        // Spread all initial states from each slice
        ...get(),
        // Reset entity state
        currentStoryboard: null,
        loadingStoryboards: false,
        characters: [],
        loadingCharacters: false,
        locations: [],
        loadingLocations: false,
        currentStyleGuide: null,
        selectedPresetStyle: null,
        loadingStyleGuides: false,
        shots: [],
        loadingShots: false,
        selectedShotIds: [],
        // Reset generation state
        brollShots: [],
        loadingBroll: false,
        brollModalOpen: false,
        brollShotSequence: null,
        brollReferenceUrl: null,
        contactSheetModalOpen: false,
        contactSheetShotId: null,
        contactSheetVariants: [],
        loadingContactSheet: false,
        currentQueue: null,
        loadingQueue: false,
        loadingLLMSettings: false,
        breakdownLevel: 2 as const,
        breakdownResult: null,
        generatedPrompts: [],
        isGeneratingPrompts: false,
        promptsGenerated: false,
        extractionResult: null,
        isExtracting: false,
        generatedImages: {},
        // Reset documentary state
        chapters: [],
        activeChapterIndex: 0,
        shouldShowChapters: false,
        chapterDetectionReason: '',
        isDocumentaryMode: false,
        documentaryChapters: [],
        isClassifyingSegments: false,
        isGeneratingBrollPool: false,
        isGeneratingTitleCards: false,
        // Reset UI state
        internalTab: 'input' as StoryboardTab,
        storyText: '',
        searchQuery: '',
        selectedModel: 'openai/gpt-4.1-mini',
        isPreviewCollapsed: false,
        viewMode: 'tabs' as const,
        preSelectedCharacterId: null,
        activeProjectId: null,
        selectedDirectorId: null,
        isShotLabOpen: false,
        activeLabShotSequence: null,
        generationSettings: {
            aspectRatio: '16:9',
            resolution: '2K' as const,
            imageModel: 'nano-banana-2' as ModelId
        },
        globalPromptPrefix: '',
        globalPromptSuffix: '',
        shotNotes: {},
        lastSavedAt: null,
        generationProgress: null,
        // Keep storyboards list, style guides, and LLM settings
        storyboards: get().storyboards,
        styleGuides: get().styleGuides,
        llmSettings: get().llmSettings,
    }),
})
