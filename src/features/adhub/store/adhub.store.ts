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
  AdhubModel,
  RiverflowSettings,
  AdhubVideoAdConfig,
  AdhubVideoAudioSource,
  AdhubLipSyncModel,
  AdhubLipSyncResolution,
} from '../types/adhub.types'

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '4:3'

export const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; description: string }[] = [
  { value: '1:1', label: 'Square', description: 'Instagram post' },
  { value: '4:5', label: 'Portrait', description: 'Instagram feed' },
  { value: '9:16', label: 'Story', description: 'Reels, TikTok' },
  { value: '16:9', label: 'Landscape', description: 'YouTube, Twitter' },
  { value: '4:3', label: 'Classic', description: 'Traditional' },
]

interface AdhubState extends AdhubWizardState {
  // Brand management
  brands: AdhubBrand[]
  selectedBrandImages: AdhubBrandImage[]

  // Template management
  templates: AdhubTemplate[]

  // Style management
  styles: AdhubStyle[]

  // Generation settings
  aspectRatio: AspectRatio
  selectedModel: AdhubModel

  // Riverflow-specific state
  riverflowSourceImages: string[]    // init_images (product photos)
  riverflowDetailRefs: string[]      // super_resolution_refs (logo cleanup)
  riverflowFontUrls: string[]        // uploaded font URLs
  riverflowFontTexts: string[]       // text for each font (max 300 chars)
  riverflowSettings: RiverflowSettings

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

  // Actions - Generation Settings
  setAspectRatio: (ratio: AspectRatio) => void
  setSelectedModel: (model: AdhubModel) => void

  // Actions - Riverflow
  setRiverflowSourceImages: (images: string[]) => void
  addRiverflowSourceImage: (url: string) => void
  removeRiverflowSourceImage: (url: string) => void
  setRiverflowDetailRefs: (refs: string[]) => void
  addRiverflowDetailRef: (url: string) => void
  removeRiverflowDetailRef: (url: string) => void
  addRiverflowFont: (url: string, text: string) => void
  removeRiverflowFont: (index: number) => void
  updateRiverflowFontText: (index: number, text: string) => void
  setRiverflowSettings: (settings: Partial<RiverflowSettings>) => void
  clearRiverflowInputs: () => void

  // Actions - Generation
  setIsGenerating: (generating: boolean) => void
  setGenerationResult: (result: AdhubGenerationResult | undefined) => void
  setError: (error: string | undefined) => void

  // Actions - Video Ad (Lip-Sync)
  videoAdConfig: AdhubVideoAdConfig
  setVideoAdEnabled: (enabled: boolean) => void
  setSpokespersonImage: (url: string | null, file?: File | null) => void
  setVideoAudioSource: (source: AdhubVideoAudioSource) => void
  setUploadedAudio: (url: string | null, duration: number | null, file?: File | null) => void
  setTtsScript: (script: string) => void
  setTtsVoiceId: (voiceId: string) => void
  setGeneratedTtsAudio: (url: string | null, duration: number | null) => void
  setLipSyncModel: (model: AdhubLipSyncModel) => void
  setLipSyncResolution: (resolution: AdhubLipSyncResolution) => void
  setLipSyncGenerating: (generating: boolean) => void
  setLipSyncResult: (predictionId: string | null, galleryId: string | null, videoUrl: string | null, error?: string | null) => void
  resetVideoAdConfig: () => void

  // Actions - Reset
  reset: () => void
  resetToStep: (step: AdhubStep) => void
}

const STEP_ORDER: AdhubStep[] = ['brand', 'template', 'style', 'fill', 'talk', 'result']

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

const DEFAULT_RIVERFLOW_SETTINGS: RiverflowSettings = {
  resolution: '2K',
  transparency: false,
  enhancePrompt: true,
  maxIterations: 3,
}

