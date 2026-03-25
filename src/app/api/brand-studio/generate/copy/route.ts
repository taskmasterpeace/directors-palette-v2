import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { creditsService } from '@/features/credits/services/credits.service'
import { AD_APPROACHES } from '@/features/brand-studio/data/ad-approaches'
import { createLogger } from '@/lib/logger'
import type { Brand } from '@/features/brand-studio/types'

export const maxDuration = 60

const log = createLogger('BrandStudio:CopyGen')
const CREDIT_COST = 5

const SYSTEM_PROMPT = `You are an elite advertising copywriter and strategist. You generate compelling ad copy, headlines, hooks, taglines, and campaign concepts.

RULES:
- Write in the specific advertising approach/style you are given
- Be bold, creative, and memorable — never generic
- Output structured copy with clear sections
- Adapt tone and style to the brand identity when provided
- Keep headlines punchy (under 15 words)
- Write body copy that feels human, not corporate

OUTPUT FORMAT (use markdown):
## Headline
[One powerful headline]

## Hook
[Opening line that stops the scroll — 1-2 sentences]

## Body Copy
[Main ad copy — 3-5 sentences that drive the message home]

## Tagline
[Short, memorable brand tagline — under 8 words]

## Variants
### Alt Headline 1
[Alternative headline option]

### Alt Headline 2
[Another headline option]

### Alt Hook
[Alternative hook/opening]`

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { prompt, brandId, brandBoost, approachId, outputType = 'full-campaign' } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!approachId) {
      return NextResponse.json({ error: 'An advertising approach is required' }, { status: 400 })
    }

    // Look up the approach
    const approach = AD_APPROACHES.find(a => a.id === approachId)
    if (!approach) {
      return NextResponse.json({ error: 'Invalid approach' }, { status: 400 })
    }

    // Check credits
    const credits = await creditsService.getBalance(auth.user.id)
    const currentBalance = credits?.balance ?? 0
    if (currentBalance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance: currentBalance }, { status: 402 })
    }

    // Brand boost enrichment — pull full brand DNA
    let brandContext = ''
    if (brandBoost && brandId) {
      const supabase = await getAPIClient()
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) {
        const b = brand as unknown as Brand
        const parts: string[] = []
        if (b.name) parts.push(`Brand name: ${b.name}`)
        if (b.tagline) parts.push(`Tagline: ${b.tagline}`)
        if (b.industry) parts.push(`Industry: ${b.industry}`)
        // Voice
        if (b.voice_json) {
          if (b.voice_json.tone?.length) parts.push(`Brand tone: ${b.voice_json.tone.join(', ')}`)
          if (b.voice_json.persona) parts.push(`Brand persona: ${b.voice_json.persona}`)
          if (b.voice_json.avoid?.length) parts.push(`Avoid in copy: ${b.voice_json.avoid.join(', ')}`)
        }
        // Audience
        if (b.audience_json) {
          if (b.audience_json.primary) parts.push(`Primary audience: ${b.audience_json.primary}`)
          if (b.audience_json.secondary) parts.push(`Secondary audience: ${b.audience_json.secondary}`)
          if (b.audience_json.psychographics) parts.push(`Audience psychographics: ${b.audience_json.psychographics}`)
        }
        // Visual identity (useful for color references in copy)
        const colors = b.visual_identity_json?.colors
        if (colors?.length) {
          parts.push(`Brand colors: ${colors.map(c => `${c.name} (${c.hex})`).join(', ')}`)
        }
        // Music (mood context)
        if (b.music_json?.moods?.length) {
          parts.push(`Brand mood: ${b.music_json.moods.join(', ')}`)
        }
        brandContext = parts.join('. ')
        log.info('Brand boost applied (full DNA)', { brandId, contextLength: brandContext.length })
      }
    }

    // Build the user prompt with approach context
    const userPrompt = [
      `ADVERTISING APPROACH: ${approach.name} (${approach.expert})`,
      `CORE PRINCIPLE: ${approach.corePrinciple}`,
      `HOW IT WORKS: ${approach.howItWorks}`,
      `KEY ELEMENTS: ${approach.keyElements.join('; ')}`,
      `TEMPLATE - Big Idea: ${approach.template.bigIdea}`,
      `TEMPLATE - Execution: ${approach.template.execution}`,
      `TEMPLATE - Hook: ${approach.template.hook}`,
      '',
      `OUTPUT TYPE: ${outputType}`,
      '',
      brandContext ? `BRAND CONTEXT: ${brandContext}` : '',
      '',
      `USER BRIEF: ${prompt.trim()}`,
      '',
      'Now generate compelling ad copy following this approach. Be bold and creative.',
    ].filter(Boolean).join('\n')

    // Call OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured')
    }

    log.info('Calling OpenRouter for copy generation', { approachId, outputType, userId: auth.user.id })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://directorspal.com',
        'X-Title': 'Directors Palette Brand Studio',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      log.error('OpenRouter API error', { status: response.status, error: errData })
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new Error('No content returned from LLM')
    }

    // Deduct credits
    await creditsService.deductCredits(auth.user.id, 'openai/gpt-4.1-mini', {
      generationType: 'text',
      predictionId: data.id || `copy-${Date.now()}`,
      description: `Brand Studio copy generation (${approach.name})`,
      overrideAmount: CREDIT_COST,
      user_email: auth.user.email,
    })

    log.info('Copy generation complete', { approachId, userId: auth.user.id, length: text.length })

    return NextResponse.json({
      success: true,
      text,
      id: data.id || `copy-${Date.now()}`,
      creditsUsed: CREDIT_COST,
      approach: approach.name,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Copy generation error', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
