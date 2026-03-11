import type { Generate3DResponse } from '../types/figurine.types'

export interface SavedFigurine {
  id: string
  user_id: string
  source_image_url: string
  glb_url: string
  prediction_id: string | null
  credits_charged: number
  created_at: string
}

class FigurineService {
  async generate3D(imageUrl: string, galleryId?: string): Promise<Generate3DResponse> {
    const response = await fetch('/api/figurine/generate-3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, galleryId }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }))
      return { success: false, error: data.error || `HTTP ${response.status}` }
    }

    return response.json()
  }

  async listSaved(): Promise<SavedFigurine[]> {
    const response = await fetch('/api/figurine/saved')
    if (!response.ok) return []
    const data = await response.json()
    return data.figurines ?? []
  }

  async deleteSaved(id: string): Promise<boolean> {
    const response = await fetch('/api/figurine/saved', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    return response.ok
  }
}

export const figurineService = new FigurineService()
