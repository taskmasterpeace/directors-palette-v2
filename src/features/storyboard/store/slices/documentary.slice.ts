import type { StoreApi } from 'zustand'
import type { StoryboardStore } from '../storyboard.store'
import type {
    BRollPoolCategory,
    BRollPoolPrompt,
    TitleCard,
    DocumentaryChapter,
} from '../../types/storyboard.types'
import type { StoryChapter, ChapterDetectionResult } from '../../services/chapter-detection.service'
import type { GeneratedShotPrompt } from '../../types/storyboard.types'

type Set = StoreApi<StoryboardStore>['setState']
type Get = StoreApi<StoryboardStore>['getState']

// Initial state for documentary slice
export const documentaryInitialState = {
    chapters: [] as StoryChapter[],
    activeChapterIndex: 0,
    shouldShowChapters: false,
    chapterDetectionReason: '',

    isDocumentaryMode: false,
    documentaryChapters: [] as DocumentaryChapter[],
    isClassifyingSegments: false,
    isGeneratingBrollPool: false,
    isGeneratingTitleCards: false,
}

export const createDocumentarySlice = (set: Set, get: Get) => ({
    ...documentaryInitialState,

    // ---- Chapter Actions ----
    setChapters: (result: ChapterDetectionResult) => set({
        chapters: result.chapters,
        shouldShowChapters: result.shouldChapter,
        chapterDetectionReason: result.reason,
        activeChapterIndex: 0
    }),
    setActiveChapter: (index: number) => set({ activeChapterIndex: index }),
    clearChapters: () => set({
        chapters: [],
        shouldShowChapters: false,
        chapterDetectionReason: '',
        activeChapterIndex: 0
    }),
    getChapterSegments: (chapterIndex: number): GeneratedShotPrompt[] => {
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

    // ---- Documentary Mode Actions ----
    setDocumentaryMode: (enabled: boolean) => set({ isDocumentaryMode: enabled }),

    setDocumentaryChapters: (chapters: DocumentaryChapter[]) => set({ documentaryChapters: chapters }),

    updateDocumentaryChapter: (index: number, updates: Partial<DocumentaryChapter>) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === index ? { ...ch, ...updates } : ch
        ),
    })),

    updateChapterName: (index: number, name: string) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === index ? { ...ch, name, nameEdited: true } : ch
        ),
    })),

    setBrollPoolCategory: (chapterIndex: number, categoryId: string, updates: Partial<BRollPoolCategory>) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === chapterIndex
                ? {
                    ...ch,
                    brollPool: ch.brollPool.map((cat) =>
                        cat.id === categoryId ? { ...cat, ...updates } : cat
                    ),
                }
                : ch
        ),
    })),

    updateBrollPromptStatus: (categoryId: string, promptId: string, updates: Partial<BRollPoolPrompt>) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) => ({
            ...ch,
            brollPool: ch.brollPool.map((cat) =>
                cat.id === categoryId
                    ? {
                        ...cat,
                        prompts: cat.prompts.map((p) =>
                            p.id === promptId ? { ...p, ...updates } : p
                        ),
                    }
                    : cat
            ),
        })),
    })),

    selectBrollVariant: (categoryId: string, promptId: string) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) => ({
            ...ch,
            brollPool: ch.brollPool.map((cat) =>
                cat.id === categoryId
                    ? {
                        ...cat,
                        prompts: cat.prompts.map((p) => ({
                            ...p,
                            selected: p.id === promptId,
                        })),
                    }
                    : cat
            ),
        })),
    })),

    updateTitleCard: (chapterIndex: number, updates: Partial<TitleCard>) => set((state) => ({
        documentaryChapters: state.documentaryChapters.map((ch) =>
            ch.index === chapterIndex
                ? { ...ch, titleCard: { ...ch.titleCard, ...updates } }
                : ch
        ),
    })),

    setIsClassifyingSegments: (classifying: boolean) => set({ isClassifyingSegments: classifying }),
    setIsGeneratingBrollPool: (generating: boolean) => set({ isGeneratingBrollPool: generating }),
    setIsGeneratingTitleCards: (generating: boolean) => set({ isGeneratingTitleCards: generating }),

    clearDocumentaryData: () => set({
        documentaryChapters: [],
        isClassifyingSegments: false,
        isGeneratingBrollPool: false,
        isGeneratingTitleCards: false,
    }),
})
