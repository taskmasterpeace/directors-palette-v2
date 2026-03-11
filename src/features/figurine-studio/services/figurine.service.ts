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

  async getQuote(glbUrl: string, sizeCm: 5 | 10): Promise<{
    success: boolean
    shapewaysModelId?: string
    dimensions?: { x: number; y: number; z: number }
    volume?: number
    sizeCm?: number
    materials?: Array<{
      materialId: number
      materialName: string
      shapewaysPrice: number
      ourPricePts: number
    }>
    error?: string
  }> {
    const response = await fetch('/api/figurine/print-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glbUrl, sizeCm }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }))
      return { success: false, error: data.error || `HTTP ${response.status}` }
    }

    return response.json()
  }

  async placeOrder(orderData: {
    shapewaysModelId: string
    materialId: number
    materialName: string
    sizeCm: number
    shapewaysPrice: number
    ourPricePts: number
    shippingAddress: Record<string, string>
    figurineId?: string
    dimensions?: { x: number; y: number; z: number }
  }): Promise<{
    success: boolean
    orderId?: string
    status?: string
    ptsCharged?: number
    error?: string
  }> {
    const response = await fetch('/api/figurine/print-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Order failed' }))
      return { success: false, error: data.error || `HTTP ${response.status}` }
    }

    return response.json()
  }

  async convertToObj(glbUrl: string): Promise<Blob> {
    const response = await fetch('/api/figurine/convert-obj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glbUrl }),
    })

    if (!response.ok) {
      throw new Error('Failed to convert model')
    }

    return response.blob()
  }

  async getOrderStatus(orderId: string): Promise<{
    orderId: string
    status: string
    trackingNumber?: string
    materialName: string
    sizeCm: number
    ptsCharged: number
    createdAt: string
  }> {
    const response = await fetch(`/api/figurine/print-status/${orderId}`)
    if (!response.ok) {
      throw new Error('Failed to get order status')
    }
    return response.json()
  }

  async listOrders(): Promise<Array<{
    id: string
    shapeways_order_id: string
    material_name: string
    size_cm: number
    our_price_pts: number
    status: string
    created_at: string
  }>> {
    const response = await fetch('/api/figurine/print-orders')
    if (!response.ok) return []
    const data = await response.json()
    return data.orders ?? []
  }
}

export const figurineService = new FigurineService()
