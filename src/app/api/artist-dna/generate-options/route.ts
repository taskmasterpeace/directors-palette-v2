/**
 * Generate Options API
 * Generates 4 draft options for a song section based on tone, concept, and artist DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { ToneSettings, SectionType } from '@/features/music-lab/types/writing-studio.types'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'

const MODEL = 'openai/gpt-4.1-mini'

const BANNED_AI_PHRASES = [
  'neon', 'echoes', 'shadows', 'whispers', 'tapestry', 'symphony',
  'labyrinth', 'enigma', 'ethereal', 'celestial', 'luminous',
  'serenity', 'resonate', 'transcend', 'paradigm', 'pinnacle',
  'uncharted', 'kaleidoscope', 'crescendo', 'epiphany',
]

interface PreviousSection {
  type: string
  content: string
}

interface GenerateOptionsBody {
  sectionType: SectionType
  tone: ToneSettings
  concept: string
  artistDna: ArtistDNA
  previousSections: PreviousSection[]
}

function buildSystemPrompt(body: GenerateOptionsBody): string {
  const { sectionType, tone, concept, artistDna, previousSections } = body
  const parts: string[] = []

  parts.push('You are a professional songwriter and ghostwriter.')
  parts.push(`Generate exactly 4 different draft options for a song ${sectionType} section.`)
  parts.push('Each option should have a different creative direction while matching the same tone.')
  parts.push('Return ONLY a JSON array of 4 objects: [{"label":"A","content":"..."},{"label":"B","content":"..."},{"label":"C","content":"..."},{"label":"D","content":"..."}]')
  parts.push('Do NOT include any markdown formatting, code fences, or explanation. Just raw JSON.')

  // Tone context
  parts.push(`Emotion: ${tone.emotion}`)
  parts.push(`Energy level: ${tone.energy}/100 (${tone.energy <= 25 ? 'chill' : tone.energy <= 50 ? 'moderate' : tone.energy <= 75 ? 'hype' : 'explosive'})`)
  parts.push(`Delivery style: ${tone.delivery}`)

  // Section-specific guidance
  switch (sectionType) {
    case 'intro':
      parts.push('This is an intro: set the scene, establish mood, 2-4 lines.')
      break
    case 'hook':
      parts.push('This is a hook/chorus: catchy, memorable, repeatable. 4-8 lines.')
      break
    case 'verse':
      parts.push('This is a verse: storytelling, detail, 8-16 bars.')
      break
    case 'bridge':
      parts.push('This is a bridge: shift perspective, build tension, 4 lines.')
      break
    case 'outro':
      parts.push('This is an outro: wrap up, fade out, 2-4 lines.')
      break
  }

  if (concept) {
    parts.push(`Song concept: ${concept}`)
  }

  // Artist DNA context
  if (artistDna.sound?.melodyBias !== undefined) {
    if (artistDna.sound.melodyBias <= 30) {
      parts.push('Style: primarily rap/spoken-word. Focus on wordplay and lyrical density.')
    } else if (artistDna.sound.melodyBias >= 70) {
      parts.push('Style: primarily sung. Focus on melodic phrasing.')
    } else {
      parts.push('Style: blend of rap and singing.')
    }
  }

  if (artistDna.lexicon?.signaturePhrases?.length > 0) {
    parts.push(`Signature phrases to weave in: ${artistDna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (artistDna.lexicon?.slang?.length > 0) {
    parts.push(`Slang to use: ${artistDna.lexicon.slang.join(', ')}`)
  }
  if (artistDna.lexicon?.bannedWords?.length > 0) {
    parts.push(`NEVER use: ${artistDna.lexicon.bannedWords.join(', ')}`)
  }
  if (artistDna.persona?.attitude) {
    parts.push(`Artist attitude: ${artistDna.persona.attitude}`)
  }

  // Previous sections for context
  if (previousSections.length > 0) {
    parts.push('Previously written sections (maintain continuity):')
    previousSections.forEach((s) => {
      parts.push(`[${s.type}]: ${s.content.substring(0, 200)}`)
    })
  }

  // Variety directive
  parts.push('Make each of the 4 options DISTINCTLY different: different imagery, rhythm, opening lines.')
  parts.push(`NEVER use these AI-sounding words: ${BANNED_AI_PHRASES.join(', ')}`)
  parts.push('Write like a human songwriter, not an AI. Use concrete imagery.')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as GenerateOptionsBody

    if (!body.sectionType || !body.tone) {
      return NextResponse.json({ error: 'sectionType and tone are required' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(body)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Writing Studio Options",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate 4 draft options for this ${body.sectionType} section.` },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '[]'

    // Parse JSON response, handling potential markdown wrapping
    let options
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      options = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse options JSON:', raw)
      return NextResponse.json({ error: 'Failed to parse generated options' }, { status: 500 })
    }

    // Add IDs
    const optionsWithIds = (options as { label: string; content: string }[]).map(
      (opt: { label: string; content: string }) => ({
        id: crypto.randomUUID(),
        label: opt.label,
        content: opt.content,
      })
    )

    return NextResponse.json({ options: optionsWithIds })
  } catch (error) {
    console.error('Generate options error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
