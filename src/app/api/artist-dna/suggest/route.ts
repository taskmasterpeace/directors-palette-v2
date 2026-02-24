/**
 * Artist DNA Suggestion API
 * Magic wand suggestions via OpenRouter GPT-4.1 Mini
 * Genre-agnostic, context-aware suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const MODEL = 'openai/gpt-4.1-mini'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { field, section, currentValue, context, exclude } = await request.json()

    if (!field || !section) {
      return NextResponse.json({ error: 'field and section are required' }, { status: 400 })
    }

    // Build rich context from ALL filled DNA fields
    const contextParts: string[] = []
    const artistName = context?.identity?.stageName || context?.identity?.name || context?.identity?.realName
    if (artistName) contextParts.push(`Artist: ${artistName}`)
    if (context?.identity?.ethnicity) contextParts.push(`Ethnicity: ${context.identity.ethnicity}`)
    if (context?.identity?.city) {
      const loc = [context.identity.city, context.identity.state].filter(Boolean).join(', ')
      contextParts.push(`From: ${loc}`)
    }
    if (context?.identity?.neighborhood) contextParts.push(`Neighborhood: ${context.identity.neighborhood}`)
    if (context?.identity?.backstory) contextParts.push(`Backstory: ${context.identity.backstory.slice(0, 200)}`)
    if (context?.sound?.genres?.length) contextParts.push(`Genres: ${context.sound.genres.join(', ')}`)
    if (context?.sound?.subgenres?.length) contextParts.push(`Subgenres: ${context.sound.subgenres.join(', ')}`)
    if (context?.sound?.vocalTextures?.length) contextParts.push(`Vocal textures: ${context.sound.vocalTextures.join(', ')}`)
    if (context?.sound?.productionPreferences?.length) contextParts.push(`Production: ${context.sound.productionPreferences.join(', ')}`)
    if (context?.sound?.artistInfluences?.length) contextParts.push(`Influences: ${context.sound.artistInfluences.join(', ')}`)
    if (context?.sound?.melodyBias !== undefined) contextParts.push(`Melody bias: ${context.sound.melodyBias}% (0=pure rap, 100=pure singing)`)
    if (context?.sound?.language) contextParts.push(`Language: ${context.sound.language}`)
    if (context?.persona?.attitude) contextParts.push(`Attitude: ${context.persona.attitude}`)
    if (context?.persona?.traits?.length) contextParts.push(`Traits: ${context.persona.traits.join(', ')}`)
    if (context?.persona?.worldview) contextParts.push(`Worldview: ${context.persona.worldview.slice(0, 200)}`)
    if (context?.look?.fashionStyle) contextParts.push(`Fashion: ${context.look.fashionStyle}`)

    const contextStr = contextParts.length > 0
      ? `\n\nArtist context:\n${contextParts.join('\n')}`
      : ''

    const excludeStr = exclude?.length
      ? `\n\nDo NOT suggest any of these (already used): ${exclude.join(', ')}`
      : ''

    const currentStr = currentValue
      ? `\n\nCurrent value: "${currentValue}"`
      : ''

    // Field-specific guidance for shorter, more targeted suggestions
    const fieldGuidance = getFieldGuidance(field, section, context, currentValue)

    const systemPrompt = `You are a music industry creative consultant. Generate 10 unique, creative suggestions for an artist profile field.
Return ONLY a JSON array of 10 strings, no other text.
Be specific, authentic, and genre-agnostic. Avoid generic/clich\u00e9 suggestions.
${fieldGuidance}${contextStr}${currentStr}${excludeStr}`

    const userPrompt = `Generate 10 suggestions for the "${field}" field in the "${section}" section of a music artist profile.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': "Director's Palette - Artist DNA Suggestions",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter error:', error)
      return NextResponse.json({ error: 'Suggestion generation failed' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    if (!content.trim()) {
      return NextResponse.json({ suggestions: [] })
    }

    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const suggestions = JSON.parse(cleaned)
      return NextResponse.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] })
    } catch {
      console.error('Failed to parse suggestions:', content.substring(0, 300))
      return NextResponse.json({ suggestions: [] })
    }
  } catch (error) {
    console.error('Suggestion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFieldGuidance(field: string, section: string, context?: any, currentValue?: string): string {
  // Smart skin tone guidance based on ethnicity
  if (field === 'skinTone' && context?.identity?.ethnicity) {
    const ethnicity = context.identity.ethnicity.toLowerCase()
    let toneGuide = ''
    if (ethnicity.includes('black') || ethnicity.includes('african')) {
      toneGuide = 'Suggest tones like: deep mahogany, dark chocolate, espresso, ebony, chestnut, sienna, rich walnut, warm umber.'
    } else if (ethnicity.includes('white') || ethnicity.includes('european') || ethnicity.includes('caucasian')) {
      toneGuide = 'Suggest tones like: ivory, porcelain, fair, peach, cream, alabaster, rose-tinted, sun-kissed.'
    } else if (ethnicity.includes('latin') || ethnicity.includes('hispanic')) {
      toneGuide = 'Suggest tones like: caramel, golden, olive, honey, bronze, warm tan, sun-bronzed, café au lait.'
    } else if (ethnicity.includes('south asian') || ethnicity.includes('indian')) {
      toneGuide = 'Suggest tones like: golden brown, dusky, copper, warm brown, tawny, cinnamon, sandalwood.'
    } else if (ethnicity.includes('asian') || ethnicity.includes('east asian')) {
      toneGuide = 'Suggest tones like: warm beige, golden, light caramel, sand, wheat, soft amber, honey glow.'
    } else {
      toneGuide = `Consider the artist's ${context.identity.ethnicity} background when suggesting skin tones.`
    }
    return `Keep to 2-4 words. Descriptive skin tone. ${toneGuide}`
  }

  const guides: Record<string, string> = {
    // Identity
    'backstory': currentValue
      ? `The backstory already reads:\n"${currentValue.slice(0, 600)}"\n\nGenerate 5 CONTINUATION paragraphs (2-3 sentences each) that naturally extend this existing backstory. Each option should add a new story beat — a turning point, conflict, breakthrough, relationship, or setback. Continue in the same third-person voice and tense. Do NOT repeat what's already written. Do NOT re-introduce the character. Pick up where the story leaves off and push the narrative forward. Return a JSON array of 5 strings.`
      : 'Write 5 different opening backstory paragraphs (2-3 sentences each) in third person as if describing a fictional artist. DO NOT write questions or prompts. Write concrete narrative: "Grew up in...", "After losing...", "Found music when...". Each suggestion should be a different backstory angle the user can click to populate the field.',
    'significantEvents': 'Keep each tag to 5-8 words. Write concrete events, NOT questions. Examples: "Lost father at age 12", "First open mic at 16", "Dropped out to pursue music". Life-changing events, milestones, pivotal moments.',
    // Sound
    'vocalTextures': 'Keep tags to 1-3 words. Descriptive vocal qualities across all music styles.',
    'productionPreferences': 'Keep tags to 1-3 words. Production techniques and aesthetics.',
    'artistInfluences': 'Suggest real artist names from any genre that match the profile context.',
    'soundDescription': 'Keep to 2-3 sentences. Describe the sonic palette and feel.',
    // Persona
    'traits': 'Keep tags to 1-2 words. Personality traits and character qualities.',
    'likes': 'Keep tags to 1-3 words. Things the artist is passionate about.',
    'dislikes': 'Keep tags to 1-3 words. Things the artist opposes or avoids.',
    'attitude': 'Keep to 5-8 words. Overall demeanor and energy.',
    'worldview': 'Keep to 2-3 sentences. Philosophy and outlook on life.',
    // Lexicon
    'signaturePhrases': 'Keep to 2-5 words each. Catchphrases, mottos, recurring lines.',
    'slang': 'Keep to 1-3 words each. Regional or personal slang terms.',
    'adLibs': 'Keep to 1-2 words each. Vocal ad-libs and interjections.',
    'bannedWords': 'Keep to 1-2 words each. Words or phrases the artist avoids.',
    // Look
    'skinTone': 'Keep to 2-4 words. Descriptive skin tone.',
    'hairStyle': 'Keep to 3-6 words. Hairstyle description.',
    'fashionStyle': 'Keep to 3-6 words. Fashion aesthetic and style.',
    'jewelry': 'Keep to 3-6 words. Jewelry and accessories.',
    'tattoos': 'Keep to 3-8 words. Tattoo descriptions and placements.',
    'visualDescription': 'Keep to 2-3 sentences. Overall visual presence and aesthetic.',
  }

  return guides[field] || `Keep suggestions concise and relevant to the ${section} section.`
}
