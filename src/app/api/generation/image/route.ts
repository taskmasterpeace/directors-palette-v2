import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service';
import { ImageModel, ImageModelSettings } from "@/features/shot-creator/types/image-generation.types";
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';
import { generationEventsService } from '@/features/admin/services/generation-events.service';
import { getModelConfig } from '@/config';
import { StorageService } from '@/features/generation/services/storage.service';
import { StorageLimitsService } from '@/features/storage/services/storage-limits.service';
import type { Database } from '../../../../../supabase/database.types';
import fs from 'fs';
import path from 'path';
import { lognog } from '@/lib/lognog';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Check if a URL is accessible by Replicate (external, public URL)
 */
function isPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Replicate URLs are already accessible
    if (parsed.hostname.includes('replicate.')) return true;
    // Supabase storage URLs are accessible
    if (parsed.hostname.includes('supabase.')) return true;
    // Localhost URLs are NOT accessible to Replicate
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return false;
    // Check for invalid/non-existent domains (hardcoded fallback domain)
    if (parsed.hostname === 'directorspalette.app') return false;
    // Other external URLs are assumed to be accessible
    return true;
  } catch {
    // Not a valid URL (could be a local path)
    return false;
  }
}

/**
 * Process reference images - upload local/inaccessible URLs to Replicate
 */
