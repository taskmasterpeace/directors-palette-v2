import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { createLogger } from '@/lib/logger'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { creditsService } from '@/features/credits/services/credits.service'
import { SYSTEM_TEMPLATE_URLS } from '@/features/shot-creator/types/recipe-constants'

export const maxDuration = 120

const log = createLogger('BrandStudio')

const BRAND_GUIDE_TEMPLATE_URL = SYSTEM_TEMPLATE_URLS.brandGuideTemplate

const STORAGE_BUCKET = 'directors-palette'

const BRAND_ANALYSIS_SYSTEM_PROMPT = `You are a brand identity analyst. Given a company description (and optionally a logo image), analyze the brand and produce a structured brand configuration.

Return ONLY valid JSON (no markdown fences, no commentary). The JSON must follow this EXACT schema:

{
  "tagline": "A short brand tagline",
  "industry": "Primary industry",
  "audience": {
    "primary": "Primary target audience description",
    "secondary": "Secondary audience description",
    "psychographics": "Key psychographic traits of the audience as a paragraph"
  },
  "voice": {
    "tone": ["tone1", "tone2", "tone3", "tone4", "tone5"],
    "avoid": ["thing to avoid 1", "thing to avoid 2", "thing to avoid 3"],
    "persona": "A 1-2 sentence description of the brand's speaking personality"
  },
  "visual_identity": {
    "colors": [
      { "name": "Brand Primary", "hex": "#hex1", "role": "primary" },
      { "name": "Brand Secondary", "hex": "#hex2", "role": "secondary" },
      { "name": "Accent", "hex": "#hex3", "role": "accent" },
      { "name": "Background", "hex": "#hex4", "role": "background" },
      { "name": "Text", "hex": "#hex5", "role": "text" }
    ],
    "typography": {
      "heading_font": "Suggested heading font family",
      "body_font": "Suggested body font family",
      "weights": ["Regular", "Medium", "SemiBold", "Bold"],
      "heading_sizes": "h1: 36pt, h2: 24pt, h3: 16pt, body: 14pt"
    }
  },
  "music": {
    "genres": ["genre1", "genre2", "genre3"],
    "moods": ["mood1", "mood2", "mood3"],
    "bpm_range": { "min": 80, "max": 120 }
  },
  "visual_style": {
    "photography_tone": "Description of the photography mood and tone",
    "subjects": ["subject1", "subject2", "subject3"],
    "composition": "Composition and framing guidelines"
  }
}

If a logo image is provided, extract colors from it. Otherwise infer appropriate colors from the brand description. Be specific and detailed in every field. Return 5 colors minimum.`

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

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Transform LLM output into the exact shapes the UI expects.
 * Handles both the new prompt format AND legacy formats gracefully.
 */
