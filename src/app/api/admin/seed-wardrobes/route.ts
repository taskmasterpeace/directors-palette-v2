/**
 * API Route: Seed Wardrobe Wildcards
 * POST /api/admin/seed-wardrobes
 *
 * Seeds the wardrobe wildcards into community_items as pre-approved wildcard items.
 * 45 wildcards: 5 categories × 3 shot sizes × 3 genders.
 * Incremental: skips wildcards that already exist by name.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { getAPIClient } from '@/lib/db/client'
import { WARDROBE_WILDCARDS } from '@/features/shot-creator/constants/wardrobe-wildcards'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminClient(): Promise<any> {
  return await getAPIClient()
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = await getAdminClient()

    // Get existing community wildcard names to avoid duplicates
    const { data: existingCommunity } = await supabase
      .from('community_items')
      .select('name')
      .eq('type', 'wildcard')

    const existingNames = new Set(
      (existingCommunity || []).map((r: { name: string }) => r.name)
    )

    const newWildcards = WARDROBE_WILDCARDS.filter(
      wc => !existingNames.has(wc.name)
    )

    if (newWildcards.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All ${WARDROBE_WILDCARDS.length} wardrobe wildcards already exist in community`,
        count: 0,
        existing: existingNames.size,
      })
    }

    logger.api.info('Seeding wardrobe wildcards', {
      new: newWildcards.length,
      existing: existingNames.size,
    })

    let seededCount = 0
    const now = new Date().toISOString()

    for (const wc of newWildcards) {
      const communityItem = {
        type: 'wildcard' as const,
        name: wc.name,
        description: wc.description,
        category: wc.category.startsWith('wardrobe-')
          ? wc.category.replace('wardrobe-', '')
          : wc.category,
        tags: ['system', 'wardrobe'],
        content: {
          entries: wc.entries,
        },
        submitted_by: null,
        submitted_by_name: 'System',
        status: 'approved' as const,
        approved_at: now,
        is_featured: false,
      }

      const { error } = await supabase
        .from('community_items')
        .insert(communityItem)

      if (error) {
        logger.api.error('Error inserting wardrobe wildcard', {
          name: wc.name,
          error: error instanceof Error ? error.message : String(error),
        })
      } else {
        seededCount++
      }
    }

    logger.api.info('Wardrobe wildcards seeded', {
      seeded: seededCount,
      skipped: existingNames.size,
    })

    return NextResponse.json({
      success: true,
      message: `Seeded ${seededCount} wardrobe wildcards (${existingNames.size} already existed)`,
      count: seededCount,
      existing: existingNames.size,
    })
  } catch (error) {
    logger.api.error('Error seeding wardrobe wildcards', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = await getAdminClient()

    const { data, error } = await supabase
      .from('community_items')
      .select('id, name, category')
      .eq('type', 'wildcard')
      .in('tags', [['system', 'wardrobe']])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      wardrobeWildcards: data?.length || 0,
      available: WARDROBE_WILDCARDS.length,
      wildcards: data,
    })
  } catch (error) {
    logger.api.error('Error checking wardrobe wildcards', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
