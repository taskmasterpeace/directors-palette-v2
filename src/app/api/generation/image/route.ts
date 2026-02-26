import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service';
import { ImageModel, ImageModelSettings } from "@/features/shot-creator/types/image-generation.types";
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';
import { generationEventsService } from '@/features/admin/services/generation-events.service';
import { getModelConfig, getModelCost, type ModelId } from '@/config';
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
 * Blocks private/internal IPs to prevent SSRF
 */
function isPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    // Replicate URLs are already accessible
    if (hostname.includes('replicate.')) return true;
    // Supabase storage URLs are accessible
    if (hostname.includes('supabase.')) return true;
    // Block private/internal hostnames and IPs
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    if (hostname === '0.0.0.0' || hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;
    // Block private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
    if (/^10\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (/^192\.168\./.test(hostname)) return false;
    if (/^169\.254\./.test(hostname)) return false;
    // Block metadata endpoints (cloud providers)
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') return false;
    // Check for invalid/non-existent domains (hardcoded fallback domain)
    if (hostname === 'directorspalette.app') return false;
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
      lognog.devDebug('Processing base64 data URI', {
        preview: url.slice(0, 50) + '...',
        data_length: url.length
      });

      try {
        // Parse the data URI: data:image/png;base64,<data>
        const matches = url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          lognog.devWarn('Invalid base64 data URI format', { url_start: url.slice(0, 100) });
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

        lognog.devDebug('Base64 uploaded to Replicate', { url: uploadedUrl });

        // Preserve weight if present
        if (weight !== undefined) {
          processed.push({ url: uploadedUrl, weight });
        } else {
          processed.push(uploadedUrl);
        }
      } catch (error) {
        lognog.devError('Error processing base64 data URI', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      continue;
    }

    // If it's already a public URL, keep as-is
    if (isPublicUrl(url)) {
      processed.push(ref);
      continue;
    }

    lognog.devDebug('Processing inaccessible URL', { url });

    try {
      let imageBuffer: Buffer;

      // Check if it's a local path (starts with /)
      if (url.startsWith('/')) {
        // Read from public folder
        const publicPath = path.join(process.cwd(), 'public', url);
        lognog.devDebug('Reading local file', { path: publicPath });

        if (!fs.existsSync(publicPath)) {
          lognog.devWarn('Local file not found', { path: publicPath });
          continue; // Skip this reference image
        }

        imageBuffer = fs.readFileSync(publicPath);
      } else {
        // It's a URL that's not publicly accessible (e.g., localhost or invalid domain)
        // Try to fetch it if we're on the same server
        const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${url}`;
        lognog.devDebug('Fetching URL', { url: fullUrl });

        const response = await fetch(fullUrl);
        if (!response.ok) {
          lognog.devWarn('Failed to fetch URL', { url: fullUrl, status: response.status });
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

      lognog.devDebug('Uploaded to Replicate', { url: uploadedUrl });

      // Preserve weight if present
      if (weight !== undefined) {
        processed.push({ url: uploadedUrl, weight });
      } else {
        processed.push(uploadedUrl);
      }
    } catch (error) {
      lognog.devError('Error processing reference image', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
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
      enableAnchorTransform = false,
      // Gallery organization fields
      folderId,
      extraMetadata, // For storybook: { source, projectId, projectTitle, assetType, ... }
      // Storyboard: force polling even when webhooks are configured
      waitForResult = false,
    } = body;

    // Debug logging for reference images
    lognog.devDebug('Image generation request received', {
      model,
      prompt_length: prompt?.length || 0,
      reference_images_count: referenceImages?.length || 0,
      reference_images_types: referenceImages?.map((r: string) => {
        if (!r) return 'null'
        if (r.startsWith('https://')) return 'https'
        if (r.startsWith('data:')) return 'data-uri'
        if (r.startsWith('blob:')) return 'blob'
        return 'unknown:' + r.substring(0, 30)
      }) || [],
    });

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

    // Get resolution-aware cost for tiered pricing (nano-banana-pro)
    const resolution = modelSettings?.resolution as string | undefined;
    const modelCost = getModelCost(model as ModelId, resolution);

    const modelCostCents = Math.round(modelCost * 100); // Convert to cents/points

    if (!userIsAdmin) {
      // Use resolution-specific cost for credit check
      const balance = await creditsService.getBalance(user.id);
      const currentBalance = balance?.balance ?? 0;

      if (currentBalance < modelCostCents) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            details: `You need ${modelCostCents} points but only have ${currentBalance} points.`,
            required: modelCostCents,
            balance: currentBalance,
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

    // Handle Anchor Transform mode
    if (enableAnchorTransform) {
      // Validate: Need at least 2 reference images (1 anchor + 1+ inputs)
      if (!referenceImages || referenceImages.length < 2) {
        return NextResponse.json(
          { error: 'Anchor Transform requires at least 2 reference images (1 anchor + 1+ inputs)' },
          { status: 400 }
        )
      }

      // Extract anchor and inputs
      const [anchorUrl, ...inputUrls] = referenceImages

      // Process anchor and inputs separately
      const processedAnchor = await processReferenceImages([anchorUrl], replicate)
      const processedInputs = await processReferenceImages(inputUrls, replicate)

      if (processedAnchor.length === 0) {
        return NextResponse.json(
          { error: 'Failed to process anchor image' },
          { status: 500 }
        )
      }

      // Get model config for cost calculation
      const modelConfig = getModelConfig(model as ImageModel)
      if (!modelConfig) {
        return NextResponse.json(
          { error: `Invalid model: ${model}` },
          { status: 400 }
        )
      }

      // Calculate total cost: 1 image per input (anchor is free)
      const numImages = inputUrls.length
      const resolution = modelSettings?.resolution as string | undefined
      const modelCost = getModelCost(model as ModelId, resolution)
      const totalCostCents = Math.round(modelCost * 100) * numImages

      // Check credits (admins bypass)
      if (!userIsAdmin) {
        const balance = await creditsService.getBalance(user.id)
        const currentBalance = balance?.balance ?? 0

        if (currentBalance < totalCostCents) {
          return NextResponse.json(
            {
              error: 'Insufficient credits for Anchor Transform',
              details: `You need ${totalCostCents} points but only have ${currentBalance} points.`,
              required: totalCostCents,
              balance: currentBalance,
            },
            { status: 402 }
          )
        }
      }

      // Generate one image per input (using anchor + input)
      const generatedImages: { predictionId: string; galleryId: string; imageUrl: string }[] = []
      let totalCreditsUsed = 0

      for (let i = 0; i < processedInputs.length; i++) {
        const inputUrl = processedInputs[i]
        const refsToSend = [processedAnchor[0], inputUrl]

        // Extract string URLs (buildReplicateInput expects string[] not objects)
        const refUrls = refsToSend.map(ref =>
          typeof ref === 'string' ? ref : ref.url
        )

        // Build Replicate input
        const replicateInput = ImageGenerationService.buildReplicateInput({
          model: model as ImageModel,
          prompt,
          referenceImages: refUrls,
          modelSettings: modelSettings as ImageModelSettings,
          userId: user.id,
        })

        // Get model identifier
        const replicateModelId = ImageGenerationService.getReplicateModelId(model as ImageModel)

        // Create prediction
        const prediction = await replicate.predictions.create({
          model: replicateModelId,
          input: replicateInput,
        })

        // Build metadata
        const metadata = ImageGenerationService.buildMetadata({
          model: model as ImageModel,
          prompt,
          referenceImages: refUrls,
          modelSettings: modelSettings as ImageModelSettings,
          userId: user.id,
          recipeId,
          recipeName,
        })

        // Create gallery entry
        const { data: gallery, error: galleryError } = await supabase
          .from('gallery')
          .insert({
            user_id: user.id,
            prediction_id: prediction.id,
            generation_type: 'image',
            status: 'pending',
            metadata: metadata as Database['public']['Tables']['gallery']['Insert']['metadata']
          })
          .select()
          .single()

        if (galleryError || !gallery) {
          lognog.devError('Gallery creation error', { error: galleryError?.message });
          continue
        }

        // Wait for completion
        const completedPrediction = await replicate.wait(prediction, { interval: 1000 })

        if (completedPrediction.status === 'succeeded' && completedPrediction.output) {
          // Normalize output to array
          const anchorOutputUrls = Array.isArray(completedPrediction.output)
            ? completedPrediction.output
            : [completedPrediction.output]
          const replicateUrl = anchorOutputUrls[0]

          // Upload to storage
          const { buffer } = await StorageService.downloadAsset(replicateUrl)
          const { ext, mimeType } = StorageService.getMimeType(replicateUrl, modelSettings?.outputFormat)
          const { publicUrl, storagePath, fileSize } = await StorageService.uploadToStorage(
            buffer,
            user.id,
            prediction.id,
            ext,
            mimeType
          )

          // Update gallery
          await supabase
            .from('gallery')
            .update({
              status: 'completed',
              public_url: publicUrl,
              storage_path: storagePath,
              file_size: fileSize,
              mime_type: mimeType,
            })
            .eq('id', gallery.id)

          // Process additional images from this anchor transform prediction
          if (anchorOutputUrls.length > 1) {
            for (let j = 1; j < anchorOutputUrls.length; j++) {
              const extraUrl = anchorOutputUrls[j]
              if (!extraUrl || typeof extraUrl !== 'string') continue

              try {
                const { buffer: extraBuffer } = await StorageService.downloadAsset(extraUrl)
                const { ext: extraExt, mimeType: extraMimeType } = StorageService.getMimeType(extraUrl, modelSettings?.outputFormat)
                const extraPredictionId = `${prediction.id}_img_${j}`
                const { publicUrl: extraPublicUrl, storagePath: extraStoragePath, fileSize: extraFileSize } =
                  await StorageService.uploadToStorage(extraBuffer, user.id, extraPredictionId, extraExt, extraMimeType)

                await supabase
                  .from('gallery')
                  .insert({
                    user_id: user.id,
                    prediction_id: extraPredictionId,
                    generation_type: 'image' as const,
                    status: 'completed',
                    storage_path: extraStoragePath,
                    public_url: extraPublicUrl,
                    file_size: extraFileSize,
                    mime_type: extraMimeType,
                    metadata: {
                      ...metadata,
                      replicate_url: extraUrl,
                      completed_at: new Date().toISOString(),
                      image_index: j,
                      total_images: anchorOutputUrls.length,
                      parent_prediction_id: prediction.id,
                    } as Database['public']['Tables']['gallery']['Insert']['metadata'],
                  })
              } catch (imgError) {
                lognog.devError(`Anchor transform: failed extra image ${j}`, {
                  error: imgError instanceof Error ? imgError.message : String(imgError)
                })
              }
            }
          }

          // Deduct credits (admins bypass) — once per prediction
          if (!userIsAdmin) {
            const deductResult = await creditsService.deductCredits(user.id, model, {
              generationType: 'image',
              predictionId: prediction.id,
              description: `Anchor Transform image ${i + 1}/${inputUrls.length} (${model})`,
              overrideAmount: Math.round(modelCost * 100),
              user_email: user.email,
            })
            if (deductResult.success) {
              totalCreditsUsed += modelCost
            }
          }

          generatedImages.push({
            predictionId: prediction.id,
            galleryId: gallery.id,
            imageUrl: publicUrl,
          })

          // Log generation event
          await generationEventsService.logGeneration({
            user_id: user.id,
            user_email: user.email,
            gallery_id: gallery.id,
            prediction_id: prediction.id,
            generation_type: 'image',
            model_id: model,
            model_name: modelConfig.name || model,
            credits_cost: userIsAdmin ? 0 : modelCost,
            is_admin_generation: userIsAdmin,
            prompt: prompt,
            settings: modelSettings
          })
        }
      }

      // Return all generated images
      return NextResponse.json({
        anchorTransformUsed: true,
        images: generatedImages,
        status: 'completed',
        creditsUsed: totalCreditsUsed,
      })
    }

    // Normal mode (not Anchor Transform)
    // Process reference images - upload local/inaccessible URLs to Replicate
    let processedReferenceImages = referenceImages;
    if (referenceImages && referenceImages.length > 0) {
      lognog.devDebug('Processing reference images', {
        input_count: referenceImages.length,
        first_url_preview: typeof referenceImages[0] === 'string' ? referenceImages[0].substring(0, 80) : 'not-string',
      });
      processedReferenceImages = await processReferenceImages(referenceImages, replicate);
      lognog.devDebug('Processed reference images', {
        input_count: referenceImages.length,
        output_count: processedReferenceImages.length,
        output_types: processedReferenceImages.map((r: string | { url: string }) => typeof r === 'string' ? (r.startsWith('https') ? 'https' : r.substring(0, 20)) : 'object'),
      });
    } else {
      lognog.devDebug('No reference images in request', {
        referenceImages_is_null: referenceImages === null,
        referenceImages_is_undefined: referenceImages === undefined,
        referenceImages_length: referenceImages?.length,
      });
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
    lognog.devDebug('Using Replicate model', {
      model_id: replicateModelId,
      has_webhook: !!process.env.WEBHOOK_URL,
      replicate_input_has_image: !!replicateInput.image,
      replicate_input_has_reference_images: !!replicateInput.reference_images,
      replicate_input_keys: Object.keys(replicateInput),
    });

    // Create Replicate prediction with webhook (if configured)
    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : null;

    let prediction;
    try {
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

      const replicateStart = Date.now();
      prediction = await replicate.predictions.create(predictionOptions);
      const replicateLatency = Date.now() - replicateStart;

      // Log Replicate integration success
      lognog.debug(`replicate OK ${replicateLatency}ms ${replicateModelId}`, {
        type: 'integration',
        integration: 'replicate',
        latency_ms: replicateLatency,
        success: true,
        model: replicateModelId,
        prediction_id: prediction.id,
        prompt_length: prompt?.length,
        prompt: prompt,
        user_id: user.id,
        user_email: user.email,
      });
    } catch (replicateError: unknown) {
      const error = replicateError as {
        message?: string;
        response?: {
          status?: number;
          statusText?: string;
          data?: unknown;
        };
      };

      // Log Replicate integration failure
      lognog.warn(`replicate FAIL ${Date.now() - apiStart}ms ${replicateModelId}`, {
        type: 'integration',
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
    // Merge extraMetadata (storybook, etc.) into metadata if provided
    const finalMetadata = extraMetadata
      ? { ...metadata, ...extraMetadata }
      : metadata;

    const { data: gallery, error: galleryError } = await supabase
      .from('gallery')
      .insert({
        user_id: user.id, // ✅ Use authenticated user
        prediction_id: prediction.id,
        generation_type: 'image',
        status: 'pending',
        metadata: finalMetadata as Database['public']['Tables']['gallery']['Insert']['metadata'],
        // Gallery organization: assign to folder if provided (for storybook projects)
        ...(folderId && { folder_id: folderId }),
      })
      .select()
      .single();

    if (galleryError || !gallery) {
      lognog.devError('Gallery creation error', { error: galleryError?.message });
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

    // Poll for results if no webhook configured OR if caller explicitly requests it (e.g., storyboard batch generation)
    if (!webhookUrl || waitForResult) {
      lognog.devDebug('No webhook - polling for results');
      try {
        // Wait for prediction to complete (up to 5 minutes)
        const completedPrediction = await replicate.wait(prediction, {
          interval: 1000, // Check every second
        });

        lognog.devDebug('Prediction completed', { status: completedPrediction.status });

        if (completedPrediction.status === 'succeeded' && completedPrediction.output) {
          // Normalize output to array
          const outputUrls = Array.isArray(completedPrediction.output)
            ? completedPrediction.output
            : [completedPrediction.output];
          const replicateUrl = outputUrls[0];

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
              lognog.devError('Failed to update gallery', { error: updateError.message });
            }

            // Process additional images (output[1..n]) — insert new gallery rows
            if (outputUrls.length > 1) {
              lognog.devDebug('Multi-image output', { count: outputUrls.length });

              for (let i = 1; i < outputUrls.length; i++) {
                const extraUrl = outputUrls[i];
                if (!extraUrl || typeof extraUrl !== 'string') continue;

                try {
                  const { buffer: extraBuffer } = await StorageService.downloadAsset(extraUrl);
                  const { ext: extraExt, mimeType: extraMimeType } = StorageService.getMimeType(extraUrl, modelSettings?.outputFormat);
                  const extraPredictionId = `${prediction.id}_img_${i}`;
                  const { publicUrl: extraPublicUrl, storagePath: extraStoragePath, fileSize: extraFileSize } =
                    await StorageService.uploadToStorage(extraBuffer, user.id, extraPredictionId, extraExt, extraMimeType);

                  const currentMetadata = (finalMetadata as Record<string, unknown>) || {};
                  await supabase
                    .from('gallery')
                    .insert({
                      user_id: user.id,
                      prediction_id: extraPredictionId,
                      generation_type: 'image' as const,
                      status: 'completed',
                      storage_path: extraStoragePath,
                      public_url: extraPublicUrl,
                      file_size: extraFileSize,
                      mime_type: extraMimeType,
                      metadata: {
                        ...currentMetadata,
                        replicate_url: extraUrl,
                        completed_at: new Date().toISOString(),
                        image_index: i,
                        total_images: outputUrls.length,
                        parent_prediction_id: prediction.id,
                      } as Database['public']['Tables']['gallery']['Insert']['metadata'],
                      ...(folderId && { folder_id: folderId }),
                    });

                  lognog.devDebug(`Saved additional image ${i}`, { url: extraPublicUrl });
                } catch (imgError) {
                  lognog.devError(`Failed to process additional image ${i}`, {
                    error: imgError instanceof Error ? imgError.message : String(imgError)
                  });
                }
              }
            }

            // ✅ CREDITS: Deduct credits only AFTER successful generation (admins bypass)
            // Charged once per prediction, not per image
            if (!userIsAdmin) {
              const deductResult = await creditsService.deductCredits(user.id, model, {
                generationType: 'image',
                predictionId: prediction.id,
                description: `Image generation (${model}${resolution ? ` @ ${resolution}` : ''})`,
                overrideAmount: modelCostCents, // Use resolution-specific cost
                user_email: user.email,
              })
              if (!deductResult.success) {
                lognog.devError('Failed to deduct credits', { error: deductResult.error });
              }
            }

            // Log successful generation
            lognog.info('generation_completed', {
              type: 'business',
              event: 'generation_completed',
              user_id: user.id,
              user_email: user.email,
              model: model,
              prediction_id: prediction.id,
              credits_deducted: creditsCost,
              reason: 'image_generation',
            });

            // Log API success
            lognog.info(`POST /api/generation/image 200 (${Date.now() - apiStart}ms)`, {
              type: 'api',
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
              imageCount: outputUrls.length,
            });
          } catch (uploadError) {
            // Log detailed error for debugging in production
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';

            // Log storage failure
            lognog.error('Storage upload failed', {
              type: 'error',
              route: '/api/generation/image',
              user_id: user.id,
              user_email: user.email,
              model: model,
              prediction_id: prediction.id,
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
        lognog.devError('Polling error', {
          error: pollError instanceof Error ? pollError.message : String(pollError)
        });
        // Return pending status if polling fails
      }
    }

    return NextResponse.json({
      predictionId: prediction.id,
      galleryId: gallery.id,
      status: prediction.status,
    });

  } catch (error) {
    // Log error
    lognog.error(error instanceof Error ? error.message : 'Image generation failed', {
      type: 'error',
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/generation/image',
      user_id: userId,
    });

    // Log API failure
    lognog.info(`POST /api/generation/image 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
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
