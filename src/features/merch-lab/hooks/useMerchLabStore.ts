import { create } from 'zustand'
import type { MerchLabState, GeneratedDesign, ShippingAddress, DesignStyle, PrintifyVariant } from '../types'

const initialOrderState = {
  selectedSize: null as string | null,
  quantity: 1,
  shippingAddress: null as ShippingAddress | null,
  pricePts: null as number | null,
  printifyProductId: null as string | null,
  printifyOrderId: null as string | null,
  isOrdering: false,
  orderModalOpen: false,
  orderModalStep: 'shipping' as MerchLabState['orderModalStep'],
}

export const useMerchLabStore = create<MerchLabState>((set) => ({
  // Product selection
  selectedProductId: 12,
  selectedColor: null,
  selectedColorHex: null,
  designStyle: 'center' as DesignStyle,

  // Design
  prompt: '',
  generatedDesigns: [] as GeneratedDesign[],
  activeDesignIndex: 0,
  designPosition: { x: 0.5, y: 0.5, scale: 1 },

  // Catalog
  variants: [] as PrintifyVariant[],
  isLoadingCatalog: false,

  // Order
  ...initialOrderState,

  // UI
  isGenerating: false,
  mockupView: 'front' as const,
  error: null,

  // Actions
  setProduct: (id) => set({ selectedProductId: id, selectedColor: null, selectedColorHex: null, selectedSize: null, variants: [] }),
  setColor: (color, hex) => set({ selectedColor: color, selectedColorHex: hex }),
  setDesignStyle: (style) => set({ designStyle: style }),
  setPrompt: (prompt) => set({ prompt }),
  addDesign: (design) => set((s) => ({ generatedDesigns: [design, ...s.generatedDesigns], activeDesignIndex: 0 })),
  setActiveDesignIndex: (index) => set({ activeDesignIndex: index }),
  setDesignPosition: (pos) => set({ designPosition: pos }),
  setSize: (size) => set({ selectedSize: size }),
  setQuantity: (qty) => set({ quantity: Math.max(1, Math.min(25, qty)) }),
  setShippingAddress: (addr) => set({ shippingAddress: addr }),
  setPricePts: (pts) => set({ pricePts: pts }),
  setVariants: (variants) => set({ variants, isLoadingCatalog: false }),
  setIsLoadingCatalog: (loading) => set({ isLoadingCatalog: loading }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setIsOrdering: (ordering) => set({ isOrdering: ordering }),
  setMockupView: (view) => set({ mockupView: view }),
  setOrderModalOpen: (open) => set({ orderModalOpen: open }),
  setOrderModalStep: (step) => set({ orderModalStep: step }),
  setPrintifyProductId: (id) => set({ printifyProductId: id }),
  setPrintifyOrderId: (id) => set({ printifyOrderId: id }),
  setError: (error) => set({ error }),
  resetOrder: () => set(initialOrderState),
}))
