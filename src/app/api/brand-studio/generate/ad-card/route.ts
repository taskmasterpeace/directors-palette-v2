import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { creditsService } from '@/features/credits/services/credits.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { createLogger } from '@/lib/logger'
import type { Brand } from '@/features/brand-studio/types'

export const maxDuration = 120

const log = createLogger('BrandStudio:AdCardGen')
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
const CREDIT_COST = 10
const MODEL = 'google/nano-banana-2'

/**
 * Build a prompt for nano-banana that creates a visual ad card
 * from the generated copy + brand identity.
 */
function buildAdCardPrompt(
  headline: string,
  hook: string,
  tagline: string,
  brand: Brand,
): string {
  const colors = brand.visual_identity_json?.colors || []
  const style = brand.visual_style_json
  const typo = brand.visual_identity_json?.typography

  const parts = [
    'A professional advertising creative / ad card with bold typography.',
    '',
    `HEADLINE TEXT: "${headline}"`,
    hook ? `SUBHEADLINE: "${hook}"` : '',
    tagline ? `TAGLINE: "${tagline}"` : '',
    brand.name ? `BRAND: ${brand.name}` : '',
    '',
    'DESIGN GUIDELINES:',
    '- Clean, high-impact advertising layout',
    '- Bold headline typography as the focal point',
    '- Professional ad creative suitable for social media or print',
    '- Ample negative space, modern composition',
    colors.length ? `- Color palette: ${colors.map(c => `${c.name} ${c.hex}`).join(', ')}` : '',
    style?.photography_tone ? `- Visual mood: ${style.photography_tone}` : '',
    style?.subjects?.length ? `- Visual elements: ${style.subjects.join(', ')}` : '',
    style?.composition ? `- Composition: ${style.composition}` : '',
    typo?.heading_font ? `- Heading font style: ${typo.heading_font}` : '',
    '',
    'STYLE: High-end advertising creative, magazine-quality, striking visual impact, professional typography, brand-consistent design. This is a real advertisement, not a mockup or wireframe.',
  ]

  return parts.filter(Boolean).join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { headline, hook, tagline, brandId, aspectRatio = '1:1' } = body

    if (!headline?.trim()) {
      return NextResponse.json({ error: 'Headline is required' }, { status: 400 })
    }

    if (!brandId) {
      return NextResponse.json({ error: 'Brand is required for ad card generation' }, { status: 400 })
    }

    // Check credits
    const credits = await creditsService.getBalance(auth.user.id)
    const currentBalance = credits?.balance ?? 0
    if (currentBalance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance: currentBalance }, { status: 402 })
    }

    // Fetch brand with guide image
    const supabase = await getAPIClient()
    const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const typedBrand = brand as unknown as Brand

    // Build prompt
    const prompt = buildAdCardPrompt(
      headline.trim(),
      hook?.trim() || '',
      tagline?.trim() || '',
      typedBrand,
    )

    // Build image inputs — use brand guide image as style reference
    const imageInputs: string[] = []
    if (typedBrand.brand_guide_image_url) {
      imageInputs.push(typedBrand.brand_guide_image_url)
    }
    if (typedBrand.logo_url && !typedBrand.logo_url.startsWith('data:')) {
      imageInputs.push(typedBrand.logo_url)
    }

    log.info('Ad card generation started', {
      brandId,
      aspectRatio,
      imageInputCount: imageInputs.length,
      userId: auth.user.id,
    })

    // Generate via Replicate
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      num_outputs: 1,
      output_format: 'jpg',
      output_quality: 90,
    }
    if (imageInputs.length > 0) {
      input.image_input = imageInputs
    }

    const prediction = await replicate.predictions.create({ model: MODEL, input })

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status === 'failed') {
      log.error('Ad card generation failed', { predictionId: result.id, error: result.error })
      return NextResponse.json({ error: 'Ad card generation failed', details: result.error }, { status: 500 })
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return NextResponse.json({ error: 'No output from model' }, { status: 500 })
    }

    // Download and persist
    const { buffer } = await StorageService.downloadAsset(outputUrl)
    const { ext, mimeType } = StorageService.getMimeType(outputUrl, 'jpg')
    const { publicUrl } = await StorageService.uploadToStorage(buffer, auth.user.id, result.id, ext, mimeType)

    // Gallery entry
    await supabase.from('gallery').insert({
      user_id: auth.user.id,
      prediction_id: result.id,
      generation_type: 'image',
      status: 'completed',
      public_url: publicUrl,
      mime_type: mimeType,
      metadata: {
        prompt,
        headline: headline.trim(),
        hook: hook?.trim() || '',
        tagline: tagline?.trim() || '',
        model: MODEL,
        brand_id: brandId,
        aspect_ratio: aspectRatio,
        source: 'brand-studio-ad-card',
        brand_guide_used: !!typedBrand.brand_guide_image_url,
      },
    })

    // Deduct credits
    await creditsService.deductCredits(auth.user.id, MODEL, {
      generationType: 'image',
      predictionId: result.id,
      description: 'Brand Studio ad card generation',
      overrideAmount: CREDIT_COST,
      user_email: auth.user.email,
    })

    log.info('Ad card generation complete', { predictionId: result.id, publicUrl })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      predictionId: result.id,
      creditsUsed: CREDIT_COST,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error('Ad card generation error', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
