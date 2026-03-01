import { NextRequest, NextResponse } from 'next/server'
import { getAPIClient } from '@/lib/db/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('BrandStudio')

export async function GET() {
  try {
    const supabase = await getAPIClient()
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Failed to fetch brands', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Brands GET error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, logo_url, raw_company_info } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const supabase = await getAPIClient()
    const { data, error } = await supabase
      .from('brands')
      .insert({
        name,
        slug,
        logo_url: logo_url || null,
        raw_company_info: raw_company_info || null,
      })
      .select()
      .single()

    if (error) {
      log.error('Failed to create brand', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    log.error('Brands POST error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to create brand' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = await getAPIClient()
    const { data, error } = await supabase
      .from('brands')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      log.error('Failed to update brand', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Brands PUT error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 })
  }
}
