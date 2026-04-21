import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { creditsService } from '@/features/credits'
import { StorageService } from '@/features/generation/services/storage.service'
import { createLogger } from '@/lib/logger'
import { buildCameraAnglePrompt, getCameraAngleDescription } from '@/features/shot-creator/helpers/camera-angle.helper'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
const log = createLogger('V2:CameraAngle')

// qwen-image-edit-plus-lora version hash (mirrored from
// image-generation.service.ts — keep in sync when bumping the UI model).
const QWEN_VERSION = 'b37d69a6b94414c96cc4ecb16660b472bb62284f2293d4b65537c09b8500e200'
const MODEL_LABEL = 'qwen-image-edit'

// Multi-angle LoRA auto-injected on every request (this is the whole point
// of the endpoint — it's what preserves subject + lighting while rotating
// the camera around).
const MULTI_ANGLE_LORA_URL = 'https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA/resolve/main/qwen-image-edit-2511-multiple-angles-lora.safetensors'

const COST = 5

const VALID_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', 'match_input_image']
const VALID_OUTPUT_FORMATS = ['jpg', 'png', 'webp']

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

/**
 * POST /api/v2/images/camera-angle
 *
 * Orbit the camera around the subject in a single reference image while
 * preserving identity and lighting. This is the same engine behind the
 * Shot Creator's 3D gizmo — exposed so API clients can produce matched
 * coverage of a locked subject (e.g. two characters filmed from the same
 * master, but with the camera rotated to cover each one).
 *
 * Body:
 *   image_url      string   (required) URL of the reference image
 *   azimuth        number   (optional, default 0)   Horizontal rotation 0-360°
 *                                                   (0=front, 90=right, 180=back, 270=left)
 *   elevation      number   (optional, default 0)   Vertical tilt -30° (low) to 60° (high)
 *   distance       number   (optional, default 5)   0=wide, 10=close-up
 *   prompt         string   (optional)              Extra user prompt appended after camera tokens
 *   lora_scale     number   (optional, default 1.25) LoRA strength, 0-4
 *   aspect_ratio   string   (optional, default 'match_input_image')
 *                                                   One of: 1:1, 16:9, 9:16, 4:3, 3:4, match_input_image
 *   output_format  string   (optional, default 'webp')  jpg | png | webp
 *
 * Cost: 5 pts
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const {
      image_url,
      azimuth: rawAzimuth,
      elevation: rawElevation,
      distance: rawDistance,
      prompt: userPrompt,
      lora_scale: rawLoraScale,
      aspect_ratio: rawAspectRatio,
      output_format: rawOutputFormat,
    } = body

    if (!image_url || typeof image_url !== 'string') {
      return errors.validation('image_url is required — provide a URL to the reference image')
    }

    // Validate + clamp numeric inputs. Out-of-range values get clamped rather
    // than rejected, matching the Shot Creator slider behavior.
    const azimuth = rawAzimuth === undefined ? 0 : Number(rawAzimuth)
    const elevation = rawElevation === undefined ? 0 : Number(rawElevation)
    const distance = rawDistance === undefined ? 5 : Number(rawDistance)
    const loraScale = rawLoraScale === undefined ? 1.25 : Number(rawLoraScale)

    if ([azimuth, elevation, distance, loraScale].some(v => !Number.isFinite(v))) {
      return errors.validation('azimuth / elevation / distance / lora_scale must be numeric')
    }

    const cameraAngle = {
      azimuth: ((azimuth % 360) + 360) % 360, // normalize to [0, 360)
      elevation: clamp(elevation, -30, 60),
      distance: clamp(distance, 0, 10),
    }
    const clampedLoraScale = clamp(loraScale, 0, 4)

    const aspectRatio =
      typeof rawAspectRatio === 'string' && VALID_ASPECT_RATIOS.includes(rawAspectRatio)
        ? rawAspectRatio
        : 'match_input_image'
    const outputFormat =
      typeof rawOutputFormat === 'string' && VALID_OUTPUT_FORMATS.includes(rawOutputFormat)
        ? rawOutputFormat
        : 'webp'

    // Balance check
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      if (!balance || balance.balance < COST) {
        return errors.insufficientPts(COST, balance?.balance ?? 0)
      }
    }

    // Build the camera-angle prompt. This is the same helper the Shot
    // Creator uses, so UI and API produce identical outputs.
    const cameraPrompt = buildCameraAnglePrompt(cameraAngle)
    const fullPrompt = userPrompt && typeof userPrompt === 'string' && userPrompt.trim()
      ? `${cameraPrompt} ${userPrompt.trim()}`
      : cameraPrompt

    log.info('Camera Angle: starting', {
      userId: auth.userId,
      camera: getCameraAngleDescription(cameraAngle),
      loraScale: clampedLoraScale,
    })

    // Generate via Replicate (hash-based version, not model shorthand)
    const prediction = await replicate.predictions.create({
      version: QWEN_VERSION,
      input: {
        prompt: fullPrompt,
        image: [image_url],
        lora_weights: MULTI_ANGLE_LORA_URL,
        lora_scale: clampedLoraScale,
        aspect_ratio: aspectRatio,
        output_format: outputFormat,
      },
    })

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled') {
      await new Promise(r => setTimeout(r, 2000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status !== 'succeeded') {
      log.error('Camera Angle failed', { predictionId: result.id, status: result.status, error: result.error })
      return errors.internal(`Camera Angle generation ${result.status}: ${result.error || 'unknown error'}`)
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return errors.internal('No output from model')
    }

    // Persist to storage
    const { buffer } = await StorageService.downloadAsset(String(outputUrl))
    const { ext, mimeType } = StorageService.getMimeType(String(outputUrl), outputFormat)
    const { publicUrl } = await StorageService.uploadToStorage(buffer, auth.userId, result.id, ext, mimeType)

    // Deduct credits
    if (!auth.isAdmin) {
      await creditsService.deductCredits(auth.userId, MODEL_LABEL, {
        generationType: 'image',
        predictionId: result.id,
        description: 'API v2: Camera Angle (Qwen multi-angle)',
        overrideAmount: COST,
        user_email: auth.email,
      })
    }

    log.info('Camera Angle complete', { predictionId: result.id, userId: auth.userId })

    return successResponse({
      url: publicUrl,
      prediction_id: result.id,
      camera: {
        azimuth: cameraAngle.azimuth,
        elevation: cameraAngle.elevation,
        distance: cameraAngle.distance,
        description: getCameraAngleDescription(cameraAngle),
        lora_scale: clampedLoraScale,
      },
      aspect_ratio: aspectRatio,
      output_format: outputFormat,
      pts_used: auth.isAdmin ? 0 : COST,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    log.error('Camera Angle error', { error: msg })
    return errors.internal(msg)
  }
}
