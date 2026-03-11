import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

const MAX_SAVED_FIGURINES = 5

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/** GET — list saved figurines for authenticated user (newest first, max 5) */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { data, error } = await supabase
      .from('figurines')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_SAVED_FIGURINES)

    if (error) {
      lognog.error('figurine_list_error', { type: 'error', error: error.message, user_id: auth.user.id })
      return NextResponse.json({ error: 'Failed to load figurines' }, { status: 500 })
    }

    return NextResponse.json({ figurines: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

/** DELETE — remove a saved figurine by id */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('figurines')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)

    if (error) {
      lognog.error('figurine_delete_error', { type: 'error', error: error.message, user_id: auth.user.id })
      return NextResponse.json({ error: 'Failed to delete figurine' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
