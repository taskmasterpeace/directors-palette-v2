import type { GeneratedShotPrompt, GeneratedImageData } from '../types/storyboard.types'

const DEFAULT_PACE = 4 // seconds per shot
const DEFAULT_FPS = 24

interface TimelineShot {
  sequence: number
  text: string
  prompt: string
  characters: string[]
  location: string | null
  imageUrl: string | null
  startSec: number
  endSec: number
  durationSec: number
}

function buildTimelineShots(
  prompts: GeneratedShotPrompt[],
  images: Record<number, GeneratedImageData>,
  pace = DEFAULT_PACE
): TimelineShot[] {
  let currentTime = 0
  return prompts.map((p) => {
    const imgData = images[p.sequence]
    const start = currentTime
    const end = currentTime + pace
    currentTime = end

    return {
      sequence: p.sequence,
      text: p.originalText,
      prompt: p.prompt,
      characters: p.characterRefs?.map((c) => c.name) || [],
      location: p.locationRef?.name || null,
      imageUrl: imgData?.imageUrl || null,
      startSec: Math.round(start * 100) / 100,
      endSec: Math.round(end * 100) / 100,
      durationSec: pace,
    }
  })
}

function buildOTIO(shots: TimelineShot[], fps: number) {
  const videoClips = shots.map((shot) => ({
    OTIO_SCHEMA: 'Clip.2',
    name: `Shot ${shot.sequence} — ${shot.text.slice(0, 60)}`,
    media_reference: {
      OTIO_SCHEMA: 'ExternalReference.1',
      target_url: shot.imageUrl || `shot_${shot.sequence}.png`,
      available_range: {
        OTIO_SCHEMA: 'TimeRange.1',
        start_time: { OTIO_SCHEMA: 'RationalTime.1', value: 0, rate: fps },
        duration: { OTIO_SCHEMA: 'RationalTime.1', value: Math.round(shot.durationSec * fps), rate: fps },
      },
    },
    source_range: {
      OTIO_SCHEMA: 'TimeRange.1',
      start_time: { OTIO_SCHEMA: 'RationalTime.1', value: 0, rate: fps },
      duration: { OTIO_SCHEMA: 'RationalTime.1', value: Math.round(shot.durationSec * fps), rate: fps },
    },
    metadata: {
      directors_palette: {
        sequence: shot.sequence,
        prompt: shot.prompt,
        characters: shot.characters,
        location: shot.location,
      },
    },
  }))

  return {
    OTIO_SCHEMA: 'Timeline.1',
    name: 'Storyboard Timeline',
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
        generated_at: new Date().toISOString(),
      },
    },
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function secondsToTC(seconds: number, fps: number): string {
  const totalFrames = Math.round(seconds * fps)
  const h = Math.floor(totalFrames / (fps * 3600))
  const m = Math.floor((totalFrames % (fps * 3600)) / (fps * 60))
  const s = Math.floor((totalFrames % (fps * 60)) / fps)
  const f = Math.round(totalFrames % fps)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad2(f)}`
}

function buildEDL(shots: TimelineShot[], fps: number): string {
  const lines: string[] = [
    'TITLE: STORYBOARD TIMELINE',
    'FCM: NON-DROP FRAME',
    '',
  ]

  for (const shot of shots) {
    const eventNum = String(shot.sequence).padStart(3, '0')
    const reel = `SHOT${String(shot.sequence).padStart(4, '0')}`
    const srcIn = secondsToTC(0, fps)
    const srcOut = secondsToTC(shot.durationSec, fps)
    const recIn = secondsToTC(shot.startSec, fps)
    const recOut = secondsToTC(shot.endSec, fps)

    lines.push(`${eventNum}  ${reel} V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}`)
    lines.push(`* FROM CLIP NAME: shot_${shot.sequence}.png`)
    if (shot.imageUrl) {
      lines.push(`* SOURCE FILE: ${shot.imageUrl}`)
    }
    lines.push(`* COMMENT: ${shot.text.slice(0, 100)}`)
    lines.push('')
  }

  return lines.join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportTimeline(
  prompts: GeneratedShotPrompt[],
  images: Record<number, GeneratedImageData>,
  format: 'otio' | 'edl',
  pace = DEFAULT_PACE,
  fps = DEFAULT_FPS
) {
  if (!prompts || prompts.length === 0) {
    throw new Error('No shots to export')
  }

  const shots = buildTimelineShots(prompts, images, pace)
  const timestamp = new Date().toISOString().slice(0, 10)

  if (format === 'otio') {
    const otio = buildOTIO(shots, fps)
    downloadFile(JSON.stringify(otio, null, 2), `storyboard-timeline-${timestamp}.otio`, 'application/json')
  } else {
    const edl = buildEDL(shots, fps)
    downloadFile(edl, `storyboard-timeline-${timestamp}.edl`, 'text/plain')
  }
}
