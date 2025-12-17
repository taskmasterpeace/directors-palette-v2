import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import type { Database } from '../../../../../supabase/database.types';
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service';
import type { AnimationModel, ModelSettings } from '@/features/shot-animator/types';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY: Verify authentication first
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth; // Return 401 error

    const { user, supabase } = auth;

    const {
      model,
      prompt,
      image,
      modelSettings,
      referenceImages,
      lastFrameImage,
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
      const creditCheck = await creditsService.hasSufficientCredits(user.id, model, 'video')
      if (!creditCheck.sufficient) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            details: `You need ${creditCheck.required} points but only have ${creditCheck.balance} points.`,
            required: creditCheck.required,
            balance: creditCheck.balance,
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
    const prediction = await replicate.predictions.create({
      model: replicateModelId,
      input: replicateInput,
      webhook: webhookUrl,
      webhook_events_filter: ['start', 'completed'],
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

    // ✅ SECURITY: Create gallery entry with authenticated user's ID
    // This respects RLS policies since we're using the user's session
    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: user.id, // ✅ Use authenticated user
        prediction_id: prediction.id,
        generation_type: 'video',
        status: 'pending',
        metadata: metadata as Database['public']['Tables']['gallery']['Insert']['metadata'],
      })
      .select()
      .single();

    if (galleryError || !gallery) {
      console.error('Gallery creation error:', galleryError);
      return NextResponse.json(
        { error: 'Failed to create gallery entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      predictionId: prediction.id,
      galleryId: gallery.id,
      status: prediction.status,
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: 'Failed to create video generation prediction' },
      { status: 500 }
    );
  }
}
