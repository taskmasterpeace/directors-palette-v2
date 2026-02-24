/**
 * Calculate Genome API
 * Synthesizes all song analyses into a cumulative CatalogGenome
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { CatalogGenome, CatalogSongAnalysis } from '@/features/music-lab/types/artist-dna.types'

const MODEL = 'openai/gpt-4.1-mini'

interface AnalyzedEntry {
  title: string
  mood: string
  tempo: string
  analysis: CatalogSongAnalysis
}

function buildPrompt(entries: AnalyzedEntry[], artistName: string): string {
  const parts: string[] = []

  parts.push('You are an expert music analyst building a cumulative artist genome.')
  parts.push(`Artist: ${artistName || 'Unknown Artist'}`)
  parts.push(`Analyzing ${entries.length} song(s) to build a compressed understanding of this artist's writing patterns.`)
  parts.push('')

  // Dump all analyses
  entries.forEach((entry, i) => {
    parts.push(`--- Song ${i + 1}: "${entry.title}" (${[entry.mood, entry.tempo].filter(Boolean).join(', ')}) ---`)
    parts.push(`Themes: ${entry.analysis.themes.join(', ')}`)
    parts.push(`Mood progression: ${entry.analysis.moodProgression}`)
    parts.push(`Rhyme schemes: ${entry.analysis.rhymeSchemes.join(', ')}`)
    parts.push(`Storytelling: ${entry.analysis.storytellingApproach}`)
    parts.push(`Vocabulary: ${entry.analysis.vocabularyLevel}`)
    parts.push(`Notable devices: ${entry.analysis.notableDevices.join('; ')}`)
    parts.push(`Recurring imagery: ${entry.analysis.recurringImagery.join(', ')}`)
    parts.push(`Emotional intensity: ${entry.analysis.emotionalIntensity}/10`)
    parts.push('')
  })

  parts.push('Synthesize all the above into a GENOME — a compressed understanding of this artist\'s writing DNA.')
  parts.push('Return ONLY valid JSON matching this exact schema:')
  parts.push(JSON.stringify({
    signatures: [{ trait: 'trait description', frequency: 0.9, category: 'theme|rhyme|storytelling|vocabulary|imagery|device' }],
    tendencies: [{ trait: 'trait description', frequency: 0.6, category: 'category' }],
    experiments: [{ trait: 'trait description', frequency: 0.2, category: 'category' }],
    dominantThemes: ['top 3-5 recurring themes across all songs'],
    dominantMood: 'the overall emotional character of the catalog',
    rhymeProfile: 'summary of how this artist rhymes (schemes, complexity, style)',
    storytellingProfile: 'summary of how this artist tells stories',
    vocabularyProfile: 'summary of the artist\'s vocabulary patterns and register',
    essenceStatement: '2-3 paragraph ghostwriter instructions: who this artist is as a writer, what makes their style unique, how to write like them',
    blueprint: {
      mustInclude: ['elements that must appear in any song by this artist'],
      shouldInclude: ['elements that usually appear and enhance authenticity'],
      avoidRepeating: ['specific themes/images/phrases already used that should not be recycled'],
      suggestExploring: ['new directions the artist hasn\'t tried yet that would fit their style'],
    },
  }, null, 2))

  parts.push('')
  parts.push('Rules for frequency bucketing:')
  parts.push('- signatures: traits appearing in 80%+ of songs (frequency 0.8-1.0)')
  parts.push('- tendencies: traits in 40-79% of songs (frequency 0.4-0.79)')
  parts.push('- experiments: traits in <40% of songs (frequency 0.01-0.39)')
  parts.push('- With only 1 song, everything is a signature (frequency 1.0)')
  parts.push('- essenceStatement should read like instructions to a ghostwriter: "This artist writes about X. Their rhymes tend to Y. When writing as them, always Z."')
  parts.push('- blueprint.avoidRepeating: list specific imagery/phrases/themes from the catalog that should NOT be reused verbatim')
  parts.push('- blueprint.suggestExploring: based on the artist\'s style, suggest 3-5 new creative directions')
  parts.push('- Do NOT include markdown formatting or code fences. Return raw JSON only.')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { entries, artistName } = await request.json() as {
      entries: AnalyzedEntry[]
      artistName: string
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'At least one analyzed entry is required' }, { status: 400 })
    }

    const prompt = buildPrompt(entries, artistName || '')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Genome Calculation",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 6000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Genome calculation failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    let genome: CatalogGenome
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      const parsed = JSON.parse(cleaned)
      genome = {
        signatures: parsed.signatures || [],
        tendencies: parsed.tendencies || [],
        experiments: parsed.experiments || [],
        dominantThemes: parsed.dominantThemes || [],
        dominantMood: parsed.dominantMood || '',
        rhymeProfile: parsed.rhymeProfile || '',
        storytellingProfile: parsed.storytellingProfile || '',
        vocabularyProfile: parsed.vocabularyProfile || '',
        essenceStatement: parsed.essenceStatement || '',
        blueprint: {
          mustInclude: parsed.blueprint?.mustInclude || [],
          shouldInclude: parsed.blueprint?.shouldInclude || [],
          avoidRepeating: parsed.blueprint?.avoidRepeating || [],
          suggestExploring: parsed.blueprint?.suggestExploring || [],
        },
        songCount: entries.length,
        calculatedAt: new Date().toISOString(),
      }
    } catch {
      console.error('Failed to parse genome JSON:', raw.substring(0, 500))
      return NextResponse.json({ error: 'Failed to parse genome result' }, { status: 500 })
    }

    return NextResponse.json({ genome })
  } catch (error) {
    console.error('Genome calculation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
