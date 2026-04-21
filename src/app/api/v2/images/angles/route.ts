import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { creditsService } from '@/features/credits'
import { StorageService } from '@/features/generation/services/storage.service'
import { createLogger } from '@/lib/logger'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
const log = createLogger('V2:Angles')
const MODEL = 'google/nano-banana-2'
const COST = 20

const GRID_PROMPT = `A professional 3x3 grid contact sheet showing the SAME character from 9 different cinematic camera angles. The character/subject should be IDENTICAL in all 9 cells, only the camera angle changes.

Grid layout (left to right, top to bottom):

TOP ROW:
1. EXTREME WIDE SHOT - distant establishing view, full environment visible, subject small in frame
2. WIDE SHOT - full body visible with environmental context, head to toe
3. MEDIUM-LONG SHOT - knee-up framing, subject dominates but environment visible

MIDDLE ROW:
4. MEDIUM SHOT - waist-up framing, conversational distance
5. MEDIUM CLOSE-UP - chest-up framing, intimate
6. CLOSE-UP - face filling frame, emotional, details visible

BOTTOM ROW:
7. EXTREME CLOSE-UP - macro detail shot, eyes or specific feature
8. LOW ANGLE - looking up at subject, heroic/powerful perspective
9. HIGH ANGLE - looking down at subject, vulnerable/contemplative

CRITICAL REQUIREMENTS:
- All 9 cells show the EXACT SAME character/subject
- Clean black separator lines between cells (thin borders)
- Consistent lighting and style across all cells
- Professional cinematography reference sheet aesthetic
- Square 1:1 aspect ratio for the overall grid
- Each cell is also square (equal width/height)

Use the reference image as the character to depict in all 9 angles.`

// Label-free prompt variant. Used when the caller passes skip_labels: true so
// the downstream cell-slicer (for Seedance/Runway) doesn't inherit bits of
// "CONTACT SHEET" / "MEDIUM CLOSE-UP" / etc. baked into each cell.
const GRID_PROMPT_CLEAN = `A professional 3x3 grid showing the SAME character from 9 different cinematic camera angles. The character/subject must be IDENTICAL in all 9 cells — only the camera angle changes.

Grid layout (left to right, top to bottom):

TOP ROW:
- Extreme wide shot — distant establishing view, full environment visible, subject small in frame
- Wide shot — full body visible with environmental context, head to toe
- Medium-long shot — knee-up framing, subject dominates but environment visible

MIDDLE ROW:
- Medium shot — waist-up framing, conversational distance
- Medium close-up — chest-up framing, intimate
- Close-up — face filling frame, emotional, details visible

BOTTOM ROW:
- Extreme close-up — macro detail shot, eyes or specific feature
- Low angle — looking up at subject, heroic/powerful perspective
- High angle — looking down at subject, vulnerable/contemplative

CRITICAL REQUIREMENTS:
- All 9 cells show the EXACT SAME character/subject
- Clean black separator lines between cells (thin borders)
- Consistent lighting and style across all cells
- Square 1:1 aspect ratio for the overall grid, each cell equal width/height
- DO NOT render any text, labels, numbers, captions, headings, or watermarks in the output image
- DO NOT include a "CONTACT SHEET" header or any visible annotation of shot types
- The cells must be pure imagery only — clean enough that the viewer could slice each cell out and use it as a standalone shot

Use the reference image as the character to depict in all 9 angles.`

/**
 * POST /api/v2/images/angles
 *
 * Generate a 3x3 cinematic camera angles grid from a reference image.
 * Same subject shown from 9 different camera angles.
 *
 * Body:
 *   image_url   string   (required) URL of the reference image
 *   skip_labels boolean  (optional) If true, strips all text/labels from the
 *                        output so each cell is pure imagery — suitable for
 *                        slicing the 3x3 grid into individual shots for
 *                        downstream Seedance/Runway use. Defaults to false
 *                        for backward compatibility.
 *   clean       boolean  Alias for skip_labels.
 * Cost: 20 pts
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const { image_url, skip_labels, clean } = body
    const wantClean = Boolean(skip_labels || clean)

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

    log.info('Angles grid: starting', { userId: auth.userId, clean: wantClean })

    // Generate via Replicate
    const prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        prompt: wantClean ? GRID_PROMPT_CLEAN : GRID_PROMPT,
        image_input: [image_url],
        aspect_ratio: '1:1',
      },
    })

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status === 'failed') {
      log.error('Angles grid failed', { predictionId: result.id, error: result.error })
      return errors.internal('Angles grid generation failed')
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
        description: 'API v2: Angles grid generation',
        overrideAmount: COST,
        user_email: auth.email,
      })
    }

    log.info('Angles grid complete', { predictionId: result.id, userId: auth.userId })

    return successResponse({
      url: publicUrl,
      prediction_id: result.id,
      grid_type: 'angles',
      skip_labels: wantClean,
      pts_used: auth.isAdmin ? 0 : COST,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    log.error('Angles grid error', { error: msg })
    return errors.internal(msg)
  }
}