async function processReferenceImages(
  referenceImages: (string | { url: string; weight?: number })[],
  replicateClient: Replicate
): Promise<(string | { url: string; weight?: number })[]> {
  const processed: (string | { url: string; weight?: number })[] = [];

  for (const ref of referenceImages) {
    const url = typeof ref === 'string' ? ref : ref.url;
    const weight = typeof ref === 'object' ? ref.weight : undefined;

    // Handle base64 data URIs (from file uploads)
    if (url.startsWith('data:image/')) {
      console.log(`[Image Generation API] Processing base64 data URI (${url.slice(0, 50)}...)`);

      try {
        // Parse the data URI: data:image/png;base64,<data>
        const matches = url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          console.error('[Image Generation API] Invalid base64 data URI format');
          continue;
        }

        const [, format, base64Data] = matches;
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const mimeType = `image/${format}`;
        const ext = format === 'jpeg' ? 'jpg' : format;

        // Upload to Replicate
        const uint8Array = new Uint8Array(imageBuffer);
        const file = new File([uint8Array], `reference.${ext}`, { type: mimeType });
        const uploadedFile = await replicateClient.files.create(file);
        const uploadedUrl = uploadedFile.urls.get;

        console.log(`[Image Generation API] Base64 uploaded to Replicate: ${uploadedUrl}`);

        // Preserve weight if present
        if (weight !== undefined) {
          processed.push({ url: uploadedUrl, weight });
        } else {
          processed.push(uploadedUrl);
        }
      } catch (error) {
        console.error('[Image Generation API] Error processing base64 data URI:', error);
      }
      continue;
    }

    // If it's already a public URL, keep as-is
    if (isPublicUrl(url)) {
      processed.push(ref);
      continue;
    }

    console.log(`[Image Generation API] Processing inaccessible URL: ${url}`);

    try {
      let imageBuffer: Buffer;

      // Check if it's a local path (starts with /)
      if (url.startsWith('/')) {
        // Read from public folder
        const publicPath = path.join(process.cwd(), 'public', url);
        console.log(`[Image Generation API] Reading local file: ${publicPath}`);

        if (!fs.existsSync(publicPath)) {
          console.error(`[Image Generation API] Local file not found: ${publicPath}`);
          continue; // Skip this reference image
        }

        imageBuffer = fs.readFileSync(publicPath);
      } else {
        // It's a URL that's not publicly accessible (e.g., localhost or invalid domain)
        // Try to fetch it if we're on the same server
        const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${url}`;
        console.log(`[Image Generation API] Fetching URL: ${fullUrl}`);

        const response = await fetch(fullUrl);
        if (!response.ok) {
          console.error(`[Image Generation API] Failed to fetch URL: ${fullUrl} - ${response.status}`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      }

      // Determine MIME type from URL
      const ext = url.split('.').pop()?.toLowerCase() || 'png';
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';

      // Upload to Replicate - convert Buffer to Uint8Array for File compatibility
      const uint8Array = new Uint8Array(imageBuffer);
      const file = new File([uint8Array], `reference.${ext}`, { type: mimeType });
      const uploadedFile = await replicateClient.files.create(file);
      const uploadedUrl = uploadedFile.urls.get;

      console.log(`[Image Generation API] Uploaded to Replicate: ${uploadedUrl}`);

      // Preserve weight if present
      if (weight !== undefined) {
        processed.push({ url: uploadedUrl, weight });
      } else {
        processed.push(uploadedUrl);
      }
    } catch (error) {
      console.error(`[Image Generation API] Error processing reference image ${url}:`, error);
      // Skip this reference image on error
    }
  }

  return processed;
}

export async function POST(request: NextRequest) {
  const apiStart = Date.now();
  let userId: string | undefined;

  try {
    // ✅ SECURITY: Verify authentication first
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth; // Return 401 error

    const { user, supabase } = auth;
    userId = user.id;

    const body = await request.json();
    const {
      model,
      prompt,
      referenceImages,
      modelSettings,
      recipeId,
      recipeName,
    } = body;

    // Debug logging for reference images
    console.log('[Image Generation API] Received request:');
    console.log('  - model:', model);
    console.log('  - prompt length:', prompt?.length || 0);
    console.log('  - referenceImages:', JSON.stringify(referenceImages));

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

      // ✅ STORAGE: Check if user has reached image limit (500 max)
      const storageLimits = await StorageLimitsService.getStorageLimits(user.id)
      if (!storageLimits.canCreateImage) {
        return NextResponse.json(
          {
            error: 'Storage limit reached',
            details: `You have reached the maximum of ${storageLimits.imageLimit} images. Delete some images to create more.`,
            imageCount: storageLimits.imageCount,
            imageLimit: storageLimits.imageLimit,
          },
          { status: 403 } // Forbidden
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

    // Process reference images - upload local/inaccessible URLs to Replicate
    let processedReferenceImages = referenceImages;
    if (referenceImages && referenceImages.length > 0) {
      processedReferenceImages = await processReferenceImages(referenceImages, replicate);
      console.log('[Image Generation API] Processed reference images:', processedReferenceImages);
    }

    // Build Replicate input
    const replicateInput = ImageGenerationService.buildReplicateInput({
      model: model as ImageModel,
      prompt,
      referenceImages: processedReferenceImages,
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

      const replicateStart = Date.now();
      prediction = await replicate.predictions.create(predictionOptions);
      const replicateLatency = Date.now() - replicateStart;

      // Log Replicate integration success
      lognog.integration({
        integration: 'replicate',
        latency_ms: replicateLatency,
        success: true,
        model: replicateModelId,
        prediction_id: prediction.id,
        prompt_length: prompt?.length,
        prompt_preview: prompt?.substring(0, 50),
        user_id: user.id,
        user_email: user.email,
      });

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

      // Log Replicate integration failure
      lognog.integration({
        integration: 'replicate',
        latency_ms: Date.now() - apiStart,
        http_status: error.response?.status,
        success: false,
        error: error.message,
        model: replicateModelId,
        user_id: user.id,
        user_email: user.email,
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
      recipeId,
      recipeName,
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

    // ✅ ANALYTICS: Log generation event for admin dashboard
    const modelConfig = getModelConfig(model as ImageModel);
    const modelPrice = await creditsService.getPriceForModel(model, 'image');
    const creditsCost = userIsAdmin ? 0 : modelPrice;

    await generationEventsService.logGeneration({
      user_id: user.id,
      user_email: user.email,
      gallery_id: gallery.id,
      prediction_id: prediction.id,
      generation_type: 'image',
      model_id: model,
      model_name: modelConfig?.name || model,
      credits_cost: creditsCost,
      is_admin_generation: userIsAdmin,
      prompt: prompt,
      settings: modelSettings
    });

    // Note: Credits are now deducted AFTER successful completion (in webhook handler or polling)
    // This ensures users aren't charged for failed generations

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
          const replicateUrl = Array.isArray(completedPrediction.output)
            ? completedPrediction.output[0]
            : completedPrediction.output;

          console.log('Replicate URL:', replicateUrl);

          // Download from Replicate and upload to Supabase Storage (same as webhook handler)
          try {
            const { buffer } = await StorageService.downloadAsset(replicateUrl);
            const { ext, mimeType } = StorageService.getMimeType(replicateUrl, modelSettings?.outputFormat);
            const { publicUrl, storagePath, fileSize } = await StorageService.uploadToStorage(
              buffer,
              user.id,
              prediction.id,
              ext,
              mimeType
            );

            console.log('Uploaded to Supabase Storage:', publicUrl);

            // Update gallery entry with completed status and permanent Supabase URL
            const { error: updateError } = await supabase
              .from('gallery')
              .update({
                status: 'completed',
                public_url: publicUrl,
                storage_path: storagePath,
                file_size: fileSize,
                mime_type: mimeType,
              })
              .eq('id', gallery.id);

            if (updateError) {
              console.error('Failed to update gallery:', updateError);
            } else {
              console.log('Gallery updated successfully');
            }

            // ✅ CREDITS: Deduct credits only AFTER successful generation (admins bypass)
            if (!userIsAdmin) {
              const deductResult = await creditsService.deductCredits(user.id, model, {
                generationType: 'image',
                predictionId: prediction.id,
                description: `Image generation (${model})`,
              })
              if (!deductResult.success) {
                console.error('Failed to deduct credits:', deductResult.error)
              } else {
                console.log(`Deducted credits for user ${user.id}. New balance: ${deductResult.newBalance}`)
              }
            }

            // Log successful generation
            lognog.business({
              event: 'generation_completed',
              user_id: user.id,
              user_email: user.email,
              model: model,
              prediction_id: prediction.id,
              credits_deducted: creditsCost,
              reason: 'image_generation',
            });

            // Log API success
            lognog.api({
              route: '/api/generation/image',
              method: 'POST',
              status_code: 200,
              duration_ms: Date.now() - apiStart,
              user_id: user.id,
              user_email: user.email,
              integration: 'replicate',
              model: model,
              credits_used: creditsCost,
            });

            return NextResponse.json({
              predictionId: prediction.id,
              galleryId: gallery.id,
              status: 'completed',
              imageUrl: publicUrl,
            });
          } catch (uploadError) {
            // Log detailed error for debugging in production
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
            console.error('[generation/image] Supabase storage FAILED:', {
              error: errorMessage,
              hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
              predictionId: prediction.id,
            });

            // Log storage failure
            lognog.error({
              message: 'Storage upload failed',
              route: '/api/generation/image',
              user_id: user.id,
              user_email: user.email,
              model: model,
              context: { prediction_id: prediction.id },
            });

            // Mark as failed - DO NOT store Replicate URL (expires in 1 hour!)
            await supabase
              .from('gallery')
              .update({
                status: 'failed',
                error_message: `Storage upload failed: ${errorMessage}`,
              })
              .eq('id', gallery.id);

            // Don't deduct credits on storage failure - user didn't get their image
            return NextResponse.json({
              predictionId: prediction.id,
              galleryId: gallery.id,
              status: 'failed',
              error: 'Image generated but storage upload failed. Please try again.',
            });
          }
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

    // Log error
    lognog.error({
      message: error instanceof Error ? error.message : 'Image generation failed',
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/generation/image',
      user_id: userId,
    });

    // Log API failure
    lognog.api({
      route: '/api/generation/image',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      integration: 'replicate',
    });

    return NextResponse.json(
      { error: 'Failed to create image generation prediction' },
      { status: 500 }
    );
  }
}
