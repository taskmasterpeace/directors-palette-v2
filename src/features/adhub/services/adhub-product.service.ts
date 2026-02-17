/**
 * Adhub Product Service
 * Handles all product-related database operations
 */

import { getAPIClient, getClient } from '@/lib/db/client'
import {
  AdhubProduct,
  AdhubProductInput,
  AdhubProductRow,
  productFromRow,
} from '../types/adhub.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdhubClient(): Promise<any> {
  return await getAPIClient()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBrowserClient(): Promise<any> {
  return await getClient()
}

export class AdhubProductService {
  /**
   * List all products for a brand
   */
  static async listProducts(brandId: string, userId: string): Promise<AdhubProduct[]> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_products')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    return (data || []).map((row: AdhubProductRow) => productFromRow(row))
  }

  /**
   * Get a single product by ID
   */
  static async getProduct(productId: string, userId: string): Promise<AdhubProduct | null> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching product:', error)
      throw new Error(`Failed to fetch product: ${error.message}`)
    }

    if (!data) return null
    return productFromRow(data as AdhubProductRow)
  }

  /**
   * Get a product by ID (server-side, no user filter)
   */
  static async getProductById(productId: string): Promise<AdhubProduct | null> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_products')
      .select('*')
      .eq('id', productId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching product:', error)
      throw new Error(`Failed to fetch product: ${error.message}`)
    }

    if (!data) return null
    return productFromRow(data as AdhubProductRow)
  }

  /**
   * Create a new product
   */
  static async createProduct(userId: string, input: AdhubProductInput): Promise<AdhubProduct> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_products')
      .insert({
        user_id: userId,
        brand_id: input.brandId,
        name: input.name,
        raw_text: input.rawText,
        extracted_copy: input.extractedCopy,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      throw new Error(`Failed to create product: ${error.message}`)
    }

    return productFromRow(data as AdhubProductRow)
  }

  /**
   * Update a product
   */
  static async updateProduct(productId: string, userId: string, input: Partial<AdhubProductInput>): Promise<AdhubProduct> {
    const supabase = await getAdhubClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.name !== undefined) updateData.name = input.name
    if (input.rawText !== undefined) updateData.raw_text = input.rawText
    if (input.extractedCopy !== undefined) updateData.extracted_copy = input.extractedCopy

    const { data, error } = await supabase
      .from('adhub_products')
      .update(updateData)
      .eq('id', productId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating product:', error)
      throw new Error(`Failed to update product: ${error.message}`)
    }

    return productFromRow(data as AdhubProductRow)
  }

  /**
   * Delete a product
   */
  static async deleteProduct(productId: string, userId: string): Promise<void> {
    const supabase = await getAdhubClient()

    const { error } = await supabase
      .from('adhub_products')
      .delete()
      .eq('id', productId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting product:', error)
      throw new Error(`Failed to delete product: ${error.message}`)
    }
  }

  /**
   * List products for a brand (client-side via browser client)
   */
  static async listProductsClient(brandId: string): Promise<AdhubProduct[]> {
    const supabase = await getBrowserClient()

    const { data, error } = await supabase
      .from('adhub_products')
      .select('*')
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      throw new Error(`Failed to fetch products: ${error.message}`)
    }

    return (data || []).map((row: AdhubProductRow) => productFromRow(row))
  }
}
