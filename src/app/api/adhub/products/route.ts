/**
 * Adhub Products API
 * GET - List products for a brand
 * POST - Create a new product
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubProductService } from '@/features/adhub/services/adhub-product.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const brandId = request.nextUrl.searchParams.get('brandId')
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    const products = await AdhubProductService.listProducts(brandId, user.id)
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error listing products:', error)
    return NextResponse.json({ error: 'Failed to list products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { brandId, name, rawText, extractedCopy } = body

    if (!brandId || !name || !extractedCopy) {
      return NextResponse.json({
        error: 'brandId, name, and extractedCopy are required'
      }, { status: 400 })
    }

    const product = await AdhubProductService.createProduct(user.id, {
      brandId,
      name,
      rawText: rawText || '',
      extractedCopy,
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
