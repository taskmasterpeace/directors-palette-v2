/**
 * Adhub Product API - Single product operations
 * GET - Get product by ID
 * PUT - Update product
 * DELETE - Delete product
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubProductService } from '@/features/adhub/services/adhub-product.service'
import { logger } from '@/lib/logger'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await context.params
    const product = await AdhubProductService.getProduct(productId, user.id)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    logger.api.error('Error fetching product', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await context.params
    const body = await request.json()

    const product = await AdhubProductService.updateProduct(productId, user.id, body)
    return NextResponse.json({ product })
  } catch (error) {
    logger.api.error('Error updating product', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await context.params
    await AdhubProductService.deleteProduct(productId, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.api.error('Error deleting product', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
