import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../../_lib/middleware'
import { successResponse, errors } from '../../../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface TimelineShot {
  sequence: number
  shot_id: string
  prompt: string
  original_text: string
  characters: string[]
  location: string | null
  image_url: string | null
  status: string
  start_sec: number
  end_sec: number
  duration_sec: number
  track: string
}

/**
 * GET /api/v2/storyboard/:id/timeline — Generate a timeline from a storyboard
 *
 * Query params:
 *   pace — seconds per shot (default 4)
 *   fps — frames per second (default 24)
 *   format — "json" | "otio" | "edl" (default "json")
 *
 * Returns a proposed timeline with timestamps for each shot,
 * optionally as an OTIO or EDL file for NLE import.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const { id } = await params
    const { searchParams } = request.nextUrl
    const pace = Number(searchParams.get('pace')) || 4
    const fps = Number(searchParams.get('fps')) || 24
    const format = searchParams.get('format') || 'json'

    if (!['json', 'otio', 'edl'].includes(format)) {
      return errors.validation('format must be json, otio, or edl')
    }
    if (pace < 1 || pace > 30) {
      return errors.validation('pace must be 1-30 seconds')
    }

    const supabase = getSupabase()

    // Verify storyboard exists and belongs to user
    const { data: storyboard, error: sbErr } = await supabase
      .from('storyboards')
      .select('id, title, user_id, status')
      .eq('id', id)
      .single()

    if (sbErr || !storyboard) {
      return errors.notFound('Storyboard not found')
    }
    if (storyboard.user_id !== auth.userId) {
      return errors.forbidden('You do not own this storyboard')
    }

    // Fetch shots with gallery join for image URLs
    const { data: shots, error: shotsErr } = await supabase
      .from('storyboard_shots')
      .select('id, sequence_number, prompt, original_text, character_names, location_name, status, gallery_id, gallery(public_url)')
      .eq('storyboard_id', id)
      .order('sequence_number', { ascending: true })

    if (shotsErr) {
      return errors.internal('Failed to fetch shots')
    }

    if (!shots || shots.length === 0) {
      return errors.validation('Storyboard has no shots')
    }

    // Build timeline with timestamps
    let currentTime = 0
    const timelineShots: TimelineShot[] = shots.map((shot) => {
      const duration = pace
      const start = currentTime
      const end = currentTime + duration
      currentTime = end

      // Extract image URL from gallery join (Supabase returns object for single FK)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const galleryData = shot.gallery as any
      const imageUrl = galleryData?.public_url || null

      return {
        sequence: shot.sequence_number,
        shot_id: shot.id,
        prompt: shot.prompt,
        original_text: shot.original_text,
        characters: shot.character_names || [],
        location: shot.location_name || null,
        image_url: imageUrl,
        status: shot.status,
        start_sec: Math.round(start * 100) / 100,
        end_sec: Math.round(end * 100) / 100,
        duration_sec: duration,
        track: 'V1',
      }
    })

    const totalDuration = currentTime

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: `/v2/storyboard/${id}/timeline`,
      method: 'GET',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    // Return based on format
    if (format === 'otio') {
      const otio = buildOTIO(storyboard.title, timelineShots, fps, totalDuration)
      return new Response(JSON.stringify(otio, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${slugify(storyboard.title)}.otio"`,
        },
      })
    }

    if (format === 'edl') {
      const edl = buildEDL(storyboard.title, timelineShots, fps)
      return new Response(edl, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${slugify(storyboard.title)}.edl"`,
        },
      })
    }

    // Default: JSON
    return successResponse({
      storyboard_id: id,
      title: storyboard.title,
      total_shots: timelineShots.length,
      total_duration_sec: totalDuration,
      fps,
      pace_sec: pace,
      shots: timelineShots,
    })
  } catch (_err) {
    return errors.internal()
  }
}

// ---- OTIO Generator ----

function buildOTIO(
  title: string,
  shots: TimelineShot[],
  fps: number,
  totalDuration: number
) {
  const videoClips = shots.map((shot) => ({
    OTIO_SCHEMA: 'Clip.2',
    name: `Shot ${shot.sequence} — ${shot.original_text.slice(0, 60)}`,
    media_reference: {
      OTIO_SCHEMA: 'ExternalReference.1',
      target_url: shot.image_url || `shot_${shot.sequence}.png`,
      available_range: {
        OTIO_SCHEMA: 'TimeRange.1',
        start_time: { OTIO_SCHEMA: 'RationalTime.1', value: 0, rate: fps },
        duration: { OTIO_SCHEMA: 'RationalTime.1', value: Math.round(shot.duration_sec * fps), rate: fps },
      },
    },
    source_range: {
      OTIO_SCHEMA: 'TimeRange.1',
      start_time: { OTIO_SCHEMA: 'RationalTime.1', value: 0, rate: fps },
      duration: { OTIO_SCHEMA: 'RationalTime.1', value: Math.round(shot.duration_sec * fps), rate: fps },
    },
    metadata: {
      directors_palette: {
        shot_id: shot.shot_id,
        sequence: shot.sequence,
        prompt: shot.prompt,
        characters: shot.characters,
        location: shot.location,
        status: shot.status,
      },
    },
  }))

  return {
    OTIO_SCHEMA: 'Timeline.1',
    name: title,
    global_start_time: { OTIO_SCHEMA: 'RationalTime.1', value: 0, rate: fps },
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      name: 'tracks',
      children: [
        {
          OTIO_SCHEMA: 'Track.1',
          name: 'V1 — Main',
          kind: 'Video',
          children: videoClips,
        },
      ],
      metadata: {},
    },
    metadata: {
      directors_palette: {
        total_shots: shots.length,
        total_duration_sec: totalDuration,
        generated_at: new Date().toISOString(),
      },
    },
  }
}

// ---- EDL Generator ----

function buildEDL(title: string, shots: TimelineShot[], fps: number): string {
  const lines: string[] = [
    `TITLE: ${title.toUpperCase()}`,
    'FCM: NON-DROP FRAME',
    '',
  ]

  for (const shot of shots) {
    const eventNum = String(shot.sequence).padStart(3, '0')
    const reel = `SHOT${String(shot.sequence).padStart(4, '0')}`

    const srcIn = secondsToTC(0, fps)
    const srcOut = secondsToTC(shot.duration_sec, fps)
    const recIn = secondsToTC(shot.start_sec, fps)
    const recOut = secondsToTC(shot.end_sec, fps)

    lines.push(`${eventNum}  ${reel} V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`)
    lines.push(`* FROM CLIP NAME: shot_${shot.sequence}.png`)
    if (shot.image_url) {
      lines.push(`* SOURCE FILE: ${shot.image_url}`)
    }
    lines.push(`* COMMENT: ${shot.original_text.slice(0, 100)}`)
    lines.push('')
  }

  return lines.join('\n')
}

function secondsToTC(seconds: number, fps: number): string {
  const totalFrames = Math.round(seconds * fps)
  const h = Math.floor(totalFrames / (fps * 3600))
  const m = Math.floor((totalFrames % (fps * 3600)) / (fps * 60))
  const s = Math.floor((totalFrames % (fps * 60)) / fps)
  const f = Math.round(totalFrames % fps)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(f)}`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
