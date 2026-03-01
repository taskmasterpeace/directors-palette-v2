import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Brand, BrandStudioTab } from '../types'
import * as api from '../services/brand-studio-api'

interface BrandStoreState {
  // Data
  brands: Brand[]
  activeBrandId: string | null
  activeTab: BrandStudioTab

  // Loading states
  isLoadingBrands: boolean
  isGeneratingGuide: boolean
  isSaving: boolean

  // Actions
  setActiveTab: (tab: BrandStudioTab) => void
  setActiveBrandId: (id: string | null) => void
  loadBrands: () => Promise<void>
  createBrand: (name: string, logoUrl?: string, companyInfo?: string) => Promise<Brand>
  updateBrand: (data: Partial<Brand> & { id: string }) => Promise<void>
  generateBrandGuide: (brandId: string, logoUrl: string | null, description: string) => Promise<void>
}

export const useBrandStore = create<BrandStoreState>()(
  persist(
    (set, get) => ({
      brands: [],
      activeBrandId: null,
      activeTab: 'brand',
      isLoadingBrands: false,
      isGeneratingGuide: false,
      isSaving: false,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveBrandId: (id) => set({ activeBrandId: id }),

      loadBrands: async () => {
        set({ isLoadingBrands: true })
        try {
          const brands = await api.fetchBrands()
          const state = get()
          set({
            brands,
            // Auto-select first brand if none selected
            activeBrandId: state.activeBrandId && brands.some(b => b.id === state.activeBrandId)
              ? state.activeBrandId
              : brands[0]?.id ?? null,
          })
        } finally {
          set({ isLoadingBrands: false })
        }
      },

      createBrand: async (name, logoUrl, companyInfo) => {
        const brand = await api.createBrand({
          name,
          logo_url: logoUrl,
          raw_company_info: companyInfo,
        })
        set((state) => ({
          brands: [brand, ...state.brands],
          activeBrandId: brand.id,
        }))
        return brand
      },

      updateBrand: async (data) => {
        set({ isSaving: true })
        try {
          const updated = await api.updateBrand(data)
          set((state) => ({
            brands: state.brands.map(b => b.id === updated.id ? updated : b),
          }))
        } finally {
          set({ isSaving: false })
        }
      },

      generateBrandGuide: async (brandId, logoUrl, description) => {
        set({ isGeneratingGuide: true })
        try {
          const updated = await api.generateBrandGuide({
            brand_id: brandId,
            logo_url: logoUrl,
            company_description: description,
          })
          set((state) => ({
            brands: state.brands.map(b => b.id === updated.id ? updated : b),
          }))
        } finally {
          set({ isGeneratingGuide: false })
        }
      },
    }),
    {
      name: 'brand-studio-storage',
      partialize: (state) => ({
        activeBrandId: state.activeBrandId,
        activeTab: state.activeTab,
      }),
    }
  )
)

// Selector for active brand
export function useActiveBrand(): Brand | null {
  const brands = useBrandStore(s => s.brands)
  const activeBrandId = useBrandStore(s => s.activeBrandId)
  return brands.find(b => b.id === activeBrandId) ?? null
}