const DEFAULT_VIDEO_AD_CONFIG: AdhubVideoAdConfig = {
  enabled: false,
  spokespersonImageUrl: null,
  spokespersonImageFile: undefined,
  audioSource: 'tts',
  uploadedAudioUrl: null,
  uploadedAudioFile: undefined,
  ttsScript: '',
  ttsVoiceId: 'rachel',
  generatedTtsAudioUrl: null,
  audioDurationSeconds: null,
  modelSettings: {
    model: 'kling-avatar-v2-standard',
    resolution: '720p',
  },
  isGenerating: false,
  lipSyncPredictionId: null,
  lipSyncGalleryId: null,
  lipSyncVideoUrl: null,
  lipSyncError: null,
}

const initialState: Omit<AdhubState,
  'setStep' | 'nextStep' | 'previousStep' |
  'setBrands' | 'selectBrand' | 'setBrandImages' |
  'setTemplates' | 'selectTemplate' |
  'setStyles' | 'selectStyle' |
  'setFieldValue' | 'setFieldValues' | 'clearFieldValues' |
  'toggleReferenceImage' | 'setSelectedReferenceImages' | 'clearSelectedReferenceImages' |
  'setAspectRatio' | 'setSelectedModel' |
  'setRiverflowSourceImages' | 'addRiverflowSourceImage' | 'removeRiverflowSourceImage' |
  'setRiverflowDetailRefs' | 'addRiverflowDetailRef' | 'removeRiverflowDetailRef' |
  'addRiverflowFont' | 'removeRiverflowFont' | 'updateRiverflowFontText' |
  'setRiverflowSettings' | 'clearRiverflowInputs' |
  'setIsGenerating' | 'setGenerationResult' | 'setError' |
  'setVideoAdEnabled' | 'setSpokespersonImage' | 'setVideoAudioSource' |
  'setUploadedAudio' | 'setTtsScript' | 'setTtsVoiceId' |
  'setGeneratedTtsAudio' | 'setLipSyncModel' | 'setLipSyncResolution' |
  'setLipSyncGenerating' | 'setLipSyncResult' | 'resetVideoAdConfig' |
  'reset' | 'resetToStep'
