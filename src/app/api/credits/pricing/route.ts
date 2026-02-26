/**
 * Model Pricing API
 * Get pricing for all models
 */

import { NextResponse } from 'next/server'
import { creditsService } from '@/features/credits/services/credits.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/credits/pricing
 * Get all model pricing (public endpoint)
 */
export async function GET() {
    try {
        const pricing = await creditsService.getAllModelPricing()

        // Group by generation type - only expose public pricing info
        // SECURITY: cost_cents is internal data (our cost) - never expose to clients
        type PublicModel = {
            model_id: string
            model_name: string
            generation_type: string
            price_cents: number
            formatted_price: string
            is_active: boolean
        }
        const grouped = pricing.reduce((acc, model) => {
            const type = model.generation_type
            if (!acc[type]) acc[type] = []
            acc[type].push({
                model_id: model.model_id,
                model_name: model.model_name,
                generation_type: model.generation_type,
                price_cents: model.price_cents,
                formatted_price: `$${(model.price_cents / 100).toFixed(2)}`,
                is_active: model.is_active,
            })
            return acc
        }, {} as Record<string, PublicModel[]>)

        // Strip cost data from the raw pricing array
        const publicPricing = pricing.map(model => ({
            model_id: model.model_id,
            model_name: model.model_name,
            generation_type: model.generation_type,
            price_cents: model.price_cents,
            formatted_price: `$${(model.price_cents / 100).toFixed(2)}`,
            is_active: model.is_active,
        }))

        return NextResponse.json({
            pricing: publicPricing,
            by_type: grouped
        })
    } catch (error) {
        logger.api.error('Error fetching model pricing', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
