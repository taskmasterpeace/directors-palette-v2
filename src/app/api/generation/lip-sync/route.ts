/**
 * Lip Sync Generation API Route
 *
 * POST /api/generation/lip-sync
 * Creates a Kling Avatar V2 lip-sync video from portrait image + audio
 */

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import type { Database } from '../../../../../supabase/database.types'
import { LipSyncGenerationService } from '@/features/lip-sync/services/lip-sync-generation.service'
import type {
  LipSyncGenerationRequest,
  LipSyncModel,
  LipSyncResolution,
} from '@/features/lip-sync/types/lip-sync.types'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  const apiStart = Date.now()
  let userId: string | undefined

  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    userId = user.id

    // Parse request body
    const body = await request.json()
    const {
      avatarImageUrl,
      audioUrl,
      audioDurationSeconds,
      modelSettings,
      metadata,
    } = body as LipSyncGenerationRequest

    // Validate required fields
    if (!avatarImageUrl) {
      return NextResponse.json(
        { error: 'Avatar image URL is required' },
        { status: 400 }
      )
    }

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Audio URL is required' },
        { status: 400 }
      )
    }

    if (!audioDurationSeconds || audioDurationSeconds <= 0) {
      return NextResponse.json(
        { error: 'Valid audio duration is required' },
        { status: 400 }
      )
    }

    if (!modelSettings) {
      return NextResponse.json(
        { error: 'Model settings are required' },
        { status: 400 }
      )
    }

    // Validate using service
    const generationRequest: LipSyncGenerationRequest = {
      avatarImageUrl,
      audioUrl,
      audioDurationSeconds,
      modelSettings,
      metadata,
    }

    const validation = LipSyncGenerationService.validateRequest(generationRequest)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Calculate estimated cost
    const estimatedCost = LipSyncGenerationService.calculateCost(
      modelSettings.model as LipSyncModel,
      audioDurationSeconds,
      modelSettings.resolution as LipSyncResolution
    )

    // Check credits (admins bypass)
    const userIsAdmin = isAdminEmail(user.email)
    if (!userIsAdmin) {
      const creditCheck = await creditsService.hasSufficientCredits(
        user.id,
        modelSettings.model,
        'video' // Lip-sync is a video generation
      )

      // Check against calculated cost
      if (creditCheck.balance < estimatedCost) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            details: `You need ${estimatedCost} points but only have ${creditCheck.balance} points.`,
            required: estimatedCost,
            balance: creditCheck.balance,
          },
          { status: 402 }
        )
      }
    }

    // Build Replicate input
    const replicateInput = LipSyncGenerationService.buildReplicateInput(generationRequest)
    const replicateModelId = LipSyncGenerationService.getReplicateModelId(
      modelSettings.model as LipSyncModel
    )

    // Create Replicate prediction with webhook
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
    const replicateStart = Date.now()

    const prediction = await replicate.predictions.create({
      model: replicateModelId,
      input: replicateInput,
      webhook: webhookUrl,
      webhook_events_filter: ['start', 'completed'],
    })

    // Log Replicate integration
    lognog.debug(`replicate OK ${Date.now() - replicateStart}ms ${replicateModelId}`, {
      type: 'integration',
      integration: 'replicate',
      latency_ms: Date.now() - replicateStart,
      success: true,
      model: replicateModelId,
      prediction_id: prediction.id,
      user_id: user.id,
      user_email: user.email,
      generation_type: 'lip-sync',
      audio_duration: audioDurationSeconds,
    })

    // Build metadata for storage
    const galleryMetadata = LipSyncGenerationService.buildMetadata(generationRequest)

    // Create gallery entry
    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: user.id,
        prediction_id: prediction.id,
        generation_type: 'video',
        status: 'pending',
        metadata: galleryMetadata as Database['public']['Tables']['gallery']['Insert']['metadata'],
      })
      .select()
      .single()

    if (galleryError || !gallery) {
      logger.api.error('Gallery creation error', { error: galleryError instanceof Error ? galleryError.message : String(galleryError) })
      return NextResponse.json(
        { error: 'Failed to create gallery entry' },
        { status: 500 }
      )
    }

    // Log API success
    lognog.info(`POST /api/generation/lip-sync 200 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/generation/lip-sync',
      method: 'POST',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: user.id,
      user_email: user.email,
      integration: 'replicate',
      model: modelSettings.model,
      audio_duration: audioDurationSeconds,
      estimated_cost: estimatedCost,
    })

    return NextResponse.json({
      predictionId: prediction.id,
      galleryId: gallery.id,
      estimatedCost,
      estimatedDurationSeconds: audioDurationSeconds,
      status: prediction.status,
    })
  } catch (error) {
    logger.api.error('Lip-sync generation error', { error: error instanceof Error ? error.message : String(error) })

    lognog.error(error instanceof Error ? error.message : 'Lip-sync generation failed', {
      type: 'error',
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/generation/lip-sync',
      user_id: userId,
    })

    lognog.info(`POST /api/generation/lip-sync 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/generation/lip-sync',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: 'Failed to create lip-sync generation prediction' },
      { status: 500 }
    )
  }
}
