import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import type { Database } from '../../../../../supabase/database.types';
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service';
import type { AnimationModel, ModelSettings } from '@/features/shot-animator/types';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';
import { lognog } from '@/lib/lognog';
import { logger } from '@/lib/logger'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  const apiStart = Date.now();
  let userId: string | undefined;

  try {
    // ✅ SECURITY: Verify authentication first
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth; // Return 401 error

    const { user, supabase } = auth;
    userId = user.id;

    const {
      model,
      prompt,
      image,
      modelSettings,
      referenceImages,
      lastFrameImage,
      extraMetadata,
      // ✅ REMOVED: user_id from request body (now from authenticated session)
    } = await request.json();

    // Validate required fields
    if (!model) {
      return NextResponse.json(
        { error: 'Model is required (seedance-lite or seedance-pro)' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required for image-to-video generation' },
        { status: 400 }
      );
    }

    if (!modelSettings) {
      return NextResponse.json(
        { error: 'Model settings are required' },
        { status: 400 }
      );
    }

    // Validate input using service
    const validation = VideoGenerationService.validateInput({
      model: model as AnimationModel,
      prompt,
      image,
      modelSettings: modelSettings as ModelSettings,
      referenceImages,
      lastFrameImage,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // ✅ CREDITS: Check if user has sufficient credits (admins bypass)
    const userIsAdmin = isAdminEmail(user.email)
    if (!userIsAdmin) {
      // Calculate actual cost based on model, duration, and resolution
      const settings = modelSettings as ModelSettings
      const estimatedCost = VideoGenerationService.calculateCost(
        model as AnimationModel,
        settings.duration ?? 5,
        settings.resolution ?? '720p'
      )
      const balance = await creditsService.getBalance(user.id)
      const currentBalance = balance?.balance ?? 0

      if (currentBalance < estimatedCost) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            details: `You need ${estimatedCost} points but only have ${currentBalance} points.`,
            required: estimatedCost,
            balance: currentBalance,
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // Build Replicate input
    const replicateInput = VideoGenerationService.buildReplicateInput({
      model: model as AnimationModel,
      prompt,
      image,
      modelSettings: modelSettings as ModelSettings,
      referenceImages,
      lastFrameImage,
    });

    // Get model identifier
    const replicateModelId = VideoGenerationService.getReplicateModelId(model as AnimationModel);

    // Create Replicate prediction with webhook
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks/replicate`;
    const replicateStart = Date.now();
    const prediction = await replicate.predictions.create({
      model: replicateModelId,
      input: replicateInput,
      webhook: webhookUrl,
      webhook_events_filter: ['start', 'completed'],
    });

    // Log Replicate integration success
    lognog.debug(`replicate OK ${Date.now() - replicateStart}ms ${replicateModelId}`, {
      type: 'integration',
      integration: 'replicate',
      latency_ms: Date.now() - replicateStart,
      success: true,
      model: replicateModelId,
      prediction_id: prediction.id,
      prompt_length: prompt?.length,
      prompt: prompt,
      user_id: user.id,
      user_email: user.email,
    });

    // Build metadata for storage
    const metadata = VideoGenerationService.buildMetadata({
      model: model as AnimationModel,
      prompt,
      image,
      modelSettings: modelSettings as ModelSettings,
      referenceImages,
      lastFrameImage,
    });

    // Merge extraMetadata into metadata if provided
    const finalMetadata = extraMetadata
      ? { ...metadata, ...extraMetadata }
      : metadata;

    // ✅ SECURITY: Create gallery entry with authenticated user's ID
    // This respects RLS policies since we're using the user's session
    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: user.id, // ✅ Use authenticated user
        prediction_id: prediction.id,
        generation_type: 'video',
        status: 'pending',
        metadata: finalMetadata as Database['public']['Tables']['gallery']['Insert']['metadata'],
      })
      .select()
      .single();

    if (galleryError || !gallery) {
      logger.api.error('Gallery creation error', { error: galleryError instanceof Error ? galleryError.message : String(galleryError) });
      return NextResponse.json(
        { error: 'Failed to create gallery entry' },
        { status: 500 }
      );
    }

    // Log API success
    lognog.info(`POST /api/generation/video 200 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/generation/video',
      method: 'POST',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: user.id,
      user_email: user.email,
      integration: 'replicate',
      model: model,
    });

    return NextResponse.json({
      predictionId: prediction.id,
      galleryId: gallery.id,
      status: prediction.status,
    });

  } catch (error) {
    logger.api.error('Video generation error', { error: error instanceof Error ? error.message : String(error) });

    // Log error
    lognog.error(error instanceof Error ? error.message : 'Video generation failed', {
      type: 'error',
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/generation/video',
      user_id: userId,
    });

    // Log API failure
    lognog.info(`POST /api/generation/video 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/generation/video',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      integration: 'replicate',
    });

    return NextResponse.json(
      { error: 'Failed to create video generation prediction' },
      { status: 500 }
    );
  }
}
