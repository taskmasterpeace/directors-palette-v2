/**
 * API Route: Seed Community LoRAs
 * POST /api/admin/seed-loras
 *
 * Seeds official LoRAs into community_items as pre-approved items.
 * Incremental: only inserts LoRAs that don't already exist (by name).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { getAPIClient } from '@/lib/db/client'
import { COMMUNITY_LORAS } from '@/features/shot-creator/store/lora.store'
import { logger } from '@/lib/logger'

const LORA_STORAGE_BASE = 'https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/directors-palette/loras'

/** Descriptions for community display */
const LORA_DESCRIPTIONS: Record<string, string> = {
  'nava-style': 'A distinctive stylized aesthetic with warm tones and painterly qualities.',
  'pixar-style': 'Disney/Pixar-inspired 3D animation style with vibrant colors.',
  'poster-movie': 'Cinematic movie poster aesthetic with dramatic composition.',
  'childish': 'Hand-drawn crayon drawing style with a playful, childlike feel.',
  'impressionism': 'Classic impressionist painting style with soft brushstrokes.',
  'c64-pixel-art': 'Retro Commodore 64 pixel art style with limited color palette.',
  'sat-morn-cartoon': 'Saturday morning cartoon style with bold lines and bright colors.',
  'zit-comic1': 'Comic book style with bold inks and dynamic shading.',
  'action-figure': 'Action figure toy aesthetic with plastic-like materials and packaging.',
  'dc-animation': 'DC animated series style with clean lines and bold American animation look.',
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth instanceof NextResponse) return auth

  try {
    const supabase = await getAPIClient()

    // Get existing community LoRA names
    const { data: existing } = await supabase
      .from('community_items')
      .select('name')
      .eq('type', 'lora')

    const existingNames = new Set(
      (existing || []).map((r: { name: string }) => r.name)
    )

    const newLoras = COMMUNITY_LORAS.filter(
      lora => !existingNames.has(lora.name)
    )

    if (newLoras.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All ${COMMUNITY_LORAS.length} LoRAs already exist in community.`,
        count: 0,
        existing: existingNames.size,
      })
    }

    const now = new Date().toISOString()
    let seededCount = 0

    for (const lora of newLoras) {
      const communityItem = {
        type: 'lora' as const,
        name: lora.name,
        description: LORA_DESCRIPTIONS[lora.id] || `${lora.name} style LoRA`,
        category: lora.type === 'character' ? 'character' : 'style',
        tags: ['official', lora.type || 'style'],
        content: {
          loraType: lora.type || 'style',
          triggerWord: lora.triggerWord,
          referenceTag: lora.referenceTag || lora.id,
          weightsUrl: lora.weightsUrl,
          thumbnailUrl: lora.thumbnailUrl || `${LORA_STORAGE_BASE}/${lora.id}/${lora.id}_thumbnail.png`,
          defaultGuidanceScale: lora.defaultGuidanceScale,
          defaultLoraScale: lora.defaultLoraScale,
        },
        submitted_by: null,
        submitted_by_name: 'System',
        status: 'approved' as const,
        approved_at: now,
        is_featured: false,
        is_official: true,
      }

      const { error } = await supabase
        .from('community_items')
        .insert(communityItem)

      if (error) {
        logger.api.error('Error inserting community LoRA', {
          name: lora.name,
          error: error instanceof Error ? error.message : String(error),
        })
      } else {
        seededCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${seededCount} new LoRAs (${existingNames.size} already existed).`,
      count: seededCount,
      existing: existingNames.size,
    })
  } catch (error) {
    logger.api.error('Error seeding LoRAs', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
