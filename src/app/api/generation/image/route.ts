export const maxDuration = 300

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
import type { Database } from '@/lib/db/types';
import fs from 'fs';
import path from 'path';
import { lognog } from '@/lib/lognog';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Call fal.ai Klein 9B + LoRA
 * Text-to-image: fal-ai/flux-2/klein/9b/base/lora
 * Edit (img2img): fal-ai/flux-2/klein/9b/base/edit/lora
 * Replicate's Klein 9B LoRA endpoint produces blurry results (insufficient inference steps).
 * fal.ai exposes num_inference_steps and guidance_scale, producing crisp results.
 */
async function callFalAiKleinLora(params: {
  prompt: string;
  loras: { path: string; scale: number }[];
  imageUrls?: string[];  // If provided, uses edit endpoint (img2img + LoRA)
  imageSize?: string | { width: number; height: number };
  outputFormat: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  numImages?: number;
}): Promise<{ images: { url: string; width: number; height: number }[]; seed: number }> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error('FAL_KEY not configured');

  const isEdit = params.imageUrls && params.imageUrls.length > 0;
  const endpoint = isEdit
    ? 'https://fal.run/fal-ai/flux-2/klein/9b/base/edit/lora'
    : 'https://fal.run/fal-ai/flux-2/klein/9b/base/lora';

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    loras: params.loras,
    output_format: params.outputFormat === 'jpg' ? 'jpeg' : params.outputFormat,
    num_inference_steps: params.numInferenceSteps || 28,
    guidance_scale: params.guidanceScale || 5,
    num_images: Math.min(params.numImages || 1, 4),
    enable_safety_checker: false,
  };

  if (isEdit) {
    body.image_urls = params.imageUrls;
  }

  if (params.imageSize) {
    body.image_size = params.imageSize;
  }

  lognog.devDebug(`Calling fal.ai Klein 9B ${isEdit ? 'edit' : 'txt2img'} + LoRA`, {
    prompt_length: params.prompt.length,
    lora_count: params.loras.length,
    image_count: params.imageUrls?.length || 0,
    steps: body.num_inference_steps,
    guidance: body.guidance_scale,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[fal.ai] ${response.status} from ${endpoint}:`, errorText);
    lognog.error('fal.ai Klein LoRA API error', {
      status: response.status,
      error: errorText,
      type: 'integration',
      integration: 'fal',
      endpoint,
      lora_count: params.loras.length,
      lora_urls: params.loras.map(l => l.path?.substring(0, 80)),
    });
    throw new Error(`fal.ai API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

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

    // Rate limit check (admins bypass)
    if (!isAdminEmail(user.email)) {
      const rl = checkRateLimit(`image:${user.id}`, RATE_LIMITS.IMAGE_GENERATION);
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        );
      }
    }

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
      reference_images_types: referenceImages?.map((r: string | { url: string; weight?: number }) => {
        const url = typeof r === 'string' ? r : r?.url
        if (!url) return 'null'
        if (url.startsWith('https://')) return 'https'
        if (url.startsWith('data:')) return 'data-uri'
        if (url.startsWith('blob:')) return 'blob'
        return 'unknown:' + url.substring(0, 30)
      }) || [],
    });

    // Validate required fields
    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    // Prompt can be empty for camera angle (angle tokens serve as prompt)
    // and for style-transfer/character-sheet modes (reference images provide context)
    const cameraEnabled = model === 'qwen-image-edit' && modelSettings?.cameraEnabled
    const hasReferenceImages = referenceImages && referenceImages.length > 0
    if (!prompt && !cameraEnabled && !hasReferenceImages) {
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

    // Get tier-aware cost for tiered pricing.
    // nano-banana-2: keyed by resolution (1K/2K). gpt-image-2: keyed by quality (low/medium).
    const resolution = modelSettings?.resolution as string | undefined;
    const quality = modelSettings?.quality as string | undefined;
    const tierKey = model === 'gpt-image-2' ? quality : resolution;
    const modelCost = getModelCost(model as ModelId, tierKey);

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
      const quality = modelSettings?.quality as string | undefined
      const tierKey = model === 'gpt-image-2' ? quality : resolution
      const modelCost = getModelCost(model as ModelId, tierKey)
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

    // Get model identifier - swap to LoRA/img2img variant as needed
    const ms = modelSettings as Record<string, unknown>
    const loraActive = !!ms?.loraWeightsUrl || (Array.isArray(ms?.loraWeightsUrls) && (ms.loraWeightsUrls as string[]).length > 0)
    const hasReferenceImage = processedReferenceImages && processedReferenceImages.length > 0

    // ── fal.ai path: Klein 9B + LoRA (Replicate endpoint lacks steps/guidance controls) ──
    const useKleinFal = model === 'flux-2-klein-9b' && loraActive && !!process.env.FAL_KEY
    if (useKleinFal) {
      lognog.devDebug('Routing to fal.ai for Klein 9B + LoRA', { model, loraActive, hasReferenceImage });

      // Build LoRA array for fal.ai: [{path, scale}] — outside try so catch can reference it
      const loraUrls = (ms.loraWeightsUrls as string[]) || (ms.loraWeightsUrl ? [ms.loraWeightsUrl as string] : []);
      const loraScales = (ms.loraScales as number[]) || [ms.loraScale as number ?? 1.0];
      const falLoras = loraUrls
        .map((url, i) => ({
          path: url,
          scale: loraScales[i] ?? 1.0,
        }))
        .filter(l => l.path && l.path.startsWith('http'));

      if (falLoras.length === 0) {
        return NextResponse.json({ error: 'No valid LoRA URLs provided' }, { status: 400 });
      }

      try {

        // Map aspect ratio to fal.ai image_size format
        const settings = modelSettings as Record<string, unknown>;
        const aspectRatio = (settings.aspectRatio as string) || '16:9';
        const FAL_SIZE_MAP: Record<string, string> = {
          '1:1': 'square_hd',
          '16:9': 'landscape_16_9',
          '9:16': 'portrait_16_9',
          '4:3': 'landscape_4_3',
          '3:4': 'portrait_4_3',
        };
        const falImageSize = FAL_SIZE_MAP[aspectRatio] || 'landscape_16_9';

        // Build reference image URLs for edit mode (img2img + LoRA)
        let falImageUrls: string[] | undefined;
        if (hasReferenceImage && processedReferenceImages.length > 0) {
          // Get publicly accessible URLs for fal.ai
          const imageUrls: string[] = [];
          for (const ref of referenceImages) {
            const refUrl = typeof ref === 'string' ? ref : ref?.url;
            if (!refUrl) continue;

            if (refUrl.startsWith('data:image/')) {
              // Upload base64 to Supabase Storage for a public URL
              const matches = refUrl.match(/^data:image\/(\w+);base64,(.+)$/);
              if (!matches) continue;
              const [, format, base64Data] = matches;
              const imageBuffer = Buffer.from(base64Data, 'base64');
              const ext = format === 'jpeg' ? 'jpg' : format;
              const mimeType = `image/${format}`;
              const tempId = `fal_klein_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              const { publicUrl } = await StorageService.uploadToStorage(
                imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength),
                user.id, `temp_${tempId}`, ext, mimeType
              );
              imageUrls.push(publicUrl);
            } else if (isPublicUrl(refUrl)) {
              imageUrls.push(refUrl);
            }
          }
          if (imageUrls.length > 0) {
            falImageUrls = imageUrls.slice(0, 4); // fal.ai max 4 images
          }
        }

        const falStart = Date.now();
        const falResult = await callFalAiKleinLora({
          prompt,
          loras: falLoras,
          imageUrls: falImageUrls,
          imageSize: falImageSize,
          outputFormat: (settings.outputFormat as string) || 'jpg',
        });
        const falLatency = Date.now() - falStart;

        const falEndpoint = falImageUrls ? 'fal-ai/flux-2/klein/9b/base/edit/lora' : 'fal-ai/flux-2/klein/9b/base/lora';
        lognog.debug(`fal.ai OK ${falLatency}ms klein-9b-lora`, {
          type: 'integration',
          integration: 'fal',
          latency_ms: falLatency,
          success: true,
          model: falEndpoint,
          edit_mode: !!falImageUrls,
          user_id: user.id,
          user_email: user.email,
        });

        // Download results from fal.ai and upload to Supabase Storage
        if (!falResult.images?.length) {
          return NextResponse.json({ error: 'fal.ai returned no images' }, { status: 500 });
        }

        const outputFormat = (settings.outputFormat as string) || 'jpg';
        const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
        const mimeType = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
        const basePredictionId = `fal_klein_${Date.now()}_${falResult.seed || Math.random().toString(36).slice(2, 8)}`;

        const metadata = ImageGenerationService.buildMetadata({
          model: model as ImageModel,
          prompt,
          referenceImages,
          modelSettings: modelSettings as ImageModelSettings,
          userId: user.id,
          recipeId,
          recipeName,
        });
        const baseMetadata = extraMetadata
          ? { ...metadata, ...extraMetadata, provider: 'fal', fal_seed: falResult.seed }
          : { ...metadata, provider: 'fal', fal_seed: falResult.seed };

        const modelConfig = getModelConfig(model as ImageModel);
        let firstGalleryId = '';
        let firstPublicUrl = '';

        for (let i = 0; i < falResult.images.length; i++) {
          const falImg = falResult.images[i];
          if (!falImg?.url) continue;

          const imgPredictionId = falResult.images.length > 1 ? `${basePredictionId}_img_${i}` : basePredictionId;
          const { buffer } = await StorageService.downloadAsset(falImg.url);
          const { publicUrl, storagePath, fileSize } = await StorageService.uploadToStorage(
            buffer, user.id, imgPredictionId, ext, mimeType
          );

          if (i === 0) firstPublicUrl = publicUrl;

          const imgMetadata = falResult.images.length > 1
            ? { ...baseMetadata, image_index: i, total_images: falResult.images.length }
            : baseMetadata;

          const { data: gallery, error: galleryError } = await supabase
            .from('gallery')
            .insert({
              user_id: user.id,
              prediction_id: imgPredictionId,
              generation_type: 'image',
              status: 'completed',
              public_url: publicUrl,
              storage_path: storagePath,
              file_size: fileSize,
              mime_type: mimeType,
              metadata: imgMetadata as Database['public']['Tables']['gallery']['Insert']['metadata'],
              ...(folderId && { folder_id: folderId }),
            })
            .select()
            .single();

          if (galleryError || !gallery) {
            lognog.devError(`Gallery creation error (fal.ai Klein image ${i})`, { error: galleryError?.message });
            continue;
          }

          if (i === 0) firstGalleryId = gallery.id;

          await generationEventsService.logGeneration({
            user_id: user.id,
            user_email: user.email,
            gallery_id: gallery.id,
            prediction_id: imgPredictionId,
            generation_type: 'image',
            model_id: model,
            model_name: modelConfig?.name || model,
            credits_cost: userIsAdmin ? 0 : modelCostCents,
            is_admin_generation: userIsAdmin,
            prompt,
            settings: modelSettings,
          });
        }

        if (!userIsAdmin) {
          await creditsService.deductCredits(user.id, model, {
            generationType: 'image',
            predictionId: basePredictionId,
            description: `Image generation (${model} via fal.ai${falResult.images.length > 1 ? ` x${falResult.images.length}` : ''})`,
            overrideAmount: modelCostCents,
            user_email: user.email,
          });
        }

        lognog.info('generation_completed', {
          type: 'business',
          event: 'generation_completed',
          user_id: user.id,
          user_email: user.email,
          model,
          prediction_id: basePredictionId,
          credits_deducted: userIsAdmin ? 0 : modelCostCents,
          reason: 'image_generation',
          provider: 'fal',
          image_count: falResult.images.length,
        });

        return NextResponse.json({
          predictionId: basePredictionId,
          galleryId: firstGalleryId,
          status: 'completed',
          imageUrl: firstPublicUrl,
          imageCount: falResult.images.length,
        });
      } catch (falError) {
        const errMsg = falError instanceof Error ? falError.message : String(falError);
        const errStack = falError instanceof Error ? falError.stack : undefined;
        console.error('[fal.ai Klein LoRA] Generation failed:', errMsg, errStack);
        lognog.error('fal.ai Klein LoRA generation failed', {
          type: 'error',
          integration: 'fal',
          error: errMsg,
          stack: errStack,
          user_id: user.id,
          lora_count: falLoras.length,
          loras: falLoras.map(l => ({ path: l.path?.substring(0, 80), scale: l.scale })),
          has_reference_images: hasReferenceImage,
        });
        return NextResponse.json(
          { error: 'Image generation failed', details: errMsg },
          { status: 500 }
        );
      }
    }
    // ── End fal.ai Klein path ──

    const replicateModelId = ImageGenerationService.getReplicateModelId(model as ImageModel, loraActive, hasReferenceImage);
    lognog.devDebug('Using Replicate model', {
      model_id: replicateModelId,
      lora_active: loraActive,
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
      // Build prediction options - some models require version-based predictions
      const versionHash = ImageGenerationService.getVersionForModel(model as ImageModel, loraActive, hasReferenceImage);
      const predictionOptions: Record<string, unknown> = versionHash
        ? { version: versionHash, input: replicateInput }
        : { model: replicateModelId, input: replicateInput };

      // Only add webhook if URL is configured (production)
      if (webhookUrl) {
        predictionOptions.webhook = webhookUrl;
        predictionOptions.webhook_events_filter = ['completed'];
      }

      const replicateStart = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prediction = await replicate.predictions.create(predictionOptions as any);
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
          // Persist the actual Replicate error so the client polling/subscription
          // can surface it to the user (instead of a generic "Generation failed").
          const replicateError = completedPrediction.error
            ? (typeof completedPrediction.error === 'string' ? completedPrediction.error : JSON.stringify(completedPrediction.error))
            : 'Prediction failed on Replicate';
          await supabase
            .from('gallery')
            .update({ status: 'failed', error_message: replicateError })
            .eq('id', gallery.id);

          return NextResponse.json({
            predictionId: prediction.id,
            galleryId: gallery.id,
            status: 'failed',
            error: replicateError,
          });
        }
      } catch (pollError) {
        // If replicate.wait() throws, the prediction is in an unknown state.
        // Mark the gallery row as failed so the client's polling/subscription
        // immediately surfaces a failure — otherwise the spinner runs until
        // the client-side hard timeout (up to 5 min).
        const errMsg = pollError instanceof Error ? pollError.message : String(pollError);
        lognog.devError('Polling error', { error: errMsg });
        try {
          await supabase
            .from('gallery')
            .update({ status: 'failed', error_message: `Replicate polling failed: ${errMsg}` })
            .eq('id', gallery.id);
        } catch { /* best-effort only */ }
      }
    }

    return NextResponse.json({
      predictionId: prediction.id,
      galleryId: gallery.id,
      status: prediction.status,
    });

  } catch (error) {
    // RAW terminal log for debugging (bypasses lognog)
    console.error('[API /generation/image] UNCAUGHT ERROR:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) console.error('[API /generation/image] STACK:', error.stack);

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
      {
        error: 'Failed to create image generation prediction',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}
