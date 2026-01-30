/**
 * Adhub Generation Service
 * Handles ad image generation using Nano Banana Pro
 */

import { getAPIClient } from '@/lib/db/client'
import {
  AdhubGenerationRequest,
  AdhubGenerationResult,
  AdhubAd,
  AdhubAdRow,
  adFromRow,
} from '../types/adhub.types'
import { AdhubBrandService } from './adhub-brand.service'
import { AdhubStyleService } from './adhub-style.service'
import { AdhubTemplateService } from './adhub-template.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdhubClient(): Promise<any> {
  return await getAPIClient()
}

export class AdhubGenerationService {
  /**
   * Compose the final prompt from brand, style, template, and field values
   */
  static async composePrompt(request: AdhubGenerationRequest): Promise<{
    prompt: string
    referenceImages: string[]
  }> {
    // Get brand, style, and template
    const [brand, style, template] = await Promise.all([
      AdhubBrandService.getBrandWithImages(request.brandId),
      AdhubStyleService.getStyle(request.styleId),
      AdhubTemplateService.getTemplate(request.templateId),
    ])

    if (!brand) throw new Error('Brand not found')
    if (!style) throw new Error('Style not found')
    if (!template) throw new Error('Template not found')

    // Build the goal prompt with filled field values
    let goalPrompt = template.goalPrompt

    // Replace field placeholders with values
    for (const field of template.fields || []) {
      const value = request.fieldValues[field.fieldName]
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

    if (brand.brand.contextText) {
      promptParts.push(brand.brand.contextText)
    }

    promptParts.push(style.promptModifiers)

    const prompt = promptParts.join('\n\n')

    // Collect reference images
    const referenceImages: string[] = []

    // Add brand logo if available
    if (brand.brand.logoUrl) {
      referenceImages.push(brand.brand.logoUrl)
    }

    // Add selected brand reference images
    if (request.selectedReferenceImages && request.selectedReferenceImages.length > 0) {
      referenceImages.push(...request.selectedReferenceImages)
    }

    // Add image fields from template
    for (const field of template.fields || []) {
      if (field.fieldType === 'image') {
        const imageUrl = request.fieldValues[field.fieldName]
        if (imageUrl) {
          referenceImages.push(imageUrl)
        }
      }
    }

    return { prompt, referenceImages }
  }

  /**
   * Generate an ad image
   */
  static async generateAd(
    userId: string,
    request: AdhubGenerationRequest
  ): Promise<AdhubGenerationResult> {
    // Compose the prompt
    const { prompt, referenceImages } = await this.composePrompt(request)

    // Create ad record in pending state
    const supabase = await getAdhubClient()

    const { data: adData, error: adError } = await supabase
      .from('adhub_ads')
      .insert({
        user_id: userId,
        brand_id: request.brandId,
        style_id: request.styleId,
        template_id: request.templateId,
        field_values: request.fieldValues,
        generated_prompt: prompt,
        status: 'generating',
      })
      .select()
      .single()

    if (adError) {
      console.error('Error creating ad record:', adError)
      throw new Error(`Failed to create ad record: ${adError.message}`)
    }

    const adId = adData.id

    try {
      // Call the image generation API
      const response = await fetch('/api/generation/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: request.model || 'nano-banana-pro',
          aspectRatio: request.aspectRatio || '1:1',
          referenceImages,
          metadata: {
            source: 'adhub',
            adId,
            brandId: request.brandId,
            styleId: request.styleId,
            templateId: request.templateId,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate image')
      }

      const result = await response.json()

      // Update ad with gallery ID
      await supabase
        .from('adhub_ads')
        .update({
          gallery_id: result.galleryId,
          status: 'completed',
        })
        .eq('id', adId)

      return {
        adId,
        galleryId: result.galleryId,
        imageUrl: result.imageUrl || '',
        prompt,
      }
    } catch (error) {
      // Mark ad as failed
      await supabase
        .from('adhub_ads')
        .update({ status: 'failed' })
        .eq('id', adId)

      throw error
    }
  }

  /**
   * List ads for a user
   */
  static async listAds(userId: string, limit = 50): Promise<AdhubAd[]> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_ads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching ads:', error)
      throw new Error(`Failed to fetch ads: ${error.message}`)
    }

    return (data || []).map((row: AdhubAdRow) => adFromRow(row))
  }

  /**
   * Get an ad by ID
   */
  static async getAd(adId: string, userId: string): Promise<AdhubAd | null> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_ads')
      .select('*')
      .eq('id', adId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching ad:', error)
      throw new Error(`Failed to fetch ad: ${error.message}`)
    }

    if (!data) return null
    return adFromRow(data as AdhubAdRow)
  }

  /**
   * Delete an ad
   */
  static async deleteAd(adId: string, userId: string): Promise<void> {
    const supabase = await getAdhubClient()

    const { error } = await supabase
      .from('adhub_ads')
      .delete()
      .eq('id', adId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting ad:', error)
      throw new Error(`Failed to delete ad: ${error.message}`)
    }
  }
}
