import { create } from 'zustand'

export type GeneratorType = 'image' | 'video' | 'voice' | 'music'

export interface GenerationResult {
  type: GeneratorType
  url: string
  predictionId: string
  creditsUsed: number
  timestamp: number
  status: 'completed' | 'pending'
}

interface GenerationStoreState {
  activeGenerator: GeneratorType | null
  isGenerating: boolean
  error: string | null
  lastResult: GenerationResult | null
  recentResults: GenerationResult[]

  setActiveGenerator: (type: GeneratorType | null) => void
  generateImage: (params: { prompt: string; brandId?: string; brandBoost?: boolean; aspectRatio?: string }) => Promise<void>
  generateVideo: (params: { prompt: string; brandId?: string; brandBoost?: boolean; model?: string; duration?: number; imageUrl?: string }) => Promise<void>
  generateVoice: (params: { text: string; brandId?: string; brandBoost?: boolean; voiceId?: string }) => Promise<void>
  generateMusic: (params: { prompt: string; brandId?: string; brandBoost?: boolean; duration?: number; instrumental?: boolean }) => Promise<void>
  clearError: () => void
}

async function callAPI(endpoint: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Generation failed')
  return data
}

export const useGenerationStore = create<GenerationStoreState>((set) => ({
  activeGenerator: null,
  isGenerating: false,
  error: null,
  lastResult: null,
  recentResults: [],

  setActiveGenerator: (type) => set({ activeGenerator: type, error: null, lastResult: null }),

  generateImage: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const data = await callAPI('/api/brand-studio/generate/image', params)
      const result: GenerationResult = {
        type: 'image',
        url: data.url as string,
        predictionId: data.predictionId as string,
        creditsUsed: data.creditsUsed as number,
        timestamp: Date.now(),
        status: 'completed',
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  generateVideo: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const data = await callAPI('/api/brand-studio/generate/video', params)
      const result: GenerationResult = {
        type: 'video',
        url: '',
        predictionId: data.predictionId as string,
        creditsUsed: data.creditsUsed as number,
        timestamp: Date.now(),
        status: 'pending',
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  generateVoice: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const data = await callAPI('/api/brand-studio/generate/voice', params)
      const result: GenerationResult = {
        type: 'voice',
        url: data.url as string,
        predictionId: data.predictionId as string,
        creditsUsed: data.creditsUsed as number,
        timestamp: Date.now(),
        status: 'completed',
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  generateMusic: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const data = await callAPI('/api/brand-studio/generate/music', params)
      const result: GenerationResult = {
        type: 'music',
        url: data.url as string,
        predictionId: data.predictionId as string,
        creditsUsed: data.creditsUsed as number,
        timestamp: Date.now(),
        status: 'completed',
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  clearError: () => set({ error: null }),
}))
