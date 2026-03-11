import { lognog } from '@/lib/lognog'

// Shapeways API base URL
const SHAPEWAYS_API = 'https://api.shapeways.com'

// Cache token for 50 minutes (expires at 60)
let cachedToken: { token: string; expiresAt: number } | null = null

export interface ShapewaysPricing {
  materialId: number
  price: number  // USD
}

export interface ShapewaysModelInfo {
  modelId: string
  modelVersion: number
  dimensions: {
    x: number  // mm
    y: number
    z: number
  }
  volume: number  // cm³
  pricing: ShapewaysPricing[]
}

export interface ShapewaysOrderResult {
  orderId: string
  status: string
}

export interface ShippingAddress {
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

class ShapewaysService {
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (50 min buffer)
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.token
    }

    const clientId = process.env.SHAPEWAYS_CLIENT_ID
    const clientSecret = process.env.SHAPEWAYS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('Shapeways credentials not configured')
    }

    const response = await fetch(`${SHAPEWAYS_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      lognog.error('shapeways_auth_failed', { type: 'error', status: response.status, response: text })
      throw new Error(`Shapeways auth failed: ${response.status}`)
    }

    const data = await response.json()
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutes
    }

    return data.access_token
  }

  /**
   * Upload an OBJ model to Shapeways
   * Returns modelId and pricing after polling for availability
   */
  async uploadModel(
    objBuffer: Buffer,
    fileName: string,
    units: 'mm' = 'mm'
  ): Promise<ShapewaysModelInfo> {
    const token = await this.getAccessToken()

    const fileBase64 = objBuffer.toString('base64')

    const response = await fetch(`${SHAPEWAYS_API}/models/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: fileName,
        file: fileBase64,
        hasRightsToModel: 1,
        acceptTermsAndConditions: 1,
        units: units,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      lognog.error('shapeways_upload_failed', { type: 'error', status: response.status, response: text.slice(0, 500) })
      throw new Error(`Shapeways upload failed: ${response.status}`)
    }

    const data = await response.json()
    const modelId = String(data.modelId)
    const modelVersion = data.modelVersion || 1

    // Poll for pricing (Shapeways processes the model async)
    const pricing = await this.pollForPricing(modelId, modelVersion)

    return pricing
  }

  /**
   * Poll Shapeways every 2s until pricing is available (up to 30s)
   */
  private async pollForPricing(modelId: string, modelVersion: number): Promise<ShapewaysModelInfo> {
    const token = await this.getAccessToken()
    const maxAttempts = 15 // 30s total at 2s intervals

    // Material IDs we care about
    const materialIds = [317, 6, 25, 231, 232]

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      const response = await fetch(
        `${SHAPEWAYS_API}/models/${modelId}/v1`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )

      if (!response.ok) continue

      const data = await response.json()

      // Check if pricing is ready
      if (data.materials && Object.keys(data.materials).length > 0) {
        const pricing: ShapewaysPricing[] = []

        for (const matId of materialIds) {
          const mat = data.materials[String(matId)]
          if (mat && mat.price !== undefined) {
            pricing.push({
              materialId: matId,
              price: parseFloat(mat.price),
            })
          }
        }

        if (pricing.length > 0) {
          return {
            modelId,
            modelVersion,
            dimensions: {
              x: parseFloat(data.boundingBox?.x || '0'),
              y: parseFloat(data.boundingBox?.y || '0'),
              z: parseFloat(data.boundingBox?.z || '0'),
            },
            volume: parseFloat(data.volume || '0'),
            pricing,
          }
        }
      }
    }

    throw new Error('Shapeways pricing not available after 30 seconds. Model may still be processing.')
  }

  /**
   * Get pricing for a specific model
   */
  async getModelPricing(modelId: string): Promise<ShapewaysModelInfo> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `${SHAPEWAYS_API}/models/${modelId}/v1`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get model pricing: ${response.status}`)
    }

    const data = await response.json()
    const materialIds = [317, 6, 25, 231, 232]
    const pricing: ShapewaysPricing[] = []

    for (const matId of materialIds) {
      const mat = data.materials?.[String(matId)]
      if (mat && mat.price !== undefined) {
        pricing.push({
          materialId: matId,
          price: parseFloat(mat.price),
        })
      }
    }

    return {
      modelId,
      modelVersion: data.modelVersion || 1,
      dimensions: {
        x: parseFloat(data.boundingBox?.x || '0'),
        y: parseFloat(data.boundingBox?.y || '0'),
        z: parseFloat(data.boundingBox?.z || '0'),
      },
      volume: parseFloat(data.volume || '0'),
      pricing,
    }
  }

  /**
   * Place an order on Shapeways
   */
  async placeOrder(
    modelId: string,
    materialId: number,
    address: ShippingAddress
  ): Promise<ShapewaysOrderResult> {
    const token = await this.getAccessToken()

    const response = await fetch(`${SHAPEWAYS_API}/orders/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            modelId,
            materialId,
            quantity: 1,
          },
        ],
        firstName: address.firstName,
        lastName: address.lastName,
        address1: address.address1,
        address2: address.address2 || '',
        city: address.city,
        state: address.state,
        zipCode: address.zip,
        country: address.country,
        phoneNumber: address.phone,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      lognog.error('shapeways_order_failed', { type: 'error', status: response.status, response: text.slice(0, 500) })
      throw new Error(`Shapeways order failed: ${response.status} - ${text.slice(0, 200)}`)
    }

    const data = await response.json()

    return {
      orderId: String(data.orderId),
      status: data.status || 'pending',
    }
  }

  /**
   * Get order status from Shapeways
   */
  async getOrderStatus(orderId: string): Promise<{ status: string; trackingNumber?: string }> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `${SHAPEWAYS_API}/orders/${orderId}/v1`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get order status: ${response.status}`)
    }

    const data = await response.json()

    return {
      status: data.status || 'unknown',
      trackingNumber: data.trackingNumber || undefined,
    }
  }
}

export const shapewaysService = new ShapewaysService()
