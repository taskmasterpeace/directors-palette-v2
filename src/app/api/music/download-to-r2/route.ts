import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { R2StorageService } from '@/features/generation/services/r2-storage.service'
import { createLogger } from '@/lib/logger'

export const maxDuration = 120

const log = createLogger('MusicDownloadToR2')

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { audioUrl, artistId } = await request.json()

    if (!audioUrl || !artistId) {
      return NextResponse.json(
        { error: 'Missing required fields: audioUrl, artistId' },
        { status: 400 }
      )
    }

    // 1. Download audio from MuAPI temporary URL
    log.info('Downloading audio for vibe beat', { url: audioUrl.substring(0, 80) })
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      log.error('Failed to download audio', { status: audioResponse.status })
      return NextResponse.json(
        { error: 'Failed to download audio from source' },
        { status: 502 }
      )
    }
    const audioBuffer = await audioResponse.arrayBuffer()

    // 2. Upload to R2 — "vibe-" prefix distinguishes from catalog tracks
    const trackId = `vibe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { publicUrl } = await R2StorageService.uploadAudio(
      audioBuffer,
      user.id,
      artistId,
      trackId
    )
    log.info('Vibe beat uploaded to R2', { publicUrl, size: audioBuffer.byteLength })

    return NextResponse.json({ r2Url: publicUrl })
  } catch (error) {
    log.error('Download-to-R2 error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Failed to download and upload audio' },
      { status: 500 }
    )
  }
}
