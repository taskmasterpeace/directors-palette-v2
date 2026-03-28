/**
 * Revise Section API
 * Rewrites a selected draft using artist revision notes and judge feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'
import type { SectionType, ArtistJudgment } from '@/features/music-lab/types/writing-studio.types'
import { logger } from '@/lib/logger'

const REVISE_COST_CENTS = 3
const MODEL = 'openai/gpt-4.1'

function getSyllableGuidance(sectionType: string, melodyBias: number): string {
  const noVocalSections = ['instrumental', 'interlude']
  if (noVocalSections.includes(sectionType)) return ''

  const isRap = melodyBias <= 40
  const isSung = melodyBias >= 60

  const targets: Record<string, { rap: string; sung: string; blend: string }> = {
    'verse': { rap: '10-14', sung: '8-10', blend: '8-12' },
    'hook': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'chorus': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'pre-chorus': { rap: '6-10', sung: '6-8', blend: '6-8' },
    'build': { rap: '6-10', sung: '6-8', blend: '6-8' },
    'bridge': { rap: '8-12', sung: '8-10', blend: '8-10' },
    'post-chorus': { rap: '6-8', sung: '6-8', blend: '6-8' },
    'intro': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'outro': { rap: '6-10', sung: '6-8', blend: '6-10' },
    'break': { rap: '4-8', sung: '4-6', blend: '4-8' },
    'drop': { rap: '4-8', sung: '4-6', blend: '4-8' },
  }

  const t = targets[sectionType] || targets['verse']
  const range = isRap ? t.rap : isSung ? t.sung : t.blend

  return `SYLLABLE CONSISTENCY: Target ${range} syllables per line for this ${sectionType}. Keep syllable counts consistent within the section — lines that vary wildly sound rushed or awkward when performed.`
}

const BANNED_AI_PHRASES = [
  'neon', 'echoes', 'shadows', 'whispers', 'tapestry', 'symphony',
  'labyrinth', 'enigma', 'ethereal', 'celestial', 'luminous',
  'serenity', 'resonate', 'transcend', 'paradigm', 'pinnacle',
  'uncharted', 'kaleidoscope', 'crescendo', 'epiphany',
]

interface ReviseSectionBody {
  originalContent: string
  sectionType: SectionType
  revisionNotes: string
  judgment?: ArtistJudgment
  artistDna: ArtistDNA
  artistDirection?: string
}

function buildRevisionPrompt(body: ReviseSectionBody): string {
  const { sectionType, revisionNotes, judgment, artistDna, artistDirection } = body
  const parts: string[] = []

  parts.push('You are a professional songwriter and ghostwriter.')
  parts.push(`Revise this ${sectionType} section based on the artist's feedback.`)
  parts.push('Return ONLY the revised lyrics as plain text. No JSON, no markdown, no explanation.')

  const artistName = artistDna.identity?.stageName || artistDna.identity?.realName
  if (artistName) parts.push(`Writing for: ${artistName}`)

  if (artistDirection) {
    parts.push(`Original vibe direction: "${artistDirection}"`)
  }

  parts.push(`\nARTIST REVISION NOTES: "${revisionNotes}"`)

  if (judgment?.lineNotes?.length) {
    parts.push('\nLINE-LEVEL FEEDBACK FROM REVIEW:')
    judgment.lineNotes.forEach(n => {
      parts.push(`  Line ${n.lineNumber}: ${n.note}${n.suggestion ? ` → Suggestion: ${n.suggestion}` : ''}`)
    })
  }

  // Rhyming DNA
  const rhymeTypes = artistDna.sound?.rhymeTypes
  const rhymePatterns = artistDna.sound?.rhymePatterns
  const rhymeDensity = artistDna.sound?.rhymeDensity

  if (rhymeTypes?.length || rhymePatterns?.length || rhymeDensity !== undefined) {
    parts.push('\nRHYMING STYLE:')
    if (rhymeTypes?.length) parts.push(`Preferred types: ${rhymeTypes.join(', ')}`)
    if (rhymePatterns?.length) parts.push(`Preferred patterns: ${rhymePatterns.join(', ')}`)
    if (rhymeDensity !== undefined) {
      const label = rhymeDensity <= 25 ? 'SPARSE' : rhymeDensity <= 50 ? 'MODERATE' : rhymeDensity <= 75 ? 'DENSE' : 'EVERY LINE'
      parts.push(`Density: ${label}`)
    }
  }

  // Syllable guidance
  const syllableNote = getSyllableGuidance(body.sectionType, body.artistDna?.sound?.melodyBias ?? 50)
  if (syllableNote) parts.push(syllableNote)

  if (artistDna.sound?.flowStyle) parts.push(`Flow style: ${artistDna.sound.flowStyle}`)
  if (artistDna.sound?.language && artistDna.sound.language !== 'English') {
    parts.push(`Primary language: ${artistDna.sound.language}`)
  }
  if (artistDna.sound?.secondaryLanguages?.length > 0) {
    parts.push(`Also writes in: ${artistDna.sound.secondaryLanguages.join(', ')}`)
  }

  if (artistDna.catalog?.genome?.essenceStatement) {
    parts.push(`\nArtist writing DNA: ${artistDna.catalog.genome.essenceStatement}`)
  }

  if (artistDna.lexicon?.signaturePhrases?.length) {
    parts.push(`Signature phrases: ${artistDna.lexicon.signaturePhrases.join(', ')}`)
  }
  if (artistDna.lexicon?.bannedWords?.length) {
    parts.push(`NEVER use: ${artistDna.lexicon.bannedWords.join(', ')}`)
  }

  parts.push(`\nNEVER use these AI words: ${BANNED_AI_PHRASES.join(', ')}`)
  parts.push('Keep the parts that work. Fix only what the feedback addresses. Maintain the overall structure and bar count.')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const deductResult = await creditsService.deductCredits(auth.user.id, 'section-revise', {
      generationType: 'text',
      description: 'Section revision: rewrite with feedback',
      overrideAmount: REVISE_COST_CENTS,
      user_email: auth.user.email,
    })
    if (!deductResult.success) {
      return NextResponse.json({ error: 'Insufficient credits', ...deductResult }, { status: 402 })
    }

    const body = await request.json() as ReviseSectionBody

    if (!body.originalContent || !body.sectionType || !body.revisionNotes || !body.artistDna) {
      return NextResponse.json({ error: 'originalContent, sectionType, revisionNotes, and artistDna are required' }, { status: 400 })
    }

    const systemPrompt = buildRevisionPrompt(body)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Section Revision",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the original ${body.sectionType}:\n\n${body.originalContent}\n\nRevise it based on the feedback above.` },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter error (revise)', { error })
      return NextResponse.json({ error: 'Revision failed' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    return NextResponse.json({ content: content.trim() })
  } catch (error) {
    logger.api.error('Revise section error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
