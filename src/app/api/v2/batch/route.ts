import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { creditsService } from '@/features/credits'
import { getModelCost, type ModelId } from '@/config'
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service'
import type { AnimationModel } from '@/features/shot-animator/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiV2')

const TYPE_TO_ENDPOINT: Record<string, string> = {
  image: '/api/v2/images/generate',
  video: '/api/v2/videos/generate',
  character: '/api/v2/characters/generate',
  recipe: '/api/v2/recipes/execute',
}

function estimateJobCost(job: Record<string, unknown>): number {
  const type = job.type as string

  switch (type) {
    case 'image': {
      const modelId = (job.model as ModelId) || 'nano-banana-2'
      const numImages = Math.min(Number(job.num_images) || 1, 5)
      return Math.round(getModelCost(modelId) * 100) * numImages
    }
    case 'video': {
      const model = (job.model as AnimationModel) || 'wan-2.1'
      const duration = Number(job.duration) || 5
      const resolution = (job.resolution as '480p' | '720p' | '1080p') || '720p'
      return VideoGenerationService.calculateCost(model, duration, resolution)
    }
    case 'character': {
      return Math.round(getModelCost('nano-banana-2') * 100) * 2
    }
    case 'recipe': {
      return Math.round(getModelCost('nano-banana-2') * 100)
    }
    default:
      return 0
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const { jobs } = body

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return errors.validation('jobs must be a non-empty array')
    }

    if (jobs.length > 20) {
      return errors.validation('Maximum 20 jobs per batch')
    }

    // Validate each job has a valid type
    const validTypes = Object.keys(TYPE_TO_ENDPOINT)
    for (let i = 0; i < jobs.length; i++) {
      if (!jobs[i].type || !validTypes.includes(jobs[i].type)) {
        return errors.validation(`Job ${i}: type must be one of ${validTypes.join(', ')}`)
      }
    }

    // Calculate total cost upfront
    const totalCost = jobs.reduce((sum, job) => sum + estimateJobCost(job), 0)

    // Check total balance - reject entire batch if insufficient
    const balance = await creditsService.getBalance(auth.userId, true)
    if (!balance || balance.balance < totalCost) {
      return errors.insufficientPts(totalCost, balance?.balance || 0)
    }

    // Dispatch jobs by calling internal v2 endpoints
    const batchId = randomUUID()
    const baseUrl = request.nextUrl.origin
    const authHeader = request.headers.get('authorization') || ''

    const results = await Promise.allSettled(
      jobs.map(async (job, index) => {
        const { type, ...params } = job
        const endpointPath = TYPE_TO_ENDPOINT[type]

        try {
          const res = await fetch(`${baseUrl}${endpointPath}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify(params),
          })

          const responseBody = await res.json()
          return {
            index,
            type,
            status: res.ok ? 'accepted' : 'failed',
            ...(responseBody.data || {}),
            ...(responseBody.error ? { error: responseBody.error } : {}),
          }
        } catch (err) {
          return {
            index,
            type,
            status: 'failed',
            error: { code: 'DISPATCH_ERROR', message: err instanceof Error ? err.message : 'Failed to dispatch job' },
          }
        }
      })
    )

    const formattedResults = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { status: 'failed', error: { code: 'DISPATCH_ERROR', message: 'Unexpected error' } }
    )

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/v2/batch',
      method: 'POST',
      statusCode: 202,
      creditsUsed: totalCost,
      requestMetadata: { batch_id: batchId, job_count: jobs.length },
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse(
      {
        batch_id: batchId,
        total_cost: totalCost,
        results: formattedResults,
      },
      202
    )
  } catch (err) {
    log.error('POST /v2/batch error', { error: err instanceof Error ? err.message : String(err) })
    return errors.internal()
  }
}
