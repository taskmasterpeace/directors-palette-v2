/**
 * POST /api/music-lab/auto-draft-beats
 *
 * Given an artist's DNA + a segment's scene brief + timing, generate
 * 6 one-line beat captions to seed the contact-sheet editor. User
 * can edit before hitting Generate.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

const MODEL = 'openai/gpt-4.1-mini'

interface DraftArgs {
  artistId: string
  scene: string
  segmentLabel?: string
  startS: number
  endS: number
}

function validate(body: unknown): DraftArgs | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.artistId !== 'string' || !b.artistId) return null
  if (typeof b.scene !== 'string' || !b.scene.trim()) return null
  if (typeof b.startS !== 'number' || typeof b.endS !== 'number') return null
  if (b.endS <= b.startS) return null
  return {
    artistId: b.artistId,
    scene: b.scene.trim(),
    segmentLabel: typeof b.segmentLabel === 'string' ? b.segmentLabel : undefined,
    startS: b.startS,
    endS: b.endS,
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const args = validate(body)
  if (!args) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase env vars missing' }, { status: 500 })
  }
  const admin = createClient(supabaseUrl, serviceKey)
  const { data: artist } = await admin
    .from('artist_profiles')
    .select('id, name, dna')
    .eq('id', args.artistId)
    .eq('user_id', auth.user.id)
    .single()

  if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dna = (artist as any).dna as Record<string, any> | null
  const lookBits = [
    dna?.look?.skinTone,
    dna?.look?.hairStyle,
    dna?.look?.fashionStyle,
  ].filter(Boolean).join(', ')
  const attitude = dna?.persona?.attitude || ''
  const genres = (dna?.sound?.genres as string[] | undefined)?.slice(0, 3).join(', ') || ''
  const bannedWords = (dna?.lexicon?.bannedWords as string[] | undefined)?.filter(Boolean) ?? []

  const systemPrompt = `You are a music video director's assistant. Given a scene brief for a ~${(args.endS - args.startS).toFixed(0)}s segment of a song, produce exactly 6 short beat captions.

RULES:
- Each caption is ONE imperative line, max 12 words.
- Use cinematic shot language: "Low dolly-in on…", "Over-shoulder, keys in hand", "Pullback reveals…".
- Beats 1 and 6 are visual bookends (open / close). Beats 2–5 escalate, shift, or pivot.
- No character names. No lyrics. No song title references.
${bannedWords.length > 0 ? `- DO NOT use any of these words: ${bannedWords.join(', ')}` : ''}

Return ONLY a JSON array of exactly 6 strings — no prose, no markdown fences.`

  const userPrompt = [
    `Artist look: ${lookBits || 'unspecified'}`,
    `Artist attitude: ${attitude || 'unspecified'}`,
    `Genre: ${genres || 'unspecified'}`,
    `Segment: ${args.segmentLabel || 'Segment'} (${args.startS.toFixed(1)}s → ${args.endS.toFixed(1)}s)`,
    `Scene brief: ${args.scene}`,
  ].join('\n')

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 })
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
        'X-Title': "Director's Palette — Music Lab Auto-Draft Beats",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 600,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      logger.musicLab.error('Auto-draft OpenRouter error', { error: errText })
      return NextResponse.json({ error: 'Beat drafting failed' }, { status: 500 })
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let beats: string[]
    try {
      beats = JSON.parse(cleaned)
    } catch {
      logger.musicLab.error('Auto-draft JSON parse failed', { content })
      return NextResponse.json({ error: 'Model returned invalid JSON' }, { status: 500 })
    }

    if (!Array.isArray(beats) || beats.length !== 6) {
      return NextResponse.json({ error: 'Model did not return 6 beats' }, { status: 500 })
    }
    const normalized = beats.map((b) => ({ caption: String(b).trim() }))
    return NextResponse.json({ beats: normalized }, { status: 200 })
  } catch (err) {
    logger.musicLab.error('Auto-draft unexpected error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Beat drafting failed' }, { status: 500 })
  }
}
