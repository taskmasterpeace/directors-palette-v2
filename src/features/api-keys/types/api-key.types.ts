/**
 * API Key Types
 * For external API access to Director's Palette
 */

export interface ApiKey {
  id: string
  userId: string
  keyPrefix: string  // dp_xxxxxxxx (first 11 chars for display)
  name: string
  scopes: ApiScope[]
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
}

export interface ApiKeyRow {
  id: string
  user_id: string
  key_hash: string
  key_prefix: string
  name: string
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: string
  expires_at: string | null
}

export type ApiScope =
  | 'images:generate'
  | 'images:read'
  | 'recipes:execute'
  | 'recipes:read'
  | 'usage:read'

export interface ApiKeyWithRawKey extends ApiKey {
  rawKey: string  // Only available immediately after creation
}

export interface ApiUsage {
  id: string
  apiKeyId: string
  userId: string
  endpoint: string
  method: string
  statusCode: number
  creditsUsed: number
  requestMetadata: Record<string, unknown> | null
  responseTimeMs: number | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface ApiUsageRow {
  id: string
  api_key_id: string
  user_id: string
  endpoint: string
  method: string
  status_code: number
  credits_used: number
  request_metadata: Record<string, unknown> | null
  response_time_ms: number | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface ApiUsageStats {
  totalRequests: number
  totalCreditsUsed: number
  requestsByEndpoint: Record<string, number>
  requestsByDay: { date: string; count: number; credits: number }[]
  averageResponseTime: number
}

export interface ValidatedApiKey {
  apiKey: ApiKey
  userId: string
  scopes: ApiScope[]
}

// API Request/Response types
export interface GenerateImageRequest {
  prompt: string
  model?: 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-2512' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' | 'seedream-4.5'
  aspectRatio?: string
  outputFormat?: 'webp' | 'jpg' | 'png'
  referenceImages?: string[]  // URLs
  seed?: number
  // Anchor Transform (@!)
  enableAnchorTransform?: boolean  // If true, first image is anchor, rest are inputs
  // Model-specific settings
  resolution?: string  // For nano-banana-pro
  safetyFilterLevel?: string  // For nano-banana-pro
  numInferenceSteps?: number  // For z-image-turbo
  guidanceScale?: number  // For z-image-turbo
  // GPT Image specific
  background?: 'opaque' | 'transparent' | 'auto'  // For gpt-image models
  numImages?: number  // For gpt-image models (1-10)
}

export interface GenerateImageResponse {
  success: boolean
  imageUrl?: string  // Single image URL (when not using Anchor Transform)
  images?: string[]  // Multiple image URLs (when using Anchor Transform)
  creditsUsed?: number
  remainingCredits?: number
  error?: string
  requestId?: string
  anchorTransformUsed?: boolean  // Indicates if Anchor Transform was used
}

export interface ExecuteRecipeRequest {
  recipeId: string
  variables?: Record<string, string>
  model?: 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-2512' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' | 'seedream-4.5'
  aspectRatio?: string
  outputFormat?: 'webp' | 'jpg' | 'png'
}

export interface ExecuteRecipeResponse {
  success: boolean
  images?: { url: string; prompt: string }[]
  totalCreditsUsed?: number
  remainingCredits?: number
  error?: string
  requestId?: string
}

// Helper function to convert row to ApiKey
export function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    keyPrefix: row.key_prefix,
    name: row.name,
    scopes: row.scopes as ApiScope[],
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

export function rowToApiUsage(row: ApiUsageRow): ApiUsage {
  return {
    id: row.id,
    apiKeyId: row.api_key_id,
    userId: row.user_id,
    endpoint: row.endpoint,
    method: row.method,
    statusCode: row.status_code,
    creditsUsed: row.credits_used,
    requestMetadata: row.request_metadata,
    responseTimeMs: row.response_time_ms,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }
}
