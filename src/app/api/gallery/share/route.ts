import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth

  const { user } = auth

  try {
    const { galleryId } = await request.json()

    if (!galleryId) {
      return NextResponse.json({ error: 'galleryId is required' }, { status: 400 })
    }

    const supabase = await getAPIClient()

    // Check ownership and get existing share_id
    const { data: image, error: fetchError } = await supabase
      .from('gallery')
      .select('id, user_id, share_id, public_url')
      .eq('id', galleryId)
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    if (image.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Idempotent: return existing share_id if already shared
    if (image.share_id) {
      return NextResponse.json({ shareId: image.share_id })
    }

    // Generate unique 9-char share ID
    const shareId = crypto.randomBytes(6).toString('base64url')

    const { error: updateError } = await supabase
      .from('gallery')
      .update({ share_id: shareId })
      .eq('id', galleryId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    return NextResponse.json({ shareId })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
