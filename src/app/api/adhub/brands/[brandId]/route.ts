/**
 * Adhub Brand API - Single brand operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubBrandService } from '@/features/adhub/services/adhub-brand.service'

interface RouteContext {
  params: Promise<{ brandId: string }>
}

// GET - Get single brand with images
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { brandId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await AdhubBrandService.getBrandWithImages(brandId)
    if (!result) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Verify ownership
    if (result.brand.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json({ error: 'Failed to fetch brand' }, { status: 500 })
  }
}

// PUT - Update brand
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { brandId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, logoUrl, contextText } = body

    const brand = await AdhubBrandService.updateBrand(brandId, user.id, {
      name: name?.trim(),
      logoUrl: logoUrl?.trim(),
      contextText: contextText?.trim(),
    })

    return NextResponse.json({ brand })
  } catch (error) {
    console.error('Error updating brand:', error)
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
  }
}

// DELETE - Delete brand
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { brandId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await AdhubBrandService.deleteBrand(brandId, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 })
  }
}
