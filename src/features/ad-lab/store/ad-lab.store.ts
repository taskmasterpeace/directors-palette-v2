/**
 * Ad Lab Store
 * Zustand store for the 5-phase video ad matrix workflow
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AdLabPhase,
  BriefAsset,
  CreativeMandate,
  AdPrompt,
  GradeScore,
  RefinementAttempt,
  GenerationJob,
  FormatInsights,
} from '../types/ad-lab.types'

interface AdLabState {
  // Phase navigation
  currentPhase: AdLabPhase
  completedPhases: AdLabPhase[]

  // Phase 1: Strategy
  briefText: string
  briefAssets: BriefAsset[]
  selectedModel: string
  mandate: CreativeMandate | null
  isParsingBrief: boolean

  // Phase 2: Execution
  prompts: AdPrompt[]
  isGeneratingMatrix: boolean

  // Phase 3: Quality
  grades: GradeScore[]
  formatInsights: FormatInsights | null
  isGrading: boolean

  // Phase 4: Refine
  refinementHistory: RefinementAttempt[]
  isRefining: boolean

  // Phase 5: Generate
  generationJobs: GenerationJob[]
  isGenerating: boolean

  // UI
  error: string | null

  // Actions - Navigation
  setPhase: (phase: AdLabPhase) => void
  completePhase: (phase: AdLabPhase) => void
  canNavigateTo: (phase: AdLabPhase) => boolean

  // Actions - Phase 1
  setBriefText: (text: string) => void
  addBriefAsset: (asset: BriefAsset) => void
  removeBriefAsset: (id: string) => void
  setSelectedModel: (model: string) => void
  setMandate: (mandate: CreativeMandate | null) => void
  setIsParsingBrief: (v: boolean) => void

  // Actions - Phase 2
  setPrompts: (prompts: AdPrompt[]) => void
  setIsGeneratingMatrix: (v: boolean) => void

  // Actions - Phase 3
  setGrades: (grades: GradeScore[]) => void
  setFormatInsights: (insights: FormatInsights | null) => void
  setIsGrading: (v: boolean) => void

  // Actions - Phase 4
  addRefinementAttempt: (attempt: RefinementAttempt) => void
  updatePromptAfterRefine: (promptId: string, revised: AdPrompt, grade: GradeScore) => void
  setIsRefining: (v: boolean) => void

  // Actions - Phase 5
  setGenerationJobs: (jobs: GenerationJob[]) => void
  updateGenerationJob: (promptId: string, update: Partial<GenerationJob>) => void
  setIsGenerating: (v: boolean) => void

  // Actions - UI
  setError: (error: string | null) => void
  reset: () => void
}

const PHASE_ORDER: AdLabPhase[] = ['strategy', 'execution', 'quality', 'refine', 'generate']

const initialState = {
  currentPhase: 'strategy' as AdLabPhase,
  completedPhases: [] as AdLabPhase[],
  briefText: '',
  briefAssets: [] as BriefAsset[],
  selectedModel: 'openai/gpt-4.1-mini',
  mandate: null as CreativeMandate | null,
  isParsingBrief: false,
  prompts: [] as AdPrompt[],
  isGeneratingMatrix: false,
  grades: [] as GradeScore[],
  formatInsights: null as FormatInsights | null,
  isGrading: false,
  refinementHistory: [] as RefinementAttempt[],
  isRefining: false,
  generationJobs: [] as GenerationJob[],
  isGenerating: false,
  error: null as string | null,
}

export const useAdLabStore = create<AdLabState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      setPhase: (phase) => set({ currentPhase: phase }),
      completePhase: (phase) => set((state) => ({
        completedPhases: state.completedPhases.includes(phase)
          ? state.completedPhases
          : [...state.completedPhases, phase]
      })),
      canNavigateTo: (phase) => {
        const state = get()
        const targetIndex = PHASE_ORDER.indexOf(phase)
        const currentIndex = PHASE_ORDER.indexOf(state.currentPhase)

        // Can always go back to completed phases
        if (targetIndex < currentIndex) return true

        // Gate logic per phase
        switch (phase) {
          case 'strategy': return true
          case 'execution': return !!state.mandate
          case 'quality': return state.prompts.length > 0
          case 'refine': return state.grades.length > 0 && state.grades.some(g => g.status === 'refine')
          case 'generate': return state.prompts.length > 0
          default: return false
        }
      },

      // Phase 1
      setBriefText: (text) => set({ briefText: text }),
      addBriefAsset: (asset) => set((state) => ({
        briefAssets: state.briefAssets.length < 3 ? [...state.briefAssets, asset] : state.briefAssets
      })),
      removeBriefAsset: (id) => set((state) => ({
        briefAssets: state.briefAssets.filter(a => a.id !== id)
      })),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setMandate: (mandate) => set({ mandate }),
      setIsParsingBrief: (v) => set({ isParsingBrief: v }),

      // Phase 2
      setPrompts: (prompts) => set({ prompts }),
      setIsGeneratingMatrix: (v) => set({ isGeneratingMatrix: v }),

      // Phase 3
      setGrades: (grades) => set({ grades }),
      setFormatInsights: (insights) => set({ formatInsights: insights }),
      setIsGrading: (v) => set({ isGrading: v }),

      // Phase 4
      addRefinementAttempt: (attempt) => set((state) => ({
        refinementHistory: [...state.refinementHistory, attempt]
      })),
      updatePromptAfterRefine: (promptId, revised, grade) => set((state) => ({
        prompts: state.prompts.map(p => p.id === promptId ? revised : p),
        grades: state.grades.map(g => g.promptId === promptId ? grade : g),
      })),
      setIsRefining: (v) => set({ isRefining: v }),

      // Phase 5
      setGenerationJobs: (jobs) => set({ generationJobs: jobs }),
      updateGenerationJob: (promptId, update) => set((state) => ({
        generationJobs: state.generationJobs.map(j =>
          j.promptId === promptId ? { ...j, ...update } : j
        )
      })),
      setIsGenerating: (v) => set({ isGenerating: v }),

      // UI
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'ad-lab-store',
      partialize: (state) => ({
        briefText: state.briefText,
        selectedModel: state.selectedModel,
        mandate: state.mandate,
        currentPhase: state.currentPhase,
        completedPhases: state.completedPhases,
      }),
    }
  )
)
