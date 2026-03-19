import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse } from '../_lib/response'
import { MODEL_CONFIGS, ASPECT_RATIO_SIZES } from '@/config'
import { ANIMATION_MODELS } from '@/features/shot-animator/config/models.config'
import { VIDEO_MODEL_PRICING } from '@/features/shot-animator/types'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  const supportedAspectRatios = Object.keys(ASPECT_RATIO_SIZES).filter(
    (ar) => ar !== 'match_input_image'
  )

  const image_models = Object.values(MODEL_CONFIGS).map((m) => ({
    id: m.id,
    name: m.displayName,
    category: 'image' as const,
    type: m.type,
    cost_pts: Math.round(m.costPerImage * 100),
    supports_img2img: (m.maxReferenceImages ?? 0) > 0,
    supports_loras: m.id === 'flux-2-klein-9b',
    max_reference_images: m.maxReferenceImages ?? 0,
    requires_input_image: m.requiresInputImage ?? false,
    supported_aspect_ratios: supportedAspectRatios,
    estimated_seconds: m.estimatedSeconds ?? null,
  }))

  const video_models = Object.entries(ANIMATION_MODELS)
    .filter(([id]) => id !== 'seedance-pro')
    .map(([id, config]) => ({
      id,
      name: config.displayName,
      category: 'video' as const,
      type: 'generation',
      cost_pts_per_unit: VIDEO_MODEL_PRICING[id as keyof typeof VIDEO_MODEL_PRICING],
      pricing_type: config.pricingType,
      max_duration: config.maxDuration,
      supported_resolutions: config.supportedResolutions,
      supported_aspect_ratios: config.supportedAspectRatios,
      requires_input_image: id !== 'seedance-1.5-pro' && id !== 'p-video',
    }))

  await apiKeyService.logUsage({
    apiKeyId: auth.apiKeyId,
    userId: auth.userId,
    endpoint: '/v2/models',
    method: 'GET',
    statusCode: 200,
  })

  return successResponse({ image_models, video_models })
}
