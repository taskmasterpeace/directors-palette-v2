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
    BRollPoolPrompt,
    BRollPoolCategory,
    TitleCard,
    DocumentaryChapter,
} from "../types/storyboard.types";
import type { StoryChapter, ChapterDetectionResult } from "../services/chapter-detection.service";
import type { ModelId } from "@/config";
import { logger } from '@/lib/logger'

// Import slices
import { createEntitySlice } from './slices/entity.slice'
import { createGenerationSlice } from './slices/generation.slice'
import { createDocumentarySlice } from './slices/documentary.slice'
import { createUiSlice } from './slices/ui.slice'

export type StoryboardTab = 'input' | 'style' | 'directors' | 'entities' | 'shots' | 'generation' | 'gallery'

// Generation settings that persist
export interface GenerationSettings {
    aspectRatio: string
    resolution: '1K' | '2K' | '4K'
    imageModel: ModelId
}

// Global generation progress state (moved from local component state)
export interface GenerationProgress {
    isGenerating: boolean
    current: number
    total: number
    currentShotSequence?: number
    aborted?: boolean
    lastCompletedImageUrl?: string | null
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
    brollModalOpen: boolean
    brollShotSequence: number | null
    brollReferenceUrl: string | null

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

    // ---- Documentary Mode State ----
    isDocumentaryMode: boolean
    documentaryChapters: DocumentaryChapter[]
    isClassifyingSegments: boolean
    isGeneratingBrollPool: boolean
    isGeneratingTitleCards: boolean

    // ---- UI State ----
    internalTab: StoryboardTab
    storyText: string // Current story text in input
    searchQuery: string
    selectedModel: string // OpenRouter model selection
    isPreviewCollapsed: boolean // Collapse Color-Coded Preview after generation
    viewMode: 'tabs' | 'canvas' // Storyboard view mode

    // ---- Director Selection State ----
    selectedDirectorId: string | null

    // ---- Character Sheet Pre-Selection ----
    preSelectedCharacterId: string | null
    setPreSelectedCharacterId: (id: string | null) => void

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
    openBRollModal: (sequence: number, referenceUrl: string) => void
    closeBRollModal: () => void

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

    // ---- Video/Animation Actions ----
    setVideoStatus: (sequence: number, status: 'idle' | 'generating' | 'completed' | 'failed', videoUrl?: string, error?: string) => void
    setAnimationPrompt: (sequence: number, prompt: string) => void

    // ---- Chapter Actions ----
    setChapters: (result: ChapterDetectionResult) => void
    setActiveChapter: (index: number) => void
    clearChapters: () => void
    getChapterSegments: (chapterIndex: number) => GeneratedShotPrompt[]

    // ---- Documentary Mode Actions ----
    setDocumentaryMode: (enabled: boolean) => void
    setDocumentaryChapters: (chapters: DocumentaryChapter[]) => void
    updateDocumentaryChapter: (index: number, updates: Partial<DocumentaryChapter>) => void
    updateChapterName: (index: number, name: string) => void
    setBrollPoolCategory: (chapterIndex: number, categoryId: string, updates: Partial<BRollPoolCategory>) => void
    updateBrollPromptStatus: (categoryId: string, promptId: string, updates: Partial<BRollPoolPrompt>) => void
    selectBrollVariant: (categoryId: string, promptId: string) => void
    updateTitleCard: (chapterIndex: number, updates: Partial<TitleCard>) => void
    setIsClassifyingSegments: (classifying: boolean) => void
    setIsGeneratingBrollPool: (generating: boolean) => void
    setIsGeneratingTitleCards: (generating: boolean) => void
    clearDocumentaryData: () => void

    // ---- UI Actions ----
    setInternalTab: (tab: StoryboardTab) => void
    setStoryText: (text: string) => void
    setSearchQuery: (query: string) => void
    setSelectedModel: (model: string) => void
    setPreviewCollapsed: (collapsed: boolean) => void
    togglePreviewCollapsed: () => void
    setViewMode: (mode: 'tabs' | 'canvas') => void

    // ---- Director Selection Actions ----
    setSelectedDirector: (directorId: string | null) => void

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

    // ---- Character Library Actions ----
    saveCharacterToLibrary: (id: string, tag: string, galleryId: string) => void
    removeCharacterFromLibrary: (id: string) => void

    // ---- Reset ----
    resetStoryboard: () => void

    // ---- Computed Getters ----
    getCharactersWithReferences: () => StoryboardCharacter[]
    getLocationsWithReferences: () => StoryboardLocation[]
    getSelectedShots: () => StoryboardShot[]
    getShotBySequence: (sequence: number) => StoryboardShot | undefined
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
    'selectedDirectorId',
    'internalTab',
    // New persisted fields
    'generationSettings',
    'globalPromptPrefix',
    'globalPromptSuffix',
    'shotNotes',
    'isDocumentaryMode'
] as const

export const useStoryboardStore = create<StoryboardStore>()(
    persist(
        (set, get) => ({
            ...createEntitySlice(set, get),
            ...createGenerationSlice(set, get),
            ...createDocumentarySlice(set, get),
            ...createUiSlice(set, get),
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
            // Reset internalTab if the data required for that tab is gone after hydration
            onRehydrateStorage: () => {
                return (state) => {
                    if (!state) return
                    const tab = state.internalTab
                    const hasPrompts = state.promptsGenerated && state.generatedPrompts.length > 0
                    const hasImages = Object.keys(state.generatedImages).length > 0

                    // gallery/generation tabs need data that isn't persisted
                    if (tab === 'gallery' && !hasImages) {
                        state.internalTab = hasPrompts ? 'generation' : 'input'
                    } else if (tab === 'generation' && !hasPrompts) {
                        state.internalTab = 'input'
                    } else if (tab === 'shots' && !state.storyText?.trim()) {
                        state.internalTab = 'input'
                    }
                }
            },
            // Custom storage with quota error handling
            storage: {
                getItem: (name) => {
                    try {
                        if (typeof window === 'undefined') return null
                        const str = localStorage.getItem(name)
                        return str ? JSON.parse(str) : null
                    } catch (e) {
                        logger.storyboard.warn('Failed to read from localStorage', { error: e instanceof Error ? e.message : String(e) })
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
                            logger.storyboard.warn('localStorage quota exceeded, attempting selective cleanup')

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
                                logger.storyboard.warn('Storage limit reached. Cleared regenerable data to preserve user work.')
                            } catch (retryError) {
                                // Last resort: try to clear completely and save minimal
                                logger.storyboard.error('Failed to save even after selective cleanup', { retryError: retryError })
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
                            logger.storyboard.warn('Failed to write to localStorage', { e: e })
                        }
                    }
                },
                removeItem: (name) => {
                    try {
                        if (typeof window === 'undefined') return
                        localStorage.removeItem(name)
                    } catch (e) {
                        logger.storyboard.warn('Failed to remove from localStorage', { error: e instanceof Error ? e.message : String(e) })
                    }
                }
            }
        }
    )
)
