/**
 * Model Pricing API
 * Get pricing for all models
 */

import { NextResponse } from 'next/server'
import { creditsService } from '@/features/credits/services/credits.service'

/**
 * GET /api/credits/pricing
 * Get all model pricing (public endpoint)
 */
export async function GET() {
    try {
        const pricing = await creditsService.getAllModelPricing()

        // Group by generation type with extended pricing info
        type ExtendedModel = (typeof pricing)[number] & {
            formatted_price: string
            margin_cents: number
            margin_percent: number
        }
        const grouped = pricing.reduce((acc, model) => {
            const type = model.generation_type
            if (!acc[type]) acc[type] = []
            acc[type].push({
                ...model,
                formatted_price: `$${(model.price_cents / 100).toFixed(2)}`,
                margin_cents: model.price_cents - model.cost_cents,
                margin_percent: Math.round(((model.price_cents - model.cost_cents) / model.cost_cents) * 100)
            })
            return acc
        }, {} as Record<string, ExtendedModel[]>)

        return NextResponse.json({
            pricing,
            by_type: grouped
        })
    } catch (error) {
        console.error('Error fetching model pricing:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
