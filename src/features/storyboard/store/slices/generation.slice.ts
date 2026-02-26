import type { StoreApi } from 'zustand'
import type { StoryboardStore } from '../storyboard.store'
import type {
    BRollShot,
    ContactSheetVariant,
    StoryboardGenerationQueue,
    LLMSettings,
    BreakdownLevel,
    ShotBreakdownResult,
    ExtractionResult,
    GeneratedShotPrompt,
    GeneratedImageData,
} from '../../types/storyboard.types'

type Set = StoreApi<StoryboardStore>['setState']
type Get = StoreApi<StoryboardStore>['getState']

// Initial state for generation slice
export const generationInitialState = {
    brollShots: [] as BRollShot[],
    loadingBroll: false,
    brollModalOpen: false,
    brollShotSequence: null as number | null,
    brollReferenceUrl: null as string | null,

    contactSheetModalOpen: false,
    contactSheetShotId: null as string | null,
    contactSheetVariants: [] as ContactSheetVariant[],
    loadingContactSheet: false,

    currentQueue: null as StoryboardGenerationQueue | null,
    loadingQueue: false,

    llmSettings: null as LLMSettings | null,
    loadingLLMSettings: false,

    breakdownLevel: 2 as BreakdownLevel,
    breakdownResult: null as ShotBreakdownResult | null,

    generatedPrompts: [] as GeneratedShotPrompt[],
    isGeneratingPrompts: false,
    promptsGenerated: false,

    extractionResult: null as ExtractionResult | null,
    isExtracting: false,

    generatedImages: {} as Record<number, GeneratedImageData>,
}

export const createGenerationSlice = (set: Set, _get: Get) => ({
    ...generationInitialState,

    // ---- B-Roll Actions ----
    setBRollShots: (shots: BRollShot[]) => set({ brollShots: shots }),
    addBRollShot: (shot: BRollShot) => set((state) => ({
        brollShots: [...state.brollShots, shot]
    })),
    updateBRollShot: (id: string, updates: Partial<BRollShot>) => set((state) => ({
        brollShots: state.brollShots.map((s) =>
            s.id === id ? { ...s, ...updates } : s
        )
    })),
    deleteBRollShot: (id: string) => set((state) => ({
        brollShots: state.brollShots.filter((s) => s.id !== id)
    })),
    setLoadingBroll: (loading: boolean) => set({ loadingBroll: loading }),
    openBRollModal: (sequence: number, referenceUrl: string) => set({
        brollModalOpen: true,
        brollShotSequence: sequence,
        brollReferenceUrl: referenceUrl
    }),
    closeBRollModal: () => set({
        brollModalOpen: false,
        brollShotSequence: null,
        brollReferenceUrl: null
    }),

    // ---- Contact Sheet Actions ----
    openContactSheetModal: (shotId: string) => set({
        contactSheetModalOpen: true,
        contactSheetShotId: shotId
    }),
    closeContactSheetModal: () => set({
        contactSheetModalOpen: false,
        contactSheetShotId: null,
        contactSheetVariants: []
    }),
    setContactSheetVariants: (variants: ContactSheetVariant[]) => set({ contactSheetVariants: variants }),
    updateContactSheetVariant: (id: string, updates: Partial<ContactSheetVariant>) => set((state) => ({
        contactSheetVariants: state.contactSheetVariants.map((v) =>
            v.id === id ? { ...v, ...updates } : v
        )
    })),
    setLoadingContactSheet: (loading: boolean) => set({ loadingContactSheet: loading }),

    // ---- Queue Actions ----
    setCurrentQueue: (queue: StoryboardGenerationQueue | null) => set({ currentQueue: queue }),
    updateQueueProgress: (progress: number, currentIndex: number) => set((state) => ({
        currentQueue: state.currentQueue
            ? { ...state.currentQueue, progress, current_shot_index: currentIndex }
            : null
    })),
    setLoadingQueue: (loading: boolean) => set({ loadingQueue: loading }),

    // ---- LLM Settings Actions ----
    setLLMSettings: (settings: LLMSettings | null) => set({ llmSettings: settings }),
    setLoadingLLMSettings: (loading: boolean) => set({ loadingLLMSettings: loading }),

    // ---- Shot Breakdown Actions ----
    setBreakdownLevel: (level: BreakdownLevel) => set({ breakdownLevel: level }),
    setBreakdownResult: (result: ShotBreakdownResult | null) => set({ breakdownResult: result }),

    // ---- Generated Prompts Actions ----
    setGeneratedPrompts: (prompts: GeneratedShotPrompt[]) => set({
        generatedPrompts: prompts,
        promptsGenerated: prompts.length > 0
    }),
    addGeneratedPrompts: (prompts: GeneratedShotPrompt[]) => set((state) => {
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
    updateGeneratedPrompt: (sequence: number, prompt: string) => set((state) => ({
        generatedPrompts: state.generatedPrompts.map((p) =>
            p.sequence === sequence ? { ...p, prompt, edited: true } : p
        )
    })),
    updateGeneratedShot: (sequence: number, updates: Partial<GeneratedShotPrompt>) => set((state) => ({
        generatedPrompts: state.generatedPrompts.map((p) =>
            p.sequence === sequence ? { ...p, ...updates } : p
        )
    })),
    updateGeneratedPromptMetadata: (sequence: number, metadata: Partial<GeneratedShotPrompt['metadata']>) => set((state) => ({
        generatedPrompts: state.generatedPrompts.map((p) =>
            p.sequence === sequence ? { ...p, metadata: { ...p.metadata, ...metadata } } : p
        )
    })),
    clearGeneratedPrompts: () => set({
        generatedPrompts: [],
        promptsGenerated: false
    }),
    setIsGeneratingPrompts: (generating: boolean) => set({ isGeneratingPrompts: generating }),

    // ---- Extraction Actions ----
    setExtractionResult: (result: ExtractionResult | null) => set({ extractionResult: result }),
    setIsExtracting: (extracting: boolean) => set({ isExtracting: extracting }),

    // ---- Generated Images Actions ----
    setGeneratedImage: (shotNumber: number, data: GeneratedImageData) => set((state) => ({
        generatedImages: { ...state.generatedImages, [shotNumber]: data }
    })),
    updateGeneratedImageStatus: (shotNumber: number, status: 'pending' | 'generating' | 'completed' | 'failed', imageUrl?: string, error?: string) => set((state) => ({
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

    // ---- Video/Animation Actions ----
    setVideoStatus: (sequence: number, status: 'idle' | 'generating' | 'completed' | 'failed', videoUrl?: string, error?: string) => set((state) => ({
        generatedImages: {
            ...state.generatedImages,
            [sequence]: {
                ...state.generatedImages[sequence],
                videoStatus: status,
                ...(videoUrl !== undefined && { videoUrl }),
                ...(error !== undefined && { videoError: error })
            }
        }
    })),
    setAnimationPrompt: (sequence: number, prompt: string) => set((state) => ({
        generatedImages: {
            ...state.generatedImages,
            [sequence]: {
                ...state.generatedImages[sequence],
                animationPrompt: prompt
            }
        }
    })),
})
