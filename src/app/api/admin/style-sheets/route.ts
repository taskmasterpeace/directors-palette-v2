/**
 * Admin Style Sheets API
 * CRUD operations for system style sheets
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check if user is admin
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return !!adminUser
}

export interface StyleSheet {
  id: string
  name: string
  description: string | null
  style_prompt: string | null
  image_url: string | null
  is_system: boolean
  created_at: string
  updated_at: string
}

// GET - List all system style sheets
export async function GET(request: NextRequest) {
  try {
    // For public access to system styles, don't require admin
    const { searchParams } = new URL(request.url)
    const publicOnly = searchParams.get('public') === 'true'

    if (publicOnly) {
      // Public endpoint - return only system styles
      const { data, error } = await supabase
        .from('style_guides')
        .select('id, name, description, style_prompt, image_url, is_system, created_at, updated_at')
        .eq('is_system', true)
        .order('name')

      if (error) throw error
      return NextResponse.json({ styles: data || [] })
    }

    // Admin endpoint - return all styles
    const admin = await isAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('style_guides')
      .select('id, user_id, name, description, style_prompt, image_url, is_system, created_at, updated_at')
      .eq('is_system', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ styles: data || [] })
  } catch (error) {
    console.error('Error fetching style sheets:', error)
    return NextResponse.json({ error: 'Failed to fetch style sheets' }, { status: 500 })
  }
}

// POST - Create new system style sheet
export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, style_prompt, image_url } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Get admin user id for user_id field
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token!)

    const { data, error } = await supabase
      .from('style_guides')
      .insert({
        user_id: user!.id,
        name: name.trim(),
        description: description?.trim() || null,
        style_prompt: style_prompt?.trim() || null,
        image_url: image_url?.trim() || null,
        is_system: true,
        metadata: { admin_created: true }
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ style: data })
  } catch (error) {
    console.error('Error creating style sheet:', error)
    return NextResponse.json({ error: 'Failed to create style sheet' }, { status: 500 })
  }
}

// PUT - Update style sheet
export async function PUT(request: NextRequest) {
  try {
    const admin = await isAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, description, style_prompt, image_url } = body

    if (!id) {
      return NextResponse.json({ error: 'Style ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('style_guides')
      .update({
        name: name?.trim(),
        description: description?.trim() || null,
        style_prompt: style_prompt?.trim() || null,
        image_url: image_url?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('is_system', true)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ style: data })
  } catch (error) {
    console.error('Error updating style sheet:', error)
    return NextResponse.json({ error: 'Failed to update style sheet' }, { status: 500 })
  }
}

// DELETE - Delete style sheet
export async function DELETE(request: NextRequest) {
  try {
    const admin = await isAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Style ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('style_guides')
      .delete()
      .eq('id', id)
      .eq('is_system', true)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting style sheet:', error)
    return NextResponse.json({ error: 'Failed to delete style sheet' }, { status: 500 })
  }
}
