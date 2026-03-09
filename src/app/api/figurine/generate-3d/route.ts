import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { lognog } from '@/lib/lognog'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Cost: ~$0.046 on Replicate, we charge 25 credits ($0.25)
const FIGURINE_3D_COST_CREDITS = 25

export async function POST(request: NextRequest) {
  const apiStart = Date.now()

  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth
    const userIsAdmin = isAdminEmail(user.email)

    // Rate limit
    if (!userIsAdmin) {
      const rl = checkRateLimit(`figurine:${user.id}`, RATE_LIMITS.IMAGE_GENERATION)
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
    }

    const body = await request.json()
    const { imageUrl } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    // Check credits
    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < FIGURINE_3D_COST_CREDITS) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            details: `You need ${FIGURINE_3D_COST_CREDITS} credits but only have ${currentBalance}.`,
            required: FIGURINE_3D_COST_CREDITS,
            balance: currentBalance,
          },
          { status: 402 }
        )
      }
    }

    lognog.info('figurine_3d_generation_started', {
      type: 'business',
      event: 'figurine_3d_start',
      user_id: user.id,
      user_email: user.email,
    })

    // Run Trellis model on Replicate
    const prediction = await replicate.predictions.create({
      model: 'firtoz/trellis',
      input: {
        image: imageUrl,
        texture_size: 1024,
        mesh_simplify: 0.95,
        generate_color: true,
        generate_model: true,
        randomize_seed: true,
        ss_sampling_steps: 12,
        slat_sampling_steps: 12,
        ss_guidance_strength: 7.5,
        slat_guidance_strength: 3,
      },
    })

    // Wait for completion (Trellis takes ~33 seconds)
    const completed = await replicate.wait(prediction, { interval: 2000 })

    if (completed.status === 'succeeded' && completed.output) {
      // Trellis output is typically: { model_file: "url.glb", ... } or just a URL
      let glbUrl: string | null = null

      if (typeof completed.output === 'string') {
        glbUrl = completed.output
      } else if (typeof completed.output === 'object') {
        const output = completed.output as Record<string, unknown>
        // Trellis returns model_file for GLB
        glbUrl = (output.model_file as string) ||
                 (output.mesh as string) ||
                 (output.glb as string) ||
                 null

        // If output is an array, first item might be the GLB
        if (!glbUrl && Array.isArray(completed.output)) {
          for (const item of completed.output) {
            if (typeof item === 'string' && (item.endsWith('.glb') || item.includes('glb'))) {
              glbUrl = item
              break
            }
          }
          // Fallback: just use first output
          if (!glbUrl && completed.output.length > 0 && typeof completed.output[0] === 'string') {
            glbUrl = completed.output[0]
          }
        }
      }

      if (!glbUrl) {
        lognog.error('figurine_3d_no_glb_in_output', {
          type: 'error',
          output: JSON.stringify(completed.output).slice(0, 500),
          user_id: user.id,
        })
        return NextResponse.json(
          { success: false, error: 'No 3D model found in output', rawOutput: completed.output },
          { status: 500 }
        )
      }

      // Deduct credits
      if (!userIsAdmin) {
        await creditsService.deductCredits(user.id, 'trellis-3d', {
          generationType: 'image',
          predictionId: prediction.id,
          description: '3D Figurine generation (Trellis)',
          overrideAmount: FIGURINE_3D_COST_CREDITS,
          user_email: user.email,
        })
      }

      lognog.info('figurine_3d_generation_completed', {
        type: 'business',
        event: 'figurine_3d_complete',
        user_id: user.id,
        user_email: user.email,
        prediction_id: prediction.id,
        duration_ms: Date.now() - apiStart,
        credits_charged: userIsAdmin ? 0 : FIGURINE_3D_COST_CREDITS,
      })

      return NextResponse.json({
        success: true,
        glbUrl,
        predictionId: prediction.id,
        creditsCharged: userIsAdmin ? 0 : FIGURINE_3D_COST_CREDITS,
        rawOutput: completed.output,
      })
    } else {
      lognog.error('figurine_3d_generation_failed', {
        type: 'error',
        status: completed.status,
        error: completed.error,
        user_id: user.id,
      })
      return NextResponse.json(
        { success: false, error: completed.error || 'Generation failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    lognog.error('figurine_3d_error', {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - apiStart,
    })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
