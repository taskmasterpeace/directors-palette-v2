/**
 * Safe JSON parsing utility for fetch responses.
 * Prevents "Unexpected token '<'" errors when server returns HTML error pages.
 */

/** Common shape for recipe/generation API responses */
export interface GenerationApiResponse {
  success?: boolean
  error?: string
  imageUrl?: string
  imageUrls?: string[]
  predictionId?: string
  cells?: Array<{ imageUrl: string }>
  synopsis?: string
  tagline?: string
}

export async function safeJsonParse<T = GenerationApiResponse>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  throw new Error(`Request failed (HTTP ${response.status}): ${text.slice(0, 200)}`)
}
