import type { Generate3DResponse } from '../types/figurine.types'

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
}

export const figurineService = new FigurineService()
