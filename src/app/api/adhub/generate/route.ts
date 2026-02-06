/**
 * Adhub Generate API
 * Trigger ad image generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClient } from '@/lib/db/client'
import { AdhubBrandService } from '@/features/adhub/services/adhub-brand.service'
import { AdhubStyleService } from '@/features/adhub/services/adhub-style.service'
import { AdhubTemplateService } from '@/features/adhub/services/adhub-template.service'

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
      styleId,
      templateId,
      fieldValues,
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
    if (!brandId || !styleId || !templateId) {
      return NextResponse.json({
        error: 'Brand, style, and template are required'
      }, { status: 400 })
    }

    // Fetch all required entities
    const [brandResult, style, template] = await Promise.all([
      AdhubBrandService.getBrandWithImages(brandId),
      AdhubStyleService.getStyle(styleId),
      AdhubTemplateService.getTemplate(templateId),
    ])

    if (!brandResult) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }
    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify brand ownership
    if (brandResult.brand.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build the goal prompt with filled field values
    let goalPrompt = template.goalPrompt

    // Replace field placeholders with values
    for (const field of template.fields || []) {
      const value = fieldValues?.[field.fieldName]
      if (value) {
        // Replace {{fieldName}} style placeholders
        goalPrompt = goalPrompt.replace(
          new RegExp(`\\{\\{${field.fieldName}\\}\\}`, 'g'),
          value
        )
      }
    }

    // Compose final prompt:
    // [TEMPLATE GOAL with filled field values]
    // [BRAND CONTEXT paragraph]
    // [STYLE PROMPT MODIFIERS]
    const promptParts: string[] = [goalPrompt]

    if (brandResult.brand.contextText) {
      promptParts.push(brandResult.brand.contextText)
    }

    promptParts.push(style.promptModifiers)

    const prompt = promptParts.join('\n\n')

    // Collect reference images
    const referenceImages: string[] = []

    // Add brand logo if available
    if (brandResult.brand.logoUrl) {
      referenceImages.push(brandResult.brand.logoUrl)
    }

    // Add selected brand reference images
    if (selectedReferenceImages && selectedReferenceImages.length > 0) {
      referenceImages.push(...selectedReferenceImages)
    }

    // Add image fields from template
    for (const field of template.fields || []) {
      if (field.fieldType === 'image') {
        const imageUrl = fieldValues?.[field.fieldName]
        if (imageUrl) {
          referenceImages.push(imageUrl)
        }
      }
    }

    // Create ad record in pending state (use untyped client for adhub tables)
    const apiClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: adData, error: adError } = await apiClient
      .from('adhub_ads')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        style_id: styleId,
        template_id: templateId,
        field_values: fieldValues || {},
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
      // Build model settings based on selected model
      const selectedModel = model || 'nano-banana-pro'
      const isRiverflow = selectedModel === 'riverflow-2-pro'

      let modelSettings: Record<string, unknown> = {
        aspectRatio: aspectRatio || '1:1',
        outputFormat: 'png',
      }

      // Add Riverflow-specific settings
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

      // For Riverflow, use riverflowSourceImages as the main reference images
      const refsToSend = isRiverflow && riverflowSourceImages?.length > 0
        ? riverflowSourceImages
        : referenceImages

      // Build request body
      const genRequestBody: Record<string, unknown> = {
        prompt,
        model: selectedModel,
        referenceImages: refsToSend,
        modelSettings,
        extraMetadata: {
          source: 'adhub',
          adId,
          brandId,
          styleId,
          templateId,
        },
      }

      // Add Riverflow-specific inputs
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

        // Mark ad as failed
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

      // Update ad with gallery ID
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
      // Mark ad as failed
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
