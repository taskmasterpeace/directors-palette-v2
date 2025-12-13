/**
 * Stripe Webhook Handler
 * Processes Stripe events (payment completed, etc.)
 *
 * Features:
 * - Idempotency via webhook_events table (prevents double-processing)
 * - Retry queue for failed operations
 * - Audit logging for compliance
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { creditsService } from '@/features/credits'
import { getAPIClient } from '@/lib/db/client'

// Helper to get an untyped client for webhook tables (not in main DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWebhookClient(): Promise<any> {
    return await getAPIClient()
}

// Initialize Stripe lazily inside handler to ensure fresh env vars
function getStripe(): Stripe | null {
    const key = process.env.STRIPE_SECRET_KEY
    return key ? new Stripe(key) : null
}

function getWebhookSecret(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET
}

/**
 * Check if event was already successfully processed (idempotency)
 * Only skip if status is 'processed', not 'retrying' or 'failed'
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
    try {
        const supabase = await getWebhookClient()
        const { data } = await supabase
            .from('webhook_events')
            .select('id, status')
            .eq('event_id', eventId)
            .single()

        // Only skip if successfully processed, allow retrying failed events
        if (data && data.status === 'processed') {
            return true
        }
        return false
    } catch {
        // If table doesn't exist or query fails, proceed (better to double-process than miss)
        return false
    }
}

/**
 * Record webhook event as processed
 */
async function recordWebhookEvent(
    eventId: string,
    eventType: string,
    status: 'processed' | 'failed' | 'retrying' = 'processed',
    payload?: unknown,
    errorMessage?: string
): Promise<void> {
    try {
        const supabase = await getWebhookClient()
        await supabase
            .from('webhook_events')
            .upsert({
                event_id: eventId,
                event_type: eventType,
                status,
                payload,
                error_message: errorMessage,
            }, { onConflict: 'event_id' })
    } catch (err) {
        console.warn('Failed to record webhook event:', err)
    }
}

/**
 * Add failed webhook to retry queue
 */
