/**
 * Track style usage from the UI.
 * Called fire-and-forget after a user selects a style and generates an image.
 * Matches by style name (case-insensitive) against system styles in style_guides.
 * If no match (e.g., user's localStorage-only custom style), silently no-op.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { styleName, styleId } = await request.json().catch(() => ({}))
    if (!styleName && !styleId) {
      return NextResponse.json({ tracked: false, reason: 'missing_identifier' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const isUuid = typeof styleId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(styleId)

    let matchedId: string | null = null
    if (isUuid) {
      matchedId = styleId
    } else if (typeof styleName === 'string' && styleName.trim()) {
      const { data } = await supabase
        .from('style_guides')
        .select('id')
        .eq('is_system', true)
        .ilike('name', styleName.trim())
        .limit(1)
      matchedId = data?.[0]?.id ?? null
    }

    if (!matchedId) {
      return NextResponse.json({ tracked: false, reason: 'no_match' })
    }

    const { error } = await supabase.rpc('increment_style_usage', { p_style_id: matchedId })
    if (error) {
      logger.api.warn('style usage increment failed', { styleId: matchedId, error: error.message })
      return NextResponse.json({ tracked: false, reason: 'rpc_error' }, { status: 500 })
    }

    return NextResponse.json({ tracked: true })
  } catch (error) {
    return NextResponse.json({ tracked: false, reason: 'exception', error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
