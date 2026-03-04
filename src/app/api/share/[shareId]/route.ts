import { NextRequest, NextResponse } from 'next/server'
import { getAPIClient } from '@/lib/db/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params

    if (!shareId) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 })
    }

    const supabase = await getAPIClient()

    const { data: image, error } = await supabase
      .from('gallery')
      .select('public_url, metadata, created_at')
      .eq('share_id', shareId)
      .single()

    if (error || !image) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const metadata = image.metadata as Record<string, unknown> | null

    return NextResponse.json({
      publicUrl: image.public_url,
      prompt: metadata?.prompt as string | undefined,
      model: metadata?.model as string | undefined,
      source: metadata?.source as string | undefined,
      createdAt: image.created_at,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
