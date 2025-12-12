import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service';
import { ImageModel, ImageModelSettings } from "@/features/shot-creator/types/image-generation.types";
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';
import type { Database } from '../../../../../supabase/database.types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    // ✅ SECURITY: Verify authentication first
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth; // Return 401 error

    const { user, supabase } = auth;

    const body = await request.json();
    const {
      model,
      prompt,
      referenceImages,
      modelSettings,
    } = body;

    // Validate required fields
    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!modelSettings) {
      return NextResponse.json(
        { error: 'Model settings are required' },
        { status: 400 }
      );
    }

    // ✅ CREDITS: Check if user has sufficient credits (admins bypass)
    const userIsAdmin = isAdminEmail(user.email)
    if (!userIsAdmin) {
      const creditCheck = await creditsService.hasSufficientCredits(user.id, model, 'image')
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

    // ✅ SECURITY: Use authenticated user ID (not from request body)
    const validation = ImageGenerationService.validateInput({
      model: model as ImageModel,
      prompt,
      referenceImages,
      modelSettings: modelSettings as ImageModelSettings,
      userId: user.id, // ✅ Use authenticated user
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Build Replicate input
    const replicateInput = ImageGenerationService.buildReplicateInput({
      model: model as ImageModel,
      prompt,
      referenceImages,
      modelSettings: modelSettings as ImageModelSettings,
      userId: user.id, // ✅ Use authenticated user
    });

    // Get model identifier
    const replicateModelId = ImageGenerationService.getReplicateModelId(model as ImageModel);
    console.log('Using model:', replicateModelId);
    console.log('Input data:', JSON.stringify(replicateInput, null, 2));

    // Create Replicate prediction with webhook (if configured)
    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : null;
    console.log('Webhook URL:', webhookUrl || '(none - will poll for results)');

    let prediction;
    try {
      console.log('Creating prediction with model:', replicateModelId);

      // Build prediction options - webhook is optional for local development
      const predictionOptions: {
        model: string;
        input: typeof replicateInput;
        webhook?: string;
        webhook_events_filter?: ('start' | 'output' | 'logs' | 'completed')[];
      } = {
        model: replicateModelId,
        input: replicateInput,
      };

      // Only add webhook if URL is configured (production)
      if (webhookUrl) {
        predictionOptions.webhook = webhookUrl;
        predictionOptions.webhook_events_filter = ['completed'] as const;
      }

      console.log('Input payload:', JSON.stringify(predictionOptions, null, 2));

      prediction = await replicate.predictions.create(predictionOptions);

      console.log('Prediction created successfully:', prediction.id);
    } catch (replicateError: unknown) {
      const error = replicateError as {
        message?: string;
        response?: {
          status?: number;
          statusText?: string;
          data?: unknown;
        };
      };
      console.error('Replicate API error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // Check if this is a model not found error (404) or bad gateway (502)
      if (error.response?.status === 404) {
        return NextResponse.json(
          {
            error: 'Model not found',
            details: `The model '${replicateModelId}' is not available on Replicate. Please check if the model name is correct or if it has been deprecated.`,
            model: replicateModelId,
          },
          { status: 404 }
        );
      }

      if (error.response?.status === 502) {
        return NextResponse.json(
          {
            error: 'Model temporarily unavailable',
            details: `The model '${replicateModelId}' is currently experiencing issues (502 Bad Gateway). This could be temporary. Please try again later or contact support if the issue persists.`,
            model: replicateModelId,
            suggestions: [
              'Try again in a few minutes',
              'Check if the model name is correct on Replicate',
              'Consider using a different image editing model if available',
              'Verify your Replicate API token has sufficient permissions'
            ]
          },
          { status: 502 }
        );
      }

      // Provide general error with suggestions
      return NextResponse.json(
        {
          error: 'Replicate API error',
          details: error.message || 'Unknown error occurred',
          model: replicateModelId,
          suggestions: [
            'Check your internet connection',
            'Verify your Replicate API token',
            'Ensure the model name is correct',
            'Try using a different model if available'
          ]
        },
        { status: 500 }
      );
    }

    // Build metadata for storage
    const metadata = ImageGenerationService.buildMetadata({
      model: model as ImageModel,
      prompt,
      referenceImages,
      modelSettings: modelSettings as ImageModelSettings,
      userId: user.id, // ✅ Use authenticated user
    });

    // ✅ SECURITY: Create gallery entry with authenticated user's ID
    // This respects RLS policies since we're using the user's session
    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: user.id, // ✅ Use authenticated user
        prediction_id: prediction.id,
        generation_type: 'image',
        status: 'pending',
        metadata: metadata as Database['public']['Tables']['gallery']['Insert']['metadata']
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

    // ✅ CREDITS: Deduct credits after successful prediction creation (admins bypass)
    if (!userIsAdmin) {
      const deductResult = await creditsService.deductCredits(user.id, model, {
        generationType: 'image',
        predictionId: prediction.id,
        description: `Image generation (${model})`,
      })
      if (!deductResult.success) {
        console.error('Failed to deduct credits:', deductResult.error)
        // Note: We don't fail the request here since the prediction was already created
        // The user will still see the image, but this should be monitored
      } else {
        console.log(`Deducted credits for user ${user.id}. New balance: ${deductResult.newBalance}`)
      }
    }

    // If no webhook, poll for results (for local development)
    if (!webhookUrl) {
      console.log('No webhook - polling for results...');
      try {
        // Wait for prediction to complete (up to 5 minutes)
        const completedPrediction = await replicate.wait(prediction, {
          interval: 1000, // Check every second
        });

        console.log('Prediction completed:', completedPrediction.status);

        if (completedPrediction.status === 'succeeded' && completedPrediction.output) {
          // Get the image URL (output can be string or array)
          const imageUrl = Array.isArray(completedPrediction.output)
            ? completedPrediction.output[0]
            : completedPrediction.output;

          console.log('Image URL:', imageUrl);

          // Update gallery entry with completed status and image URL
          // Use public_url to match webhook handler and waitForImageCompletion
          const { error: updateError } = await supabase
            .from('gallery')
            .update({
              status: 'completed',
              public_url: imageUrl,
            })
            .eq('id', gallery.id);

          if (updateError) {
            console.error('Failed to update gallery:', updateError);
          } else {
            console.log('Gallery updated successfully');
          }

          return NextResponse.json({
            predictionId: prediction.id,
            galleryId: gallery.id,
            status: 'completed',
            imageUrl: imageUrl,
          });
        } else if (completedPrediction.status === 'failed') {
          // Update gallery with failed status
          await supabase
            .from('gallery')
            .update({ status: 'failed' })
            .eq('id', gallery.id);

          return NextResponse.json({
            predictionId: prediction.id,
            galleryId: gallery.id,
            status: 'failed',
            error: completedPrediction.error,
          });
        }
      } catch (pollError) {
        console.error('Polling error:', pollError);
        // Return pending status if polling fails
      }
    }

    return NextResponse.json({
      predictionId: prediction.id,
      galleryId: gallery.id,
      status: prediction.status,
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to create image generation prediction' },
      { status: 500 }
    );
  }
}
