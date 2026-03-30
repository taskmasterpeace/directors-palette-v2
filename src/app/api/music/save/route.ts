import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getClient } from '@/lib/db/client'
import { R2StorageService } from '@/features/generation/services/r2-storage.service'
import { createLogger } from '@/lib/logger'
import type { SaveTrackRequest } from '@/features/music-lab/types/generation.types'

export const maxDuration = 120

const log = createLogger('MusicSave')

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body: SaveTrackRequest = await request.json()

    if (!body.audioUrl || !body.artistId || !body.title) {
      return NextResponse.json({ error: 'Missing required fields: audioUrl, artistId, title' }, { status: 400 })
    }

    // 1. Download audio from MuAPI temporary URL
    log.info('Downloading audio from MuAPI', { url: body.audioUrl.substring(0, 80) })
    const audioResponse = await fetch(body.audioUrl)
    if (!audioResponse.ok) {
      log.error('Failed to download audio', { status: audioResponse.status })
      return NextResponse.json({ error: 'Failed to download audio from source' }, { status: 502 })
    }
    const audioBuffer = await audioResponse.arrayBuffer()

    // 2. Upload to R2
    const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { publicUrl } = await R2StorageService.uploadAudio(
      audioBuffer, user.id, body.artistId, trackId
    )
    log.info('Audio uploaded to R2', { publicUrl, size: audioBuffer.byteLength })

    // 3. Update artist catalog in Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await getClient()
    const { data: artist } = await supabase
      .from('artist_profiles')
      .select('dna')
      .eq('id', body.artistId)
      .eq('user_id', user.id)
      .single()

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    const dna = artist.dna as Record<string, unknown>
    const catalog = (dna.catalog || { entries: [] }) as { entries: Array<Record<string, unknown>> }

    if (body.catalogEntryId) {
      // Attach audio to existing catalog entry
      const entry = catalog.entries.find((e) => e.id === body.catalogEntryId)
      if (entry) {
        entry.audioUrl = publicUrl
        entry.audioDuration = body.duration
      }
    } else {
      // Create new catalog entry (for instrumentals or new songs)
      catalog.entries.push({
        id: trackId,
        title: body.title,
        lyrics: body.lyrics || '',
        mood: body.mood || 'instrumental',
        tempo: '',
        createdAt: new Date().toISOString(),
        audioUrl: publicUrl,
        audioDuration: body.duration,
      })
    }

    // Save updated DNA
    const { error: updateError } = await supabase
      .from('artist_profiles')
      .update({ dna: { ...dna, catalog } })
      .eq('id', body.artistId)
      .eq('user_id', user.id)

    if (updateError) {
      log.error('Failed to update catalog', { error: updateError.message })
      return NextResponse.json({ error: 'Failed to save to catalog' }, { status: 500 })
    }

    log.info('Track saved to catalog', { trackId, artistId: body.artistId })

    return NextResponse.json({ publicUrl, trackId })
  } catch (error) {
    log.error('Music save error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to save track' }, { status: 500 })
  }
}
