/**
 * Adhub Style API - Single style operations (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { AdhubStyleService } from '@/features/adhub/services/adhub-style.service'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Check if user is admin using cookies
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Check admin_users table with service role (bypasses RLS)
    const { data: adminUser } = await serviceClient
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    return !!adminUser
  } catch (error) {
    console.error('Admin check failed:', error)
    return false
  }
}

interface RouteContext {
  params: Promise<{ styleId: string }>
}

// GET - Get single style
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { styleId } = await context.params
    const style = await AdhubStyleService.getStyle(styleId)

    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    return NextResponse.json({ style })
  } catch (error) {
    console.error('Error fetching style:', error)
    return NextResponse.json({ error: 'Failed to fetch style' }, { status: 500 })
  }
}

// PUT - Update style (admin only)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { styleId } = await context.params
    const body = await request.json()
    const { name, displayName, iconUrl, promptModifiers, isActive } = body

    const style = await AdhubStyleService.updateStyle(styleId, {
      name: name?.trim(),
      displayName: displayName?.trim(),
      iconUrl: iconUrl?.trim(),
      promptModifiers: promptModifiers?.trim(),
      isActive,
    })

    return NextResponse.json({ style })
  } catch (error) {
    console.error('Error updating style:', error)
    return NextResponse.json({ error: 'Failed to update style' }, { status: 500 })
  }
}

// DELETE - Delete style (admin only)
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { styleId } = await context.params
    await AdhubStyleService.deleteStyle(styleId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting style:', error)
    return NextResponse.json({ error: 'Failed to delete style' }, { status: 500 })
  }
}

// PATCH - Toggle style active status (admin only)
export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await isAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { styleId } = await context.params
    const style = await AdhubStyleService.toggleStyleActive(styleId)
    return NextResponse.json({ style })
  } catch (error) {
    console.error('Error toggling style:', error)
    return NextResponse.json({ error: 'Failed to toggle style' }, { status: 500 })
  }
}
