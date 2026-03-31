import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { pollGenerationStatus } from '@/features/music-lab/services/muapi.service'
import { createLogger } from '@/lib/logger'

export const maxDuration = 15

const log = createLogger('MusicStatus')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const result = await pollGenerationStatus(id)

    // MuAPI returns `outputs` (array of URLs), map to our audio format
    const audio = result.outputs?.length
      ? result.outputs.map((url) => ({ url, duration: 0 }))
      : result.audio || []

    return NextResponse.json({
      id: result.id,
      status: result.status,
      audio,
      error: result.error || undefined,
    })
  } catch (error) {
    log.error('Music status poll error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
