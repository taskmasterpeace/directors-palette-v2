/**
 * Adhub Styles API
 * Public read, admin-only write operations for styles
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AdhubStyleService } from '@/features/adhub/services/adhub-style.service'

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

// GET - List styles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    if (all) {
      // Admin endpoint - return all styles
      const admin = await isAdmin(request)
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const styles = await AdhubStyleService.listAllStyles()
      return NextResponse.json({ styles })
    }

    // Public endpoint - return only active styles
    const styles = await AdhubStyleService.listActiveStyles()
    return NextResponse.json({ styles })
  } catch (error) {
    console.error('Error fetching styles:', error)
    return NextResponse.json({ error: 'Failed to fetch styles' }, { status: 500 })
  }
}

// POST - Create new style (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await isAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get admin user id
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token!)

    const body = await request.json()
    const { name, displayName, iconUrl, promptModifiers, isActive } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Style name is required' }, { status: 400 })
    }

    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }

    if (!promptModifiers?.trim()) {
      return NextResponse.json({ error: 'Prompt modifiers are required' }, { status: 400 })
    }

    const style = await AdhubStyleService.createStyle({
      name: name.trim(),
      displayName: displayName.trim(),
      iconUrl: iconUrl?.trim(),
      promptModifiers: promptModifiers.trim(),
      isActive: isActive ?? true,
      createdBy: user!.id,
    })

    return NextResponse.json({ style })
  } catch (error) {
    console.error('Error creating style:', error)
    return NextResponse.json({ error: 'Failed to create style' }, { status: 500 })
  }
}
