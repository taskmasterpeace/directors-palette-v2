/**
 * Adhub Brand Service
 * Handles all brand-related database operations
 */

import { getAPIClient, getClient } from '@/lib/db/client'
import {
  AdhubBrand,
  AdhubBrandImage,
  AdhubBrandInput,
  AdhubBrandImageInput,
  AdhubBrandRow,
  AdhubBrandImageRow,
  brandFromRow,
  brandImageFromRow,
} from '../types/adhub.types'
import { createLogger } from '@/lib/logger'


const log = createLogger('AdHub')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdhubClient(): Promise<any> {
  return await getAPIClient()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBrowserClient(): Promise<any> {
  return await getClient()
}

export class AdhubBrandService {
  /**
   * List all brands for a user
   */
  static async listBrands(userId: string): Promise<AdhubBrand[]> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_brands')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      log.error('Error fetching brands', { error: error })
      throw new Error(`Failed to fetch brands: ${error.message}`)
    }

    return (data || []).map((row: AdhubBrandRow) => brandFromRow(row))
  }

  /**
   * Get a single brand by ID
   */
  static async getBrand(brandId: string, userId: string): Promise<AdhubBrand | null> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      log.error('Error fetching brand', { error: error })
      throw new Error(`Failed to fetch brand: ${error.message}`)
    }

    if (!data) return null
    return brandFromRow(data as AdhubBrandRow)
  }

  /**
   * Create a new brand
   */
  static async createBrand(userId: string, input: AdhubBrandInput): Promise<AdhubBrand> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_brands')
      .insert({
        user_id: userId,
        name: input.name,
        logo_url: input.logoUrl ?? null,
        context_text: input.contextText ?? null,
      })
      .select()
      .single()

    if (error) {
      log.error('Error creating brand', { error: error })
      throw new Error(`Failed to create brand: ${error.message}`)
    }

    return brandFromRow(data as AdhubBrandRow)
  }

  /**
   * Update a brand
   */
  static async updateBrand(brandId: string, userId: string, input: Partial<AdhubBrandInput>): Promise<AdhubBrand> {
    const supabase = await getAdhubClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.name !== undefined) updateData.name = input.name
    if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl
    if (input.contextText !== undefined) updateData.context_text = input.contextText

    const { data, error } = await supabase
      .from('adhub_brands')
      .update(updateData)
      .eq('id', brandId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      log.error('Error updating brand', { error: error })
      throw new Error(`Failed to update brand: ${error.message}`)
    }

    return brandFromRow(data as AdhubBrandRow)
  }

  /**
   * Delete a brand
   */
  static async deleteBrand(brandId: string, userId: string): Promise<void> {
    const supabase = await getAdhubClient()

    const { error } = await supabase
      .from('adhub_brands')
      .delete()
      .eq('id', brandId)
      .eq('user_id', userId)

    if (error) {
      log.error('Error deleting brand', { error: error })
      throw new Error(`Failed to delete brand: ${error.message}`)
    }
  }

  /**
   * List all images for a brand
   */
  static async listBrandImages(brandId: string): Promise<AdhubBrandImage[]> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_brand_images')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Error fetching brand images', { error: error })
      throw new Error(`Failed to fetch brand images: ${error.message}`)
    }

    return (data || []).map((row: AdhubBrandImageRow) => brandImageFromRow(row))
  }

  /**
   * Add an image to a brand
   */
  static async addBrandImage(brandId: string, input: AdhubBrandImageInput): Promise<AdhubBrandImage> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_brand_images')
      .insert({
        brand_id: brandId,
        image_url: input.imageUrl,
        description: input.description ?? null,
      })
      .select()
      .single()

    if (error) {
      log.error('Error adding brand image', { error: error })
      throw new Error(`Failed to add brand image: ${error.message}`)
    }

    return brandImageFromRow(data as AdhubBrandImageRow)
  }

  /**
   * Update a brand image description
   */
  static async updateBrandImage(imageId: string, description: string): Promise<AdhubBrandImage> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_brand_images')
      .update({ description })
      .eq('id', imageId)
      .select()
      .single()

    if (error) {
      log.error('Error updating brand image', { error: error })
      throw new Error(`Failed to update brand image: ${error.message}`)
    }

    return brandImageFromRow(data as AdhubBrandImageRow)
  }

  /**
   * Remove an image from a brand
   */
  static async removeBrandImage(imageId: string): Promise<void> {
    const supabase = await getAdhubClient()

    const { error } = await supabase
      .from('adhub_brand_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      log.error('Error removing brand image', { error: error })
      throw new Error(`Failed to remove brand image: ${error.message}`)
    }
  }

  /**
   * Get a brand with all its images (client-side)
   */
  static async getBrandWithImages(brandId: string): Promise<{ brand: AdhubBrand; images: AdhubBrandImage[] } | null> {
    const supabase = await getBrowserClient()

    const { data: brandData, error: brandError } = await supabase
      .from('adhub_brands')
      .select('*')
      .eq('id', brandId)
      .maybeSingle()

    if (brandError) {
      log.error('Error fetching brand', { brandError: brandError })
      throw new Error(`Failed to fetch brand: ${brandError.message}`)
    }

    if (!brandData) return null

    const { data: imagesData, error: imagesError } = await supabase
      .from('adhub_brand_images')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    if (imagesError) {
      log.error('Error fetching brand images', { imagesError: imagesError })
      throw new Error(`Failed to fetch brand images: ${imagesError.message}`)
    }

    return {
      brand: brandFromRow(brandData as AdhubBrandRow),
      images: (imagesData || []).map((row: AdhubBrandImageRow) => brandImageFromRow(row)),
    }
  }
}
