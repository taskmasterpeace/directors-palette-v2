/**
 * Adhub Store
 * Zustand store for managing adhub wizard state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AdhubStep,
  AdhubWizardState,
  AdhubBrand,
  AdhubBrandImage,
  AdhubTemplate,
  AdhubStyle,
  AdhubGenerationResult,
} from '../types/adhub.types'

interface AdhubState extends AdhubWizardState {
  // Brand management
  brands: AdhubBrand[]
  selectedBrandImages: AdhubBrandImage[]

  // Template management
  templates: AdhubTemplate[]

  // Style management
  styles: AdhubStyle[]

  // Actions - Navigation
  setStep: (step: AdhubStep) => void
  nextStep: () => void
  previousStep: () => void

  // Actions - Brand
  setBrands: (brands: AdhubBrand[]) => void
  selectBrand: (brand: AdhubBrand | undefined) => void
  setBrandImages: (images: AdhubBrandImage[]) => void

  // Actions - Template
  setTemplates: (templates: AdhubTemplate[]) => void
  selectTemplate: (template: AdhubTemplate | undefined) => void

  // Actions - Style
  setStyles: (styles: AdhubStyle[]) => void
  selectStyle: (style: AdhubStyle | undefined) => void

  // Actions - Field Values
  setFieldValue: (fieldName: string, value: string) => void
  setFieldValues: (values: Record<string, string>) => void
  clearFieldValues: () => void

  // Actions - Reference Images
  toggleReferenceImage: (imageUrl: string) => void
  setSelectedReferenceImages: (images: string[]) => void
  clearSelectedReferenceImages: () => void

  // Actions - Generation
  setIsGenerating: (generating: boolean) => void
  setGenerationResult: (result: AdhubGenerationResult | undefined) => void
  setError: (error: string | undefined) => void

  // Actions - Reset
  reset: () => void
  resetToStep: (step: AdhubStep) => void
}

const STEP_ORDER: AdhubStep[] = ['brand', 'template', 'style', 'fill', 'result']

const getNextStep = (current: AdhubStep): AdhubStep | null => {
  const index = STEP_ORDER.indexOf(current)
  if (index < STEP_ORDER.length - 1) {
    return STEP_ORDER[index + 1]
  }
  return null
}

const getPreviousStep = (current: AdhubStep): AdhubStep | null => {
  const index = STEP_ORDER.indexOf(current)
  if (index > 0) {
    return STEP_ORDER[index - 1]
  }
  return null
}

const initialState: Omit<AdhubState,
  'setStep' | 'nextStep' | 'previousStep' |
  'setBrands' | 'selectBrand' | 'setBrandImages' |
  'setTemplates' | 'selectTemplate' |
  'setStyles' | 'selectStyle' |
  'setFieldValue' | 'setFieldValues' | 'clearFieldValues' |
  'toggleReferenceImage' | 'setSelectedReferenceImages' | 'clearSelectedReferenceImages' |
  'setIsGenerating' | 'setGenerationResult' | 'setError' |
  'reset' | 'resetToStep'
> = {
  currentStep: 'brand',
  selectedBrand: undefined,
  selectedTemplate: undefined,
  selectedStyle: undefined,
  fieldValues: {},
  selectedReferenceImages: [],
  isGenerating: false,
  generationResult: undefined,
  error: undefined,

  brands: [],
  selectedBrandImages: [],
  templates: [],
  styles: [],
}

export const useAdhubStore = create<AdhubState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const current = get().currentStep
        const next = getNextStep(current)
        if (next) {
          set({ currentStep: next })
        }
      },

      previousStep: () => {
        const current = get().currentStep
        const prev = getPreviousStep(current)
        if (prev) {
          set({ currentStep: prev })
        }
      },

      // Brand
      setBrands: (brands) => set({ brands }),

      selectBrand: (brand) => set({
        selectedBrand: brand,
        selectedBrandImages: [],
        selectedReferenceImages: [],
      }),

      setBrandImages: (images) => set({ selectedBrandImages: images }),

      // Template
      setTemplates: (templates) => set({ templates }),

      selectTemplate: (template) => set({
        selectedTemplate: template,
        fieldValues: {},
      }),

      // Style
      setStyles: (styles) => set({ styles }),

      selectStyle: (style) => set({ selectedStyle: style }),

      // Field Values
      setFieldValue: (fieldName, value) => set((state) => ({
        fieldValues: {
          ...state.fieldValues,
          [fieldName]: value,
        },
      })),

      setFieldValues: (values) => set({ fieldValues: values }),

      clearFieldValues: () => set({ fieldValues: {} }),

      // Reference Images
      toggleReferenceImage: (imageUrl) => set((state) => {
        const current = state.selectedReferenceImages
        if (current.includes(imageUrl)) {
          return { selectedReferenceImages: current.filter((url) => url !== imageUrl) }
        } else {
          return { selectedReferenceImages: [...current, imageUrl] }
        }
      }),

      setSelectedReferenceImages: (images) => set({ selectedReferenceImages: images }),

      clearSelectedReferenceImages: () => set({ selectedReferenceImages: [] }),

      // Generation
      setIsGenerating: (generating) => set({ isGenerating: generating }),

      setGenerationResult: (result) => set({
        generationResult: result,
        currentStep: result ? 'result' : get().currentStep,
      }),

      setError: (error) => set({ error }),

      // Reset
      reset: () => set(initialState),

      resetToStep: (step) => {
        const stepIndex = STEP_ORDER.indexOf(step)
        set({
          currentStep: step,
          // Clear selections after the target step
          ...(stepIndex <= 0 && {
            selectedBrand: undefined,
            selectedBrandImages: [],
            selectedReferenceImages: [],
          }),
          ...(stepIndex <= 1 && {
            selectedTemplate: undefined,
            fieldValues: {},
          }),
          ...(stepIndex <= 2 && {
            selectedStyle: undefined,
          }),
          ...(stepIndex <= 3 && {
            generationResult: undefined,
          }),
          error: undefined,
        })
      },
    }),
    {
      name: 'adhub-store',
      partialize: (state) => ({
        // Only persist essential state, not lists
        currentStep: state.currentStep,
        selectedBrand: state.selectedBrand,
        selectedTemplate: state.selectedTemplate,
        selectedStyle: state.selectedStyle,
        fieldValues: state.fieldValues,
        selectedReferenceImages: state.selectedReferenceImages,
      }),
    }
  )
)
