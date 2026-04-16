/**
 * Track style usage from the UI. Called fire-and-forget after a generation.
 * Auth required — prevents anonymous counter inflation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClient } from '@/lib/db/client'
import { isUuid } from '@/features/shared/constants/style-guards'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const sessionClient = await getClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ tracked: false, reason: 'unauthenticated' }, { status: 401 })
    }

    const { styleName, styleId } = await request.json().catch(() => ({}))
    if (!styleName && !styleId) {
      return NextResponse.json({ tracked: false, reason: 'missing_identifier' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let matchedId: string | null = null
    if (isUuid(styleId)) {
      matchedId = styleId
    } else if (typeof styleName === 'string' && styleName.trim()) {
      const { data } = await supabase
        .from('style_guides')
        .select('id')
        .eq('is_system', true)
        .ilike('name', styleName.trim())
        .order('id', { ascending: true })
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
