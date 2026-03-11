export interface FigurineOrder {
  id: string
  user_id: string
  gallery_id?: string
  source_image_url: string
  glb_url?: string
  glb_storage_path?: string
  status: FigurineStatus
  credits_charged: number
  created_at: string
  updated_at: string
}

export type FigurineStatus =
  | 'generating'    // 3D model being generated
  | 'ready'         // 3D model ready, viewable
  | 'failed'        // Generation failed

export interface Generate3DRequest {
  imageUrl: string
  galleryId?: string
}

export interface Generate3DResponse {
  success: boolean
  glbUrl?: string
  predictionId?: string
  error?: string
  creditsCharged?: number
}

// Print ordering types
export interface PrintQuoteRequest {
  glbUrl: string
  sizeCm: 5 | 10
}

export interface PrintMaterialQuote {
  materialId: number
  materialName: string
  shapewaysPrice: number
  ourPricePts: number
}

export interface PrintQuoteResponse {
  success: boolean
  shapewaysModelId?: string
  dimensions?: { x: number; y: number; z: number }
  volume?: number
  sizeCm?: number
  materials?: PrintMaterialQuote[]
  error?: string
}

export interface PrintOrderRequest {
  shapewaysModelId: string
  materialId: number
  materialName: string
  sizeCm: number
  shapewaysPrice: number
  ourPricePts: number
  shippingAddress: ShippingAddressData
  figurineId?: string
  dimensions?: { x: number; y: number; z: number }
}

export interface ShippingAddressData {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
}

export interface PrintOrderResponse {
  success: boolean
  orderId?: string
  status?: string
  ptsCharged?: number
  error?: string
}

export interface PrintOrder {
  id: string
  user_id: string
  figurine_id: string | null
  shapeways_model_id: string
  shapeways_order_id: string
  material_id: number
  material_name: string
  size_cm: number
  shapeways_price: number
  our_price_pts: number
  status: string
  shipping_address: ShippingAddressData
  dimensions: { x: number; y: number; z: number } | null
  created_at: string
  updated_at: string
}
