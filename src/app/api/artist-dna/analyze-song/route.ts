/**
 * Analyze Song API
 * Analyzes lyrics to produce a CatalogSongAnalysis (themes, rhyme schemes, storytelling, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type { CatalogSongAnalysis } from '@/features/music-lab/types/artist-dna.types'

const MODEL = 'openai/gpt-4.1-mini'

function buildPrompt(title: string, lyrics: string, mood: string, tempo: string, artistName: string): string {
  const parts: string[] = []

  parts.push('You are an expert music analyst and lyricist.')
  parts.push(`Analyze the following song "${title}" by ${artistName || 'this artist'}.`)
  if (mood) parts.push(`Mood tag: ${mood}`)
  if (tempo) parts.push(`Tempo tag: ${tempo}`)

  parts.push('')
  parts.push('LYRICS:')
  parts.push(lyrics)
  parts.push('')

  parts.push('Analyze this song and return ONLY valid JSON matching this exact schema:')
  parts.push(JSON.stringify({
    themes: ['3-5 thematic tags describing what the song is about'],
    moodProgression: 'how the emotional mood shifts across the song',
    rhymeSchemes: ['detected patterns like AABB, ABAB, internal, multisyllabic, etc.'],
    storytellingApproach: 'narrative | braggadocio | confessional | conversational | abstract | motivational | other',
    vocabularyLevel: 'street | poetic | conversational | literary | mixed',
    notableDevices: ['up to 5 specific wordplay, metaphor, or literary device examples from the lyrics'],
    recurringImagery: ['concrete repeating images or symbols used in the song'],
    verseMap: [{ section: 'Verse 1', artist: 'primary' }, { section: 'Verse 2', artist: 'feature', featureName: 'Drake' }],
    primaryVerseCount: 2,
    emotionalIntensity: 7,
  }, null, 2))

  parts.push('')
  parts.push('Rules:')
  parts.push('- themes: 3-5 short tags (2-4 words each)')
  parts.push('- moodProgression: one sentence describing the emotional arc')
  parts.push('- rhymeSchemes: list all distinct patterns found')
  parts.push('- storytellingApproach: pick the dominant one')
  parts.push('- vocabularyLevel: pick the dominant one')
  parts.push('- notableDevices: quote or paraphrase specific examples (max 5)')
  parts.push('- recurringImagery: concrete images that repeat (not abstract concepts)')
  parts.push('- verseMap: map each section header to primary artist or feature. If no section markers, assume all primary.')
  parts.push('- primaryVerseCount: count of sections attributed to the primary artist')
  parts.push('- emotionalIntensity: 1-10 scale (1=calm reflection, 10=explosive energy)')
  parts.push('- Do NOT include markdown formatting or code fences. Return raw JSON only.')

  return parts.join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { lyrics, title, mood, tempo, artistName } = await request.json() as {
      lyrics: string
      title: string
      mood: string
      tempo: string
      artistName: string
    }

    if (!lyrics || !title) {
      return NextResponse.json({ error: 'lyrics and title are required' }, { status: 400 })
    }

    const prompt = buildPrompt(title, lyrics, mood || '', tempo || '', artistName || '')

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Song Analysis",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Song analysis failed' }, { status: 500 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    // Parse JSON, handling potential markdown wrapping
    let analysis: CatalogSongAnalysis
    try {
      const cleaned = raw.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim()
      const parsed = JSON.parse(cleaned)
      analysis = {
        themes: parsed.themes || [],
        moodProgression: parsed.moodProgression || '',
        rhymeSchemes: parsed.rhymeSchemes || [],
        storytellingApproach: parsed.storytellingApproach || 'conversational',
        vocabularyLevel: parsed.vocabularyLevel || 'mixed',
        notableDevices: parsed.notableDevices || [],
        recurringImagery: parsed.recurringImagery || [],
        verseMap: parsed.verseMap || [],
        primaryVerseCount: parsed.primaryVerseCount || 1,
        emotionalIntensity: parsed.emotionalIntensity || 5,
        analyzedAt: new Date().toISOString(),
      }
    } catch {
      console.error('Failed to parse analysis JSON:', raw.substring(0, 500))
      return NextResponse.json({ error: 'Failed to parse analysis result' }, { status: 500 })
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Song analysis error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
