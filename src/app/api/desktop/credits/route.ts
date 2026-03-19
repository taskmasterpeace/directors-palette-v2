/**
 * Desktop Credits API — Balance + Pricing
 * GET /api/desktop/credits
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateDesktopRequest, withDesktopCors } from '@/lib/auth/desktop-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { DEFAULT_PRICING } from '@/features/credits/types/credits.types'
import { logger } from '@/lib/logger'

export async function OPTIONS() {
    return withDesktopCors(new NextResponse(null, { status: 204 }))
}

/**
 * GET /api/desktop/credits
 * Returns balance + pricing map keyed by Desktop generation_type strings
 */
export async function GET(request: NextRequest) {
    const result = await authenticateDesktopRequest(request)
    if (result instanceof NextResponse) return withDesktopCors(result)

    try {
        const balance = await creditsService.getBalance(result.user.id)
        if (!balance) {
            return withDesktopCors(
                NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
            )
        }

        // Build pricing map from DB model_pricing table
        const allPricing = await creditsService.getAllModelPricing()

        // Map DB models → Desktop pricing keys
        // Desktop wants: video_t2v, video_i2v, video_seedance, image, image_edit, audio, text_enhance
        const pricingMap: Record<string, number> = {}

        for (const model of allPricing) {
            // Map known model IDs to Desktop keys
            const key = mapModelToDesktopKey(model.model_id, model.generation_type)
            if (key) {
                pricingMap[key] = model.price_cents
            }
        }

        // Fill in defaults for any keys Desktop expects but aren't in the DB
        if (!pricingMap.video_t2v) pricingMap.video_t2v = DEFAULT_PRICING.video.price_cents
        if (!pricingMap.video_i2v) pricingMap.video_i2v = DEFAULT_PRICING.video.price_cents
        if (!pricingMap.video_seedance) pricingMap.video_seedance = 80
        if (!pricingMap.image) pricingMap.image = DEFAULT_PRICING.image.price_cents
        if (!pricingMap.image_edit) pricingMap.image_edit = DEFAULT_PRICING.image.price_cents
        if (!pricingMap.audio) pricingMap.audio = DEFAULT_PRICING.audio.price_cents
        if (!pricingMap.text_enhance) pricingMap.text_enhance = DEFAULT_PRICING.text.price_cents

        return withDesktopCors(NextResponse.json({
            balance_cents: balance.balance,
            lifetime_purchased_cents: balance.lifetime_purchased,
            lifetime_used_cents: balance.lifetime_used,
            pricing: pricingMap,
        }))
    } catch (error) {
        logger.api.error('Desktop credits fetch error', { error: error instanceof Error ? error.message : String(error) })
        return withDesktopCors(
            NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        )
    }
}

/**
 * Map a model_id + generation_type to a Desktop pricing key.
 * Expand this as new models are added to the model_pricing table.
 */
function mapModelToDesktopKey(modelId: string, generationType: string): string | null {
    const id = modelId.toLowerCase()

    // Video models
    if (id.includes('seedance') || id.includes('seedream')) return 'video_seedance'
    if (id.includes('ltx') || id.includes('wan') || id.includes('hunyuan')) {
        if (id.includes('i2v') || id.includes('img2vid')) return 'video_i2v'
        return 'video_t2v'
    }

    // Image models
    if (id.includes('edit')) return 'image_edit'
    if (generationType === 'image') return 'image'

    // Audio
    if (generationType === 'audio') return 'audio'

    // Text
    if (generationType === 'text') return 'text_enhance'

    // Fallback by generation_type
    if (generationType === 'video') return 'video_t2v'

    return null
}
