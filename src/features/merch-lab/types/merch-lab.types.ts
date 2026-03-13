export interface PrintifyProduct {
  blueprintId: number
  name: string
  icon: string
  category: 'apparel' | 'accessory' | 'drinkware' | 'sticker'
  designStyles: DesignStyle[]
  hasSizes: boolean
  hasFrontBack: boolean
}

export type DesignStyle = 'center' | 'all-over' | 'left-chest' | 'back' | 'wrap'
export type QualityTier = 'turbo' | 'balanced' | 'quality'
export type DesignModel = 'ideogram' | 'nano-banana'

export interface PrintifyVariant {
  id: number
  title: string
  color: string
  colorHex: string
  size: string
  price: number
}

export interface PrintifyProvider {
  id: number
  title: string
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
}

export interface GeneratedDesign {
  id: string
  url: string
  prompt: string
  createdAt: number
}

export interface MerchLabState {
  // Product selection
  selectedProductId: number | null
  selectedColor: string | null
  selectedColorHex: string | null
  designStyle: DesignStyle

  // Design
  prompt: string
  designColors: string[]
  designModel: DesignModel
  qualityTier: QualityTier
  batchCount: 1 | 3 | 5
  generatedDesigns: GeneratedDesign[]
  activeDesignIndex: number
  designPosition: { x: number; y: number; scale: number }

  // Order
  selectedSize: string | null
  quantity: number
  shippingAddress: ShippingAddress | null
  pricePts: number | null

  // Printify
  printifyProductId: string | null
  printifyOrderId: string | null

  // Catalog
  variants: PrintifyVariant[]
  isLoadingCatalog: boolean

  // UI
  isGenerating: boolean
  isOrdering: boolean
  mockupView: 'front' | 'back'
  orderModalOpen: boolean
  orderModalStep: 'shipping' | 'review' | 'processing' | 'confirmation'
  error: string | null

  // Actions
  setProduct: (id: number) => void
  setColor: (color: string, hex: string) => void
  setDesignStyle: (style: DesignStyle) => void
  setPrompt: (prompt: string) => void
  setDesignColors: (colors: string[]) => void
  setDesignModel: (model: DesignModel) => void
  setQualityTier: (tier: QualityTier) => void
  setBatchCount: (count: 1 | 3 | 5) => void
  addDesign: (design: GeneratedDesign) => void
  addDesigns: (designs: GeneratedDesign[]) => void
  setActiveDesignIndex: (index: number) => void
  setDesignPosition: (pos: { x: number; y: number; scale: number }) => void
  setSize: (size: string) => void
  setQuantity: (qty: number) => void
  setShippingAddress: (addr: ShippingAddress) => void
  setPricePts: (pts: number | null) => void
  setVariants: (variants: PrintifyVariant[]) => void
  setIsLoadingCatalog: (loading: boolean) => void
  setIsGenerating: (generating: boolean) => void
  setIsOrdering: (ordering: boolean) => void
  setMockupView: (view: 'front' | 'back') => void
  setOrderModalOpen: (open: boolean) => void
  setOrderModalStep: (step: MerchLabState['orderModalStep']) => void
  setPrintifyProductId: (id: string | null) => void
  setPrintifyOrderId: (id: string | null) => void
  setError: (error: string | null) => void
  resetOrder: () => void
}
