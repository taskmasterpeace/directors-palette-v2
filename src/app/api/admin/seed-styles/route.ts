/**
 * API Route: Seed System Styles
 * POST /api/admin/seed-styles
 *
 * Seeds the built-in PRESET_STYLES into the style_guides table as admin-managed
 * rows (is_system=true). Incremental: only inserts styles that don't already
 * exist (matched by name). This is the migration path from a hardcoded
 * PRESET_STYLES constant to a single DB-backed source of truth.
 *
 * Once seeded, admins can edit/delete these rows via the Style Sheets tab
 * just like any other system style they add by hand.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { PRESET_STYLES } from '@/features/storyboard/types/storyboard.types'
import { logger } from '@/lib/logger'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = getServiceClient()

    // Get names of existing system styles to dedup
    const { data: existing, error: fetchError } = await supabase
      .from('style_guides')
      .select('name')
      .eq('is_system', true)

    if (fetchError) throw fetchError

    const existingNames = new Set((existing || []).map((r: { name: string }) => r.name))

    const newStyles = PRESET_STYLES.filter(p => !existingNames.has(p.name))

    if (newStyles.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All ${PRESET_STYLES.length} preset styles already in DB`,
        inserted: 0,
        existing: existingNames.size,
      })
    }

    let insertedCount = 0

    for (const preset of newStyles) {
      const row = {
        user_id: auth.user.id, // admin who ran the seed
        name: preset.name,
        description: preset.description || null,
        style_prompt: preset.stylePrompt || null,
        image_url: preset.imagePath || null,
        is_system: true,
        metadata: {
          preset_id: preset.id, // preserve original ID for code that still references it
          technical_attributes: preset.technicalAttributes || null,
          source: 'preset_seed',
        },
      }

      const { error } = await supabase.from('style_guides').insert(row)

      if (error) {
        logger.api.error('Error inserting preset style', {
          name: preset.name,
          error: error instanceof Error ? error.message : String(error),
        })
      } else {
        insertedCount++
      }
    }

    logger.api.info('Style seed completed', {
      inserted: insertedCount,
      existing: existingNames.size,
      total: PRESET_STYLES.length,
    })

    return NextResponse.json({
      success: true,
      message: `Seeded ${insertedCount} preset styles (${existingNames.size} already existed)`,
      inserted: insertedCount,
      existing: existingNames.size,
    })
  } catch (error) {
    logger.api.error('Error seeding styles', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('style_guides')
      .select('id, name, is_system, metadata')
      .eq('is_system', true)

    if (error) throw error

    return NextResponse.json({
      systemStyleCount: data?.length || 0,
      styles: data,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
