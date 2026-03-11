import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { lognog } from '@/lib/lognog'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'

// Hunyuan 3D takes 2-3 minutes — need extended timeout
export const maxDuration = 300

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Cost: ~$0.16 on Replicate (Hunyuan 3D 3.1), we charge 25 credits ($0.25)
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
    let { imageUrl } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      )
    }

    // If image is base64, upload to Supabase Storage for a public URL
    // (Replicate file API URLs require auth and don't work as model inputs)
    if (imageUrl.startsWith('data:')) {
      const base64Match = imageUrl.match(/^data:image\/\w+;base64,(.+)/)
      if (!base64Match) {
        return NextResponse.json(
          { error: 'Invalid base64 image data' },
          { status: 400 }
        )
      }
      const buffer = Buffer.from(base64Match[1], 'base64')
      const ext = imageUrl.match(/^data:image\/(\w+)/)?.[1] || 'png'
      const mimeType = `image/${ext}`

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const storagePath = `temp/figurine/${user.id}/${randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('directors-palette')
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true })

      if (uploadError) {
        lognog.error('figurine_3d_file_upload_failed', {
          type: 'error',
          response: uploadError.message,
          user_id: user.id,
        })
        return NextResponse.json(
          { success: false, error: 'Failed to upload image for processing' },
          { status: 500 }
        )
      }

      const { data: { publicUrl } } = supabase.storage
        .from('directors-palette')
        .getPublicUrl(storagePath)

      imageUrl = publicUrl
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

    // Run Hunyuan 3D 3.1 on Replicate (image-to-3D)
    const prediction = await replicate.predictions.create({
      version: 'a2838628b41a2e0ee2eb19b3ea98a40d75f8d7639bf5a1ddd37ea299bb334854',
      input: {
        image: imageUrl,
        enable_pbr: false,
        face_count: 500000,
        generate_type: 'Normal',
      },
    })

    // Wait for completion (Hunyuan 3D takes ~2-3 minutes)
    const completed = await replicate.wait(prediction, { interval: 3000 })

    if (completed.status === 'succeeded' && completed.output) {
      // Hunyuan 3D 3.1 returns a direct string URL to the .glb file
      let glbUrl: string | null = null

      if (typeof completed.output === 'string') {
        glbUrl = completed.output
      } else if (typeof completed.output === 'object') {
        // Fallback: try common field names if output format changes
        const output = completed.output as Record<string, unknown>
        glbUrl = (output.model_file as string) ||
                 (output.mesh as string) ||
                 (output.glb as string) ||
                 null
        if (!glbUrl && Array.isArray(completed.output) && completed.output.length > 0) {
          glbUrl = typeof completed.output[0] === 'string' ? completed.output[0] : null
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

      // Re-host GLB to Supabase Storage (Replicate URLs expire after ~1 hour)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )

      let permanentGlbUrl = glbUrl
      const glbStoragePath = `figurines/${user.id}/${randomUUID()}.glb`

      try {
        const glbResponse = await fetch(glbUrl)
        if (glbResponse.ok) {
          const glbBuffer = Buffer.from(await glbResponse.arrayBuffer())
          const { error: glbUploadError } = await supabaseAdmin.storage
            .from('directors-palette')
            .upload(glbStoragePath, glbBuffer, {
              contentType: 'model/gltf-binary',
              upsert: true,
            })

          if (!glbUploadError) {
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('directors-palette')
              .getPublicUrl(glbStoragePath)
            permanentGlbUrl = publicUrl
          } else {
            lognog.error('figurine_glb_rehost_upload_failed', {
              type: 'error',
              error: glbUploadError.message,
              user_id: user.id,
            })
          }
        }
      } catch (rehostErr) {
        lognog.error('figurine_glb_rehost_failed', {
          type: 'error',
          error: rehostErr instanceof Error ? rehostErr.message : String(rehostErr),
          user_id: user.id,
        })
        // Fall through — use original Replicate URL as fallback
      }

      // Deduct credits
      if (!userIsAdmin) {
        await creditsService.deductCredits(user.id, 'hunyuan-3d', {
          generationType: 'image',
          predictionId: prediction.id,
          description: '3D Figurine generation (Hunyuan 3D 3.1)',
          overrideAmount: FIGURINE_3D_COST_CREDITS,
          user_email: user.email,
        })
      }

      // Save figurine to DB (max 5 per user — delete oldest if at limit)
      const { data: existing } = await supabaseAdmin
        .from('figurines')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (existing && existing.length >= 5) {
        // Delete oldest to make room
        const toDelete = existing.slice(0, existing.length - 4)
        await supabaseAdmin
          .from('figurines')
          .delete()
          .in('id', toDelete.map(f => f.id))
      }

      await supabaseAdmin.from('figurines').insert({
        user_id: user.id,
        source_image_url: imageUrl,
        glb_url: permanentGlbUrl,
        glb_storage_path: permanentGlbUrl !== glbUrl ? glbStoragePath : null,
        prediction_id: prediction.id,
        credits_charged: userIsAdmin ? 0 : FIGURINE_3D_COST_CREDITS,
      })

      lognog.info('figurine_3d_generation_completed', {
        type: 'business',
        event: 'figurine_3d_complete',
        user_id: user.id,
        user_email: user.email,
        prediction_id: prediction.id,
        duration_ms: Date.now() - apiStart,
        credits_charged: userIsAdmin ? 0 : FIGURINE_3D_COST_CREDITS,
        glb_rehosted: permanentGlbUrl !== glbUrl,
      })

      return NextResponse.json({
        success: true,
        glbUrl: permanentGlbUrl,
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
