import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { submitGeneration } from '@/features/music-lab/services/muapi.service'
import { createLogger } from '@/lib/logger'
import type { GenerateRequest } from '@/features/music-lab/types/generation.types'

export const maxDuration = 30

const log = createLogger('MusicGenerate')
const GENERATION_COST = 12

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    const userIsAdmin = isAdminEmail(user.email || '')

    const body: GenerateRequest = await request.json()

    // Validate required fields
    if (!body.mode || !body.artistId || !body.stylePrompt) {
      return NextResponse.json({ error: 'Missing required fields: mode, artistId, stylePrompt' }, { status: 400 })
    }

    if (body.mode === 'song' && (!body.lyricsPrompt || body.lyricsPrompt.trim().length === 0)) {
      return NextResponse.json({ error: 'Lyrics are required for song mode' }, { status: 400 })
    }

    // Validate field lengths
    if (body.stylePrompt.length > 1000) {
      return NextResponse.json({ error: 'Style prompt exceeds 1000 character limit' }, { status: 400 })
    }
    if (body.lyricsPrompt && body.lyricsPrompt.length > 3000) {
      return NextResponse.json({ error: 'Lyrics exceed 3000 character limit' }, { status: 400 })
    }
    if (body.excludePrompt && body.excludePrompt.length > 200) {
      return NextResponse.json({ error: 'Negative tags exceed 200 character limit' }, { status: 400 })
    }

    // Check and deduct credits BEFORE calling MuAPI
    let deductedCredits = false
    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < GENERATION_COST) {
        return NextResponse.json(
          { error: 'Insufficient credits', required: GENERATION_COST, balance: currentBalance },
          { status: 402 }
        )
      }

      await creditsService.deductCredits(user.id, 'suno-music', {
        generationType: 'audio',
        description: body.mode === 'song' ? 'Music generation (full song)' : 'Music generation (instrumental)',
        overrideAmount: GENERATION_COST,
        user_email: user.email,
      })
      deductedCredits = true
    }

    // Submit to MuAPI — refund on failure
    try {
      const { requestId } = await submitGeneration(body)

      log.info('Music generation started', { requestId, mode: body.mode, userId: user.id })

      return NextResponse.json({ requestId, status: 'pending' })
    } catch (apiError) {
      // Refund credits on MuAPI failure
      if (deductedCredits) {
        log.info('Refunding credits after MuAPI failure', { userId: user.id })
        await creditsService.addCredits(user.id, GENERATION_COST, {
          type: 'refund',
          description: 'Music generation failed — refund',
          metadata: { reason: 'muapi_failure' },
        })
      }
      throw apiError
    }
  } catch (error) {
    log.error('Music generate error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
