import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { creditsService } from '@/features/credits'
import { StorageService } from '@/features/generation/services/storage.service'
import { createLogger } from '@/lib/logger'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
const log = createLogger('V2:BRoll')
const MODEL = 'google/nano-banana-2'
const COST = 20

const BROLL_PROMPT = `A 3x3 grid collage of 9 different B-roll shots that complement and extend the provided reference image.

IMPORTANT: Use the provided reference image to match the exact color palette, lighting conditions, and visual setting. All 9 cells should feel like they belong to the same scene.

The 9 cells show diverse scene elements: an establishing wide shot, a foreground detail close-up, a background element with depth, a key object or prop close-up, a texture or material macro shot, a hands or action insert, ambient background activity, a symbolic or thematic element, and an architectural framing element.

Each cell shows a different element from the same visual world - not different angles of the same subject, but different subjects that share the same look and feel. Clear separation between cells with thin black borders.

CRITICAL RULES:
- ABSOLUTELY NO TEXT, labels, captions, titles, or overlays of any kind on the image
- No words, letters, or descriptions rendered on any cell
- Pure photographic/cinematic imagery only
- The color temperature, lighting direction, and overall mood must match across all 9 cells`

/**
 * POST /api/v2/images/broll
 *
 * Generate a 3x3 B-roll grid from a reference image.
 * 9 complementary shots from the same visual world (different subjects, same feel).
 *
 * Body: { image_url: string }
 * Cost: 20 pts
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const { image_url } = body

    if (!image_url) {
      return errors.validation('image_url is required — provide a URL to the reference image')
    }

    // Balance check
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      if (!balance || balance.balance < COST) {
        return errors.insufficientPts(COST, balance?.balance ?? 0)
      }
    }

    log.info('B-Roll grid: starting', { userId: auth.userId })

    // Generate via Replicate
    const prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        prompt: BROLL_PROMPT,
        image_input: [image_url],
        aspect_ratio: '16:9',
      },
    })

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status === 'failed') {
      log.error('B-Roll grid failed', { predictionId: result.id, error: result.error })
      return errors.internal('B-Roll grid generation failed')
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return errors.internal('No output from model')
    }

    // Persist to storage
    const { buffer } = await StorageService.downloadAsset(String(outputUrl))
    const { ext, mimeType } = StorageService.getMimeType(String(outputUrl), 'jpg')
    const { publicUrl } = await StorageService.uploadToStorage(buffer, auth.userId, result.id, ext, mimeType)

    // Deduct credits
    if (!auth.isAdmin) {
      await creditsService.deductCredits(auth.userId, MODEL, {
        generationType: 'image',
        predictionId: result.id,
        description: 'API v2: B-Roll grid generation',
        overrideAmount: COST,
        user_email: auth.email,
      })
    }

    log.info('B-Roll grid complete', { predictionId: result.id, userId: auth.userId })

    return successResponse({
      url: publicUrl,
      prediction_id: result.id,
      grid_type: 'broll',
      pts_used: auth.isAdmin ? 0 : COST,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    log.error('B-Roll grid error', { error: msg })
    return errors.internal(msg)
  }
}
