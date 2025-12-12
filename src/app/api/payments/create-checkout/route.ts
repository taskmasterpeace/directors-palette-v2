/**
 * Stripe Checkout Session API
 * Creates a checkout session for purchasing credit packages
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getClient } from '@/lib/db/client'

// Initialize Stripe (only if key is available)
const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null

/**
 * POST /api/payments/create-checkout
 * Create a Stripe Checkout session for a credit package
 */
export async function POST(request: NextRequest) {
    // Check if Stripe is configured
    if (!stripe) {
        return NextResponse.json(
            { error: 'Payment system not configured' },
            { status: 503 }
        )
    }

    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    try {
        const { package_id } = await request.json()

        if (!package_id) {
            return NextResponse.json(
                { error: 'package_id is required' },
                { status: 400 }
            )
        }

        // Get package details from database
        const supabase = await getClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pkg, error: pkgError } = await (supabase as any)
            .from('credit_packages')
            .select('*')
            .eq('id', package_id)
            .eq('is_active', true)
            .single()

        if (pkgError || !pkg) {
            return NextResponse.json(
                { error: 'Package not found' },
                { status: 404 }
            )
        }

        if (!pkg.stripe_price_id) {
            return NextResponse.json(
                { error: 'Package not configured for payment' },
                { status: 400 }
            )
        }

        // Calculate total credits (base + bonus)
        const totalCredits = pkg.credits + pkg.bonus_credits

        // Determine the app URL for redirects
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
                      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                      'http://localhost:3000'

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price: pkg.stripe_price_id,
                quantity: 1,
            }],
            metadata: {
                user_id: auth.user.id,
                user_email: auth.user.email || '',
                package_id: pkg.id,
                package_name: pkg.name,
                credits: totalCredits.toString(),
            },
            success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/?payment=cancelled`,
            customer_email: auth.user.email,
        })

        return NextResponse.json({
            url: session.url,
            session_id: session.id
        })

    } catch (error) {
        console.error('Checkout error:', error)
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        )
    }
}
