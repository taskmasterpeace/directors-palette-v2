/**
 * Desktop Credits Check — Pre-generation affordability check
 * POST /api/desktop/credits/check
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateDesktopRequest, withDesktopCors } from '@/lib/auth/desktop-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'

const TOP_UP_URL = 'https://directorspalette.com/settings/billing'

/** Desktop generation_type → internal generation_type + approximate price */
const DESKTOP_TYPE_PRICING: Record<string, { generationType: 'image' | 'video' | 'audio' | 'text'; defaultPrice: number }> = {
    video_t2v:      { generationType: 'video', defaultPrice: 40 },
    video_i2v:      { generationType: 'video', defaultPrice: 40 },
    video_seedance: { generationType: 'video', defaultPrice: 80 },
    image:          { generationType: 'image', defaultPrice: 20 },
    image_edit:     { generationType: 'image', defaultPrice: 20 },
    audio:          { generationType: 'audio', defaultPrice: 15 },
    text_enhance:   { generationType: 'text',  defaultPrice: 3 },
}

export async function OPTIONS() {
    return withDesktopCors(new NextResponse(null, { status: 204 }))
}

export async function POST(request: NextRequest) {
    const result = await authenticateDesktopRequest(request)
    if (result instanceof NextResponse) return withDesktopCors(result)

    try {
        const body = await request.json()
        const { generation_type, count = 1 } = body

        if (!generation_type || !DESKTOP_TYPE_PRICING[generation_type]) {
            return withDesktopCors(NextResponse.json({
                error: `Invalid generation_type. Must be one of: ${Object.keys(DESKTOP_TYPE_PRICING).join(', ')}`,
            }, { status: 400 }))
        }

        if (typeof count !== 'number' || count < 1 || count > 100) {
            return withDesktopCors(NextResponse.json({
                error: 'count must be a number between 1 and 100',
            }, { status: 400 }))
        }

        const typeConfig = DESKTOP_TYPE_PRICING[generation_type]

        // Try to get DB pricing for a matching model, fall back to default
        const allPricing = await creditsService.getAllModelPricing()
        const matchingModel = allPricing.find(m => {
            const id = m.model_id.toLowerCase()
            if (generation_type === 'video_seedance') return id.includes('seedance')
            if (generation_type === 'video_i2v') return id.includes('i2v') && m.generation_type === 'video'
            if (generation_type === 'video_t2v') return m.generation_type === 'video' && !id.includes('seedance') && !id.includes('i2v')
            if (generation_type === 'image_edit') return id.includes('edit')
            return m.generation_type === typeConfig.generationType
        })

        const unitPrice = matchingModel?.price_cents ?? typeConfig.defaultPrice
        const totalCost = unitPrice * count

        const balance = await creditsService.getBalance(result.user.id)
        const currentBalance = balance?.balance ?? 0
        const canAfford = currentBalance >= totalCost

        const response: Record<string, unknown> = {
            can_afford: canAfford,
            cost_cents: totalCost,
            balance_cents: currentBalance,
            balance_after_cents: currentBalance - totalCost,
        }

        if (!canAfford) {
            response.top_up_url = TOP_UP_URL
        }

        return withDesktopCors(NextResponse.json(response))
    } catch (error) {
        logger.api.error('Desktop credits check error', { error: error instanceof Error ? error.message : String(error) })
        return withDesktopCors(
            NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        )
    }
}