> = {
  currentStep: 'brand',
  selectedBrand: undefined,
  selectedTemplate: undefined,
  selectedStyle: undefined,
  fieldValues: {},
  selectedReferenceImages: [],
  aspectRatio: '1:1',
  selectedModel: 'nano-banana-pro',
  isGenerating: false,
  generationResult: undefined,
  error: undefined,

  brands: [],
  selectedBrandImages: [],
  templates: [],
  styles: [],

  // Riverflow state
  riverflowSourceImages: [],
  riverflowDetailRefs: [],
  riverflowFontUrls: [],
  riverflowFontTexts: [],
  riverflowSettings: DEFAULT_RIVERFLOW_SETTINGS,

  // Video Ad (Lip-Sync) state
  videoAdConfig: DEFAULT_VIDEO_AD_CONFIG,
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

      // Generation Settings
      setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
      setSelectedModel: (model) => set({ selectedModel: model }),

      // Riverflow actions
      setRiverflowSourceImages: (images) => set({ riverflowSourceImages: images }),

      addRiverflowSourceImage: (url) => set((state) => ({
        riverflowSourceImages: state.riverflowSourceImages.length < 10
          ? [...state.riverflowSourceImages, url]
          : state.riverflowSourceImages,
      })),

      removeRiverflowSourceImage: (url) => set((state) => ({
        riverflowSourceImages: state.riverflowSourceImages.filter((img) => img !== url),
      })),

      setRiverflowDetailRefs: (refs) => set({ riverflowDetailRefs: refs }),

      addRiverflowDetailRef: (url) => set((state) => ({
        riverflowDetailRefs: state.riverflowDetailRefs.length < 4
          ? [...state.riverflowDetailRefs, url]
          : state.riverflowDetailRefs,
      })),

      removeRiverflowDetailRef: (url) => set((state) => ({
        riverflowDetailRefs: state.riverflowDetailRefs.filter((ref) => ref !== url),
      })),

      addRiverflowFont: (url, text) => set((state) => ({
        riverflowFontUrls: state.riverflowFontUrls.length < 2
          ? [...state.riverflowFontUrls, url]
          : state.riverflowFontUrls,
        riverflowFontTexts: state.riverflowFontTexts.length < 2
          ? [...state.riverflowFontTexts, text]
          : state.riverflowFontTexts,
      })),

      removeRiverflowFont: (index) => set((state) => ({
        riverflowFontUrls: state.riverflowFontUrls.filter((_, i) => i !== index),
        riverflowFontTexts: state.riverflowFontTexts.filter((_, i) => i !== index),
      })),

      updateRiverflowFontText: (index, text) => set((state) => ({
        riverflowFontTexts: state.riverflowFontTexts.map((t, i) => i === index ? text : t),
      })),

      setRiverflowSettings: (settings) => set((state) => ({
        riverflowSettings: { ...state.riverflowSettings, ...settings },
      })),

      clearRiverflowInputs: () => set({
        riverflowSourceImages: [],
        riverflowDetailRefs: [],
        riverflowFontUrls: [],
        riverflowFontTexts: [],
        riverflowSettings: DEFAULT_RIVERFLOW_SETTINGS,
      }),

      // Generation
      setIsGenerating: (generating) => set({ isGenerating: generating }),

      setGenerationResult: (result) => set({
        generationResult: result,
        currentStep: result ? 'result' : get().currentStep,
      }),

      setError: (error) => set({ error }),

      // Video Ad (Lip-Sync) actions
      setVideoAdEnabled: (enabled) => set((state) => ({
        videoAdConfig: { ...state.videoAdConfig, enabled },
      })),

      setSpokespersonImage: (url, file = undefined) => set((state) => ({
        videoAdConfig: {
          ...state.videoAdConfig,
          spokespersonImageUrl: url,
          spokespersonImageFile: file,
        },
      })),

      setVideoAudioSource: (source) => set((state) => ({
        videoAdConfig: { ...state.videoAdConfig, audioSource: source },
      })),

      setUploadedAudio: (url, duration, file = undefined) => set((state) => ({
        videoAdConfig: {
          ...state.videoAdConfig,
          uploadedAudioUrl: url,
          uploadedAudioFile: file,
          audioDurationSeconds: duration,
        },
      })),

      setTtsScript: (script) => set((state) => ({
        videoAdConfig: { ...state.videoAdConfig, ttsScript: script },
      })),

      setTtsVoiceId: (voiceId) => set((state) => ({
        videoAdConfig: { ...state.videoAdConfig, ttsVoiceId: voiceId },
      })),

      setGeneratedTtsAudio: (url, duration) => set((state) => ({
        videoAdConfig: {
          ...state.videoAdConfig,
          generatedTtsAudioUrl: url,
          audioDurationSeconds: duration,
        },
      })),

      setLipSyncModel: (model) => set((state) => ({
        videoAdConfig: {
          ...state.videoAdConfig,
          modelSettings: { ...state.videoAdConfig.modelSettings, model },
        },
      })),

      setLipSyncResolution: (resolution) => set((state) => ({
        videoAdConfig: {
          ...state.videoAdConfig,
          modelSettings: { ...state.videoAdConfig.modelSettings, resolution },
        },
      })),

      setLipSyncGenerating: (generating) => set((state) => ({
        videoAdConfig: { ...state.videoAdConfig, isGenerating: generating },
      })),

      setLipSyncResult: (predictionId, galleryId, videoUrl, error = null) => set((state) => ({
        videoAdConfig: {
          ...state.videoAdConfig,
          lipSyncPredictionId: predictionId,
          lipSyncGalleryId: galleryId,
          lipSyncVideoUrl: videoUrl,
          lipSyncError: error,
          isGenerating: false,
        },
      })),

      resetVideoAdConfig: () => set({ videoAdConfig: DEFAULT_VIDEO_AD_CONFIG }),

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
        aspectRatio: state.aspectRatio,
        selectedModel: state.selectedModel,
        // Persist video ad config without file objects
        videoAdConfig: {
          ...state.videoAdConfig,
          spokespersonImageFile: undefined,
          uploadedAudioFile: undefined,
        },
        // Don't persist Riverflow inputs (large URLs)
      }),
    }
  )
)
