/**
 * Adhub Ads API
 * List generated ads for user
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getClient } from '@/lib/db/client'
import {
  AdhubAdRow,
  adFromRow,
} from '@/features/adhub/types/adhub.types'
import { logger } from '@/lib/logger'

// GET - List all ads for user
export async function GET() {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use untyped client for adhub tables
    const apiClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await apiClient
      .from('adhub_ads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logger.api.error('Error fetching ads', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
    }

    const ads = (data || []).map((row: AdhubAdRow) => adFromRow(row))
    return NextResponse.json({ ads })
  } catch (error) {
    logger.api.error('Error fetching ads', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
  }
}
