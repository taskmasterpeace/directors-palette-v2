/**
 * Credit Packages API
 * Get available credit packages for purchase
 */

import { NextResponse } from 'next/server'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/credits/packages
 * Get all available credit packages (public endpoint)
 */
export async function GET() {
    try {
        const packages = await creditsService.getCreditPackages()

        // Format packages with calculated values
        const formattedPackages = packages.map(pkg => ({
            ...pkg,
            total_credits: pkg.credits + pkg.bonus_credits,
            formatted_price: `$${(pkg.price_cents / 100).toFixed(2)}`,
            formatted_credits: `$${((pkg.credits + pkg.bonus_credits) / 100).toFixed(2)} value`,
            savings_percent: pkg.bonus_credits > 0
                ? Math.round((pkg.bonus_credits / pkg.credits) * 100)
                : 0
        }))

        return NextResponse.json({ packages: formattedPackages })
    } catch (error) {
        logger.api.error('Error fetching credit packages', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
