import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('BrandStudio')

const BRAND_ANALYSIS_SYSTEM_PROMPT = `You are a brand identity analyst. Given a company logo image and description text, analyze the visual identity and produce a structured brand configuration.

Return ONLY valid JSON (no markdown fences, no commentary). The JSON must follow this exact schema:

{
  "brand": "Company Name",
  "tagline": "Tagline derived from the description",
  "industry": "Primary industry",
  "audience": {
    "primary": "Primary target audience",
    "secondary": "Secondary audience",
    "psychographics": ["trait1", "trait2", "trait3", "trait4"]
  },
  "voice": {
    "tone": ["tone1", "tone2", "tone3", "tone4", "tone5"],
    "avoids": ["avoid1", "avoid2", "avoid3", "avoid4"],
    "speaks_like": "A brief persona description"
  },
  "visual_identity": {
    "primary_colors": ["#hex1", "#hex2"],
    "secondary_colors": ["#hex1", "#hex2"],
    "font_family": "Suggested font family name",
    "font_weights": ["Regular", "Medium", "SemiBold", "Bold"],
    "heading_sizes": { "h1": "36pt", "h2": "24pt", "h3": "16pt", "body": "12pt" },
    "icon_style": "Style description (e.g. rounded, geometric, outlined)",
    "icon_line_weight": "Weight description (e.g. 2px consistent stroke)",
    "icon_radius": "Radius description (e.g. 4px rounded corners)",
    "photography_tone": "Photography mood/tone description",
    "photography_subjects": "Subject matter description",
    "composition": "Composition guidelines",
    "graphic_elements": "Standard graphic element descriptions",
    "background_patterns": "Background pattern descriptions"
  },
  "music": {
    "preferred_genres": ["genre1", "genre2", "genre3"],
    "preferred_moods": ["mood1", "mood2", "mood3"],
    "bpm_range": [80, 120],
    "avoid": ["avoid1", "avoid2"]
  },
  "visual_style": {
    "colors": ["color description 1", "color description 2"],
    "imagery": ["imagery1", "imagery2", "imagery3"],
    "feel": ["feel1", "feel2", "feel3"]
  }
}

Extract colors from the logo image. Infer the brand personality, audience, and style from both the logo and the company description. Be specific and detailed in every field.`

/**
 * Get logo as a data URI for LLM vision input.
 * Handles both data URIs (from frontend upload) and HTTP URLs (from storage).
 */
async function getLogoDataUri(logoUrl: string): Promise<string> {
  // Already a data URI — use directly
  if (logoUrl.startsWith('data:')) {
    return logoUrl
  }

  // HTTP URL — fetch and convert
  const response = await fetch(logoUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch logo: ${response.status} ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const contentType = response.headers.get('content-type') || 'image/png'
  return `data:${contentType};base64,${base64}`
}

/**
 * Call OpenRouter LLM to analyze logo + company description
 */
async function analyzeBrand(
  logoUrl: string | null,
  companyDescription: string
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  // Build user message content
  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

  // Add logo image if provided
  if (logoUrl) {
    log.info('Preparing logo for vision analysis')
    const logoDataUri = await getLogoDataUri(logoUrl)
    userContent.push({
      type: 'image_url',
      image_url: { url: logoDataUri }
    })
  }

  userContent.push({
    type: 'text',
    text: `Company info: ${companyDescription}\n\nAnalyze ${logoUrl ? 'this logo and ' : ''}the company description. Return the brand JSON.`
  })

  log.info('Calling OpenRouter for brand analysis')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://directorspal.com',
      'X-Title': 'Directors Palette Brand Studio'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: BRAND_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 4096
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`OpenRouter error: ${JSON.stringify(data.error)}`)
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No response content from LLM')
  }

  // Strip markdown code fences if present
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  try {
    return JSON.parse(jsonStr)
  } catch {
    log.error('Failed to parse brand JSON from LLM', { content })
    throw new Error('Failed to parse brand analysis response')
  }
}

/**
 * Map LLM output to database columns
 */
function parseBrandGuideOutput(data: Record<string, unknown>): Record<string, unknown> {
  return {
    tagline: data.tagline || null,
    industry: data.industry || null,
    audience_json: data.audience || null,
    voice_json: data.voice || null,
    visual_identity_json: data.visual_identity || null,
    music_json: data.music || null,
    visual_style_json: data.visual_style || null,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth — same pattern as shot creator
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { brand_id, logo_url, company_description } = body

    if (!brand_id || !company_description) {
      return NextResponse.json(
        { error: 'brand_id and company_description are required' },
        { status: 400 }
      )
    }

    log.info('Generating brand guide', { brand_id, logo_url: logo_url ? '(provided)' : '(none)', userId: auth.user.id })

    // Call OpenRouter directly — no child process, completes in ~15-30s
    const brandData = await analyzeBrand(logo_url, company_description)

    log.info('Brand analysis complete', {
      brand: brandData.brand,
      industry: brandData.industry,
    })

    const result = parseBrandGuideOutput(brandData)

    // Update brand with generated data
    const supabase = await getAPIClient()
    const { data, error } = await supabase
      .from('brands')
      .update({
        ...result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brand_id)
      .select()
      .single()

    if (error) {
      log.error('Failed to update brand with guide data', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Generate brand guide error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Brand guide generation failed' },
      { status: 500 }
    )
  }
}
