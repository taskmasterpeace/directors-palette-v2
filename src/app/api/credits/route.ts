/**
 * Credits API Endpoint
 * Handles credit balance, transactions, and deductions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import type { GenerationType } from '@/features/credits/types/credits.types'

/**
 * GET /api/credits
 * Get user's credit balance and info
 */
export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    try {
        const balance = await creditsService.getBalance(auth.user.id)

        if (!balance) {
            return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 })
        }

        return NextResponse.json({
            balance: balance.balance,
            lifetime_purchased: balance.lifetime_purchased,
            lifetime_used: balance.lifetime_used,
            formatted_balance: `$${(balance.balance / 100).toFixed(2)}`
        })
    } catch (error) {
        console.error('Error fetching credits:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/credits
 * Operations: check, deduct, add
 */
export async function POST(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await request.json()
        const { action, model_id, generation_type, amount, type, description, prediction_id, metadata } = body

        switch (action) {
            case 'check': {
                // Check if user has sufficient credits for a model
                if (!model_id) {
                    return NextResponse.json({ error: 'model_id is required' }, { status: 400 })
                }

                const result = await creditsService.hasSufficientCredits(
                    auth.user.id,
                    model_id,
                    generation_type as GenerationType || 'image'
                )

                return NextResponse.json({
                    has_sufficient_credits: result.sufficient,
                    current_balance: result.balance,
                    required_credits: result.required,
                    model_name: result.modelName,
                    formatted_balance: `$${(result.balance / 100).toFixed(2)}`,
                    formatted_required: `$${(result.required / 100).toFixed(2)}`
                })
            }

            case 'deduct': {
                // Deduct credits for a generation
                if (!model_id) {
                    return NextResponse.json({ error: 'model_id is required' }, { status: 400 })
                }

                const result = await creditsService.deductCredits(auth.user.id, model_id, {
                    generationType: generation_type as GenerationType || 'image',
                    predictionId: prediction_id,
                    description
                })

                if (!result.success) {
                    return NextResponse.json({
                        success: false,
                        error: result.error
                    }, { status: 402 }) // Payment Required
                }

                return NextResponse.json({
                    success: true,
                    credits_deducted: Math.abs(result.transaction?.amount || 0),
                    new_balance: result.newBalance,
                    formatted_balance: `$${((result.newBalance || 0) / 100).toFixed(2)}`
                })
            }

            case 'add': {
                // Add credits (for admin/testing, real purchases go through Stripe webhook)
                if (!amount || amount <= 0) {
                    return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 })
                }

                const result = await creditsService.addCredits(auth.user.id, amount, {
                    type: type || 'bonus',
                    description,
                    metadata
                })

                if (!result.success) {
                    return NextResponse.json({
                        success: false,
                        error: result.error
                    }, { status: 500 })
                }

                return NextResponse.json({
                    success: true,
                    credits_added: amount,
                    new_balance: result.newBalance,
                    formatted_balance: `$${((result.newBalance || 0) / 100).toFixed(2)}`
                })
            }

            default:
                return NextResponse.json({
                    error: 'Invalid action. Use: check, deduct, or add'
                }, { status: 400 })
        }
    } catch (error) {
        console.error('Credits API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
