/**
 * Adhub Brand Images API
 * Manage reference images for a brand
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubBrandService } from '@/features/adhub/services/adhub-brand.service'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ brandId: string }>
}

// GET - List images for a brand
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { brandId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify brand ownership
    const brand = await AdhubBrandService.getBrand(brandId, user.id)
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const images = await AdhubBrandService.listBrandImages(brandId)
    return NextResponse.json({ images })
  } catch (error) {
    logger.api.error('Error fetching brand images', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch brand images' }, { status: 500 })
  }
}

// POST - Add image to brand
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { brandId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify brand ownership
    const brand = await AdhubBrandService.getBrand(brandId, user.id)
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const body = await request.json()
    const { imageUrl, description } = body

    if (!imageUrl?.trim()) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const image = await AdhubBrandService.addBrandImage(brandId, {
      imageUrl: imageUrl.trim(),
      description: description?.trim(),
    })

    return NextResponse.json({ image })
  } catch (error) {
    logger.api.error('Error adding brand image', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to add brand image' }, { status: 500 })
  }
}

// DELETE - Remove image from brand
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { brandId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify brand ownership
    const brand = await AdhubBrandService.getBrand(brandId, user.id)
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 })
    }

    await AdhubBrandService.removeBrandImage(imageId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.api.error('Error removing brand image', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to remove brand image' }, { status: 500 })
  }
}
