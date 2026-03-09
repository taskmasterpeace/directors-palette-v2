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
