/**
 * Adhub Generate API (v2)
 * Trigger ad image generation using product + preset
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClient } from '@/lib/db/client'
import { AdhubBrandService } from '@/features/adhub/services/adhub-brand.service'
import { AdhubProductService } from '@/features/adhub/services/adhub-product.service'
import { getPresetBySlug } from '@/features/adhub/data/presets.data'

// POST - Generate ad image
export async function POST(request: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      brandId,
      productId,
      presetSlug,
      selectedReferenceImages,
      aspectRatio,
      model,
      // Riverflow-specific inputs
      riverflowSourceImages,
      riverflowDetailRefs,
      riverflowFontUrls,
      riverflowFontTexts,
      riverflowSettings,
    } = body

    // Validate required fields
    if (!brandId || !productId || !presetSlug) {
      return NextResponse.json({
        error: 'Brand, product, and preset are required'
      }, { status: 400 })
    }

    // Fetch all required entities
    const [brandResult, product] = await Promise.all([
      AdhubBrandService.getBrandWithImages(brandId),
      AdhubProductService.getProductById(productId),
    ])

    const preset = getPresetBySlug(presetSlug)

    if (!brandResult) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
    }

    // Verify brand ownership
    if (brandResult.brand.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fill preset template with extracted copy
    const copy = product.extractedCopy
    const filledTemplate = preset.promptTemplate
      .replace(/\{headline\}/g, copy.headline || '')
      .replace(/\{tagline\}/g, copy.tagline || '')
      .replace(/\{valueProp\}/g, copy.valueProp || '')
      .replace(/\{features\}/g, (copy.features || []).join(', '))
      .replace(/\{audience\}/g, copy.audience || '')

    // Compose final prompt:
    // [filled preset template] + [brand context] + [preset style modifiers]
    const promptParts: string[] = [filledTemplate]

    if (brandResult.brand.contextText) {
      promptParts.push(brandResult.brand.contextText)
    }

    promptParts.push(preset.styleModifiers)

    const prompt = promptParts.join('\n\n')

    // Collect reference images
    const referenceImages: string[] = []

    if (brandResult.brand.logoUrl) {
      referenceImages.push(brandResult.brand.logoUrl)
    }

    if (selectedReferenceImages && selectedReferenceImages.length > 0) {
      referenceImages.push(...selectedReferenceImages)
    }

    // Create ad record
    const apiClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: adData, error: adError } = await apiClient
      .from('adhub_ads')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        product_id: productId,
        preset_slug: presetSlug,
        generated_prompt: prompt,
        status: 'generating',
      })
      .select()
      .single()

    if (adError) {
      console.error('Error creating ad record:', adError)
      return NextResponse.json({ error: 'Failed to create ad record' }, { status: 500 })
    }

    const adId = adData.id

    try {
      // Build model settings
      const selectedModel = model || 'nano-banana-pro'
      const isRiverflow = selectedModel === 'riverflow-2-pro'

      let modelSettings: Record<string, unknown> = {
        aspectRatio: aspectRatio || '1:1',
        outputFormat: 'png',
      }

      if (isRiverflow && riverflowSettings) {
        modelSettings = {
          aspectRatio: aspectRatio || '1:1',
          outputFormat: riverflowSettings.transparency ? 'png' : 'webp',
          resolution: riverflowSettings.resolution || '2K',
          transparency: riverflowSettings.transparency || false,
          enhancePrompt: riverflowSettings.enhancePrompt !== false,
          maxIterations: riverflowSettings.maxIterations || 3,
        }
      }

      const refsToSend = isRiverflow && riverflowSourceImages?.length > 0
        ? riverflowSourceImages
        : referenceImages

      const genRequestBody: Record<string, unknown> = {
        prompt,
        model: selectedModel,
        referenceImages: refsToSend,
        modelSettings,
        extraMetadata: {
          source: 'adhub',
          adId,
          brandId,
          productId,
          presetSlug,
        },
      }

      if (isRiverflow) {
        if (riverflowDetailRefs?.length > 0) {
          genRequestBody.detailRefImages = riverflowDetailRefs
        }
        if (riverflowFontUrls?.length > 0) {
          genRequestBody.fontUrls = riverflowFontUrls
          genRequestBody.fontTexts = riverflowFontTexts || []
        }
      }

      // Call the internal image generation API
      const genResponse = await fetch(new URL('/api/generation/image', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || '',
        },
        body: JSON.stringify(genRequestBody),
      })

      if (!genResponse.ok) {
        const error = await genResponse.json()
        console.error('Image generation API error:', error)

        await apiClient
          .from('adhub_ads')
          .update({ status: 'failed' })
          .eq('id', adId)

        return NextResponse.json({
          error: error.error || 'Failed to generate image',
          details: error.details || null,
          suggestions: error.suggestions || null,
        }, { status: genResponse.status })
      }

      const result = await genResponse.json()

      await apiClient
        .from('adhub_ads')
        .update({
          gallery_id: result.galleryId,
          status: 'completed',
        })
        .eq('id', adId)

      return NextResponse.json({
        adId,
        galleryId: result.galleryId,
        predictionId: result.predictionId,
        imageUrl: result.imageUrl || '',
        prompt,
      })
    } catch (error) {
      await apiClient
        .from('adhub_ads')
        .update({ status: 'failed' })
        .eq('id', adId)

      throw error
    }
  } catch (error) {
    console.error('Error generating ad:', error)
    return NextResponse.json({ error: 'Failed to generate ad' }, { status: 500 })
  }
}
