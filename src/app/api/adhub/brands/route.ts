/**
 * Adhub Brands API
 * CRUD operations for user brands
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubBrandService } from '@/features/adhub/services/adhub-brand.service'
import { logger } from '@/lib/logger'

// GET - List all brands for user
export async function GET() {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const brands = await AdhubBrandService.listBrands(user.id)
    return NextResponse.json({ brands })
  } catch (error) {
    logger.api.error('Error fetching brands', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}

// POST - Create new brand
export async function POST(request: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, logoUrl, contextText } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    }

    const brand = await AdhubBrandService.createBrand(user.id, {
      name: name.trim(),
      logoUrl: logoUrl?.trim(),
      contextText: contextText?.trim(),
    })

    return NextResponse.json({ brand })
  } catch (error) {
    logger.api.error('Error creating brand', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 })
  }
}