function parseBrandGuideOutput(raw: Record<string, any>) {
  // --- Audience ---
  const rawAud = raw.audience || {}
  const audience = {
    primary: rawAud.primary || '',
    secondary: rawAud.secondary || '',
    psychographics: Array.isArray(rawAud.psychographics)
      ? rawAud.psychographics.join(', ')
      : (rawAud.psychographics || ''),
  }

  // --- Voice ---
  const rawVoice = raw.voice || {}
  const voice = {
    tone: rawVoice.tone || [],
    avoid: rawVoice.avoid || rawVoice.avoids || [],
    persona: rawVoice.persona || rawVoice.speaks_like || '',
  }

  // --- Visual Identity ---
  const rawVi = raw.visual_identity || {}
  let colors = rawVi.colors
  if (!Array.isArray(colors) || !colors.length) {
    // Legacy format: primary_colors + secondary_colors as hex arrays
    const primary = rawVi.primary_colors || []
    const secondary = rawVi.secondary_colors || []
    colors = [
      ...primary.map((hex: string, i: number) => ({ name: `Primary ${i + 1}`, hex, role: 'primary' })),
      ...secondary.map((hex: string, i: number) => ({ name: `Secondary ${i + 1}`, hex, role: 'secondary' })),
    ]
  }
  const rawTypo = rawVi.typography || {}
  const visualIdentity = {
    colors: colors.map((c: any) => ({
      name: c.name || 'Color',
      hex: c.hex || '#888888',
      role: c.role || 'accent',
    })),
    typography: {
      heading_font: rawTypo.heading_font || rawVi.font_family || '',
      body_font: rawTypo.body_font || rawVi.font_family || '',
      weights: rawTypo.weights || rawVi.font_weights || [],
      heading_sizes: typeof rawTypo.heading_sizes === 'string'
        ? rawTypo.heading_sizes
        : (typeof rawVi.heading_sizes === 'object'
          ? Object.entries(rawVi.heading_sizes || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
          : ''),
    },
  }

  // --- Music ---
  const rawMusic = raw.music || {}
  const bpm = rawMusic.bpm_range
  const music = {
    genres: rawMusic.genres || rawMusic.preferred_genres || [],
    moods: rawMusic.moods || rawMusic.preferred_moods || [],
    bpm_range: Array.isArray(bpm)
      ? { min: bpm[0] || 80, max: bpm[1] || 140 }
      : (bpm && typeof bpm === 'object' ? { min: bpm.min || 80, max: bpm.max || 140 } : { min: 80, max: 140 }),
  }

  // --- Visual Style ---
  const rawStyle = raw.visual_style || {}
  const visualStyle = {
    photography_tone: rawStyle.photography_tone || rawVi.photography_tone || '',
    subjects: rawStyle.subjects || (rawVi.photography_subjects ? [rawVi.photography_subjects] : []),
    composition: rawStyle.composition || rawVi.composition || '',
  }

  return {
    tagline: raw.tagline || null,
    industry: raw.industry || null,
    audience_json: audience,
    voice_json: voice,
    visual_identity_json: visualIdentity,
    music_json: music,
    visual_style_json: visualStyle,
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Build a detailed prompt for nano-banana-2 to generate a visual brand guide image.
 */
function buildBrandGuideImagePrompt(brandName: string, parsed: ReturnType<typeof parseBrandGuideOutput>): string {
  const vi = parsed.visual_identity_json
  const colors = vi?.colors ?? []
  const typo = vi?.typography
  const style = parsed.visual_style_json

  const colorDesc = colors.map((c: { name: string; hex: string; role: string }) => `${c.name} (${c.hex}, ${c.role})`).join(', ')
  const fontDesc = typo
    ? `Heading: ${typo.heading_font}, Body: ${typo.body_font}, Sizes: ${typo.heading_sizes}`
    : ''

  return [
    `BRAND VISUAL IDENTITY GUIDE for "${brandName}"`,
    '',
    'LAYOUT: Professional brand style guide sheet organized in 6 labeled sections on a clean white/light background.',
    '',
    'SECTION 1 - LOGO USAGE:',
    `- Display the brand name "${brandName}" in large, bold typography`,
    '- Show logo placement rules: full color, reversed, monochrome variants',
    '- Clear space and minimum size guidelines',
    '',
    'SECTION 2 - COLOR PALETTE:',
    `- Large color swatches with hex codes: ${colorDesc}`,
    '- Primary and secondary color groupings clearly labeled',
    '',
    'SECTION 3 - TYPOGRAPHY:',
    `- ${fontDesc}`,
    '- Show font hierarchy: H1 largest, H2 medium, H3 smaller, Body text',
    `- Weight examples: ${typo?.weights?.join(', ') || 'Regular, Bold'}`,
    '',
    'SECTION 4 - PHOTOGRAPHY STYLE:',
    `- Mood: ${style?.photography_tone || 'modern and professional'}`,
    `- Subjects: ${style?.subjects?.join(', ') || 'people, products, lifestyle'}`,
    '',
    'SECTION 5 - ICONOGRAPHY:',
    '- Clean, minimal icon style examples',
    '- Consistent stroke weight and rounded corners',
    '',
    'SECTION 6 - GRAPHIC ELEMENTS:',
    `- Patterns and textures using brand colors`,
    `- ${style?.composition || 'Clean, balanced compositions with ample white space'}`,
    '',
    'STYLE: Professional brand identity document, clean corporate design, organized grid layout, print-ready quality, crisp typography, high production value. NOT a website mockup. This is a static visual reference sheet.',
  ].join('\n')
}

/**
 * Generate a brand guide image with nano-banana-2 and upload to Supabase storage.
 */
async function generateBrandGuideImage(
  brandName: string,
  brandId: string,
  userId: string,
  parsed: ReturnType<typeof parseBrandGuideOutput>,
  logoUrl: string | null
): Promise<string | null> {
  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    const prompt = buildBrandGuideImagePrompt(brandName, parsed)
    const imageInputs: string[] = [BRAND_GUIDE_TEMPLATE_URL]
    if (logoUrl && !logoUrl.startsWith('data:')) {
      imageInputs.push(logoUrl)
    }

    log.info('Generating brand guide image', { brandId, imageInputCount: imageInputs.length })

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-2',
      input: {
        prompt,
        aspect_ratio: '16:9',
        image_input: imageInputs,
        output_format: 'jpg',
      },
    })
    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status !== 'succeeded' || !completed.output) {
      log.error('Brand guide image generation failed', { status: completed.status })
      return null
    }

    const replicateUrl = Array.isArray(completed.output)
      ? completed.output[0]
      : completed.output

    // Download and upload to Supabase storage
    const response = await fetch(replicateUrl)
    if (!response.ok) {
      log.error('Failed to download brand guide image', { status: response.status })
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const timestamp = Date.now()
    const storagePath = `generations/${userId}/brand-guide_${brandId}_${timestamp}.jpg`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) {
      log.error('Brand guide image upload error', { error: uploadError.message })
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    return publicUrl
  } catch (error) {
    log.error('Brand guide image generation error', { error: error instanceof Error ? error.message : String(error) })
    return null
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

    // Update brand with generated data (save LLM results first)
    const supabase = await getAPIClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: any = {
      ...result,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('brands')
      .update(updatePayload)
      .eq('id', brand_id)
      .select()
      .single()

    if (error) {
      log.error('Failed to update brand with guide data', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Phase 2: Generate visual brand guide image (non-fatal)
    const deductResult = await creditsService.deductCredits(auth.user.id, 'nano-banana-2', {
      generationType: 'image',
      description: 'Brand Studio: visual brand guide generation',
      overrideAmount: 15,
      user_email: auth.user.email,
    })

    if (deductResult.success) {
      const imageUrl = await generateBrandGuideImage(
        data.name || brand_id,
        brand_id,
        auth.user.id,
        result,
        logo_url
      )

      if (imageUrl) {
        const { data: updated } = await supabase
          .from('brands')
          .update({ brand_guide_image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq('id', brand_id)
          .select()
          .single()

        if (updated) {
          return NextResponse.json(updated)
        }
      }
    } else {
      log.info('Skipping brand guide image — insufficient credits', { userId: auth.user.id })
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