async function queueForRetry(
    eventId: string,
    eventType: string,
    payload: unknown,
    errorMessage: string
): Promise<void> {
    try {
        const supabase = await getWebhookClient()

        // Exponential backoff: 1min, 5min, 15min, 30min, 1hr
        const retryDelays = [1, 5, 15, 30, 60]

        // Check if already in queue
        const { data: existing } = await supabase
            .from('webhook_retry_queue')
            .select('retry_count')
            .eq('event_id', eventId)
            .single()

        const retryCount = existing?.retry_count || 0

        if (retryCount >= 5) {
            console.error(`Webhook ${eventId} exceeded max retries, marking as permanently failed`)
            await recordWebhookEvent(eventId, eventType, 'failed', payload, errorMessage)
            return
        }

        const nextRetryMinutes = retryDelays[retryCount] || 60
        const nextRetryAt = new Date(Date.now() + nextRetryMinutes * 60 * 1000)

        await supabase
            .from('webhook_retry_queue')
            .upsert({
                event_id: eventId,
                event_type: eventType,
                payload,
                error_message: errorMessage,
                retry_count: retryCount + 1,
                next_retry_at: nextRetryAt.toISOString(),
                status: 'pending'
            }, { onConflict: 'event_id' })

        console.log(`Queued webhook ${eventId} for retry #${retryCount + 1} at ${nextRetryAt.toISOString()}`)
    } catch (err) {
        console.error('Failed to queue webhook for retry:', err)
    }
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
    // Read env vars fresh on each request (critical for serverless)
    const stripe = getStripe()
    const webhookSecret = getWebhookSecret()

    // DEBUG: Log what we're reading
    console.log('[Stripe Webhook] Request received')
    console.log('[Stripe Webhook] Stripe configured:', !!stripe)
    console.log('[Stripe Webhook] Secret configured:', webhookSecret ? `yes (${webhookSecret.substring(0, 15)}...)` : 'NO - MISSING!')

    if (!stripe || !webhookSecret) {
        console.error('[Stripe Webhook] Missing configuration - stripe:', !!stripe, 'secret:', !!webhookSecret)
        return NextResponse.json(
            { error: 'Webhook not configured' },
            { status: 503 }
        )
    }

    try {
        // Get raw body as text - critical for signature verification
        const body = await request.text()
        const signature = request.headers.get('stripe-signature')

        console.log('[Stripe Webhook] Body length:', body.length)
        console.log('[Stripe Webhook] Body first 100 chars:', body.substring(0, 100))
        console.log('[Stripe Webhook] Signature:', signature?.substring(0, 80))
        console.log('[Stripe Webhook] Using secret:', webhookSecret.substring(0, 20) + '...')

        if (!signature) {
            return NextResponse.json(
                { error: 'Missing stripe-signature header' },
                { status: 400 }
            )
        }

        // Verify webhook signature
        let event: Stripe.Event
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
            console.log('[Stripe Webhook] ✅ Signature verified! Event:', event.id, 'Type:', event.type)
        } catch (err) {
            console.error('Webhook signature verification failed:', err)
            console.error('[Stripe Webhook] Full error:', JSON.stringify(err, null, 2))
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            )
        }

        // IDEMPOTENCY CHECK: Skip if already processed
        console.log('[Stripe Webhook] Checking idempotency for event:', event.id)
        if (await isEventProcessed(event.id)) {
            console.log(`Webhook ${event.id} already processed, skipping`)
            return NextResponse.json({ received: true, skipped: true })
        }
        console.log('[Stripe Webhook] Event not yet processed, continuing...')

        // Handle the event
        try {
            console.log('[Stripe Webhook] Handling event type:', event.type)
            switch (event.type) {
                case 'checkout.session.completed': {
                    console.log('[Stripe Webhook] Processing checkout.session.completed...')
                    const session = event.data.object as Stripe.Checkout.Session
                    console.log('[Stripe Webhook] Session ID:', session.id)
                    console.log('[Stripe Webhook] Metadata:', JSON.stringify(session.metadata))
                    await handleCheckoutCompleted(session, event.id)
                    console.log('[Stripe Webhook] ✅ handleCheckoutCompleted finished successfully')
                    break
                }

                case 'checkout.session.expired': {
                    const session = event.data.object as Stripe.Checkout.Session
                    console.log('Checkout expired:', session.id, 'User:', session.metadata?.user_email)
                    break
                }

                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent
                    console.log('Payment failed:', paymentIntent.id)
                    break
                }

                default:
                    console.log('Unhandled event type:', event.type)
            }

            // Record successful processing
            await recordWebhookEvent(event.id, event.type, 'processed', event.data.object)

        } catch (processingError) {
            const errorMessage = processingError instanceof Error
                ? processingError.message
                : 'Unknown processing error'

            console.error(`Webhook processing failed for ${event.id}:`, errorMessage)

            // Queue for retry instead of just failing
            await queueForRetry(event.id, event.type, event.data.object, errorMessage)
            await recordWebhookEvent(event.id, event.type, 'retrying', event.data.object, errorMessage)

            // Still return 200 to prevent Stripe from retrying immediately
            // Our own retry queue will handle it with exponential backoff
            return NextResponse.json({ received: true, queued_for_retry: true })
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        )
    }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
    console.log('[handleCheckoutCompleted] Starting...')
    const userId = session.metadata?.user_id
    const credits = parseInt(session.metadata?.credits || '0')
    const packageId = session.metadata?.package_id
    const packageName = session.metadata?.package_name

    console.log('[handleCheckoutCompleted] Parsed metadata:', { userId, credits, packageId, packageName })

    if (!userId) {
        console.error('[handleCheckoutCompleted] Missing user_id in checkout session metadata:', session.id)
        throw new Error('Missing user_id in checkout metadata')
    }

    if (credits <= 0) {
        console.error('[handleCheckoutCompleted] Invalid credits amount in checkout session:', session.id)
        throw new Error('Invalid credits amount')
    }

    console.log(`[handleCheckoutCompleted] Processing purchase: ${credits} credits for user ${userId} (${session.metadata?.user_email})`)

    // Add credits to user account
    console.log('[handleCheckoutCompleted] Calling creditsService.addCredits...')
    try {
        const result = await creditsService.addCredits(userId, credits, {
            type: 'purchase',
            description: `${packageName || 'Credit package'} purchase`,
            metadata: {
                stripe_session_id: session.id,
                stripe_event_id: eventId,
                stripe_payment_intent: session.payment_intent,
                package_id: packageId,
                package_name: packageName,
                amount_paid_cents: session.amount_total,
                currency: session.currency,
                customer_email: session.customer_email,
            }
        })

        console.log('[handleCheckoutCompleted] creditsService.addCredits result:', JSON.stringify(result))

        if (result.success) {
            console.log(`[handleCheckoutCompleted] ✅ Successfully added ${credits} credits to user ${userId}. New balance: ${result.newBalance}`)
        } else {
            console.error(`[handleCheckoutCompleted] ❌ Failed to add credits for user ${userId}:`, result.error)
            throw new Error(result.error || 'Failed to add credits')
        }
    } catch (error) {
        console.error('[handleCheckoutCompleted] ❌ Exception in addCredits:', error)
        throw error
    }
}
