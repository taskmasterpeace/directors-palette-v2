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
import { lognog } from '@/lib/lognog'

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
        lognog.devWarn('Failed to record webhook event', {
            error: err instanceof Error ? err.message : String(err)
        });
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
            lognog.devError('Webhook exceeded max retries, marking as permanently failed', {
                event_id: eventId,
                retry_count: retryCount
            });
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

        lognog.devDebug('Queued webhook for retry', {
            event_id: eventId,
            retry_number: retryCount + 1,
            next_retry_at: nextRetryAt.toISOString()
        });
    } catch (err) {
        lognog.devError('Failed to queue webhook for retry', {
            error: err instanceof Error ? err.message : String(err)
        });
    }
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
    const webhookStart = Date.now()

    // Read env vars fresh on each request (critical for serverless)
    const stripe = getStripe()
    const webhookSecret = getWebhookSecret()

    // Log configuration status
    lognog.devDebug('Stripe webhook request received', {
        stripe_configured: !!stripe,
        secret_configured: !!webhookSecret
    });

    if (!stripe || !webhookSecret) {
        lognog.devError('Stripe webhook missing configuration', {
            stripe_configured: !!stripe,
            secret_configured: !!webhookSecret
        });
        return NextResponse.json(
            { error: 'Webhook not configured' },
            { status: 503 }
        )
    }

    try {
        // Get raw body as text - critical for signature verification
        const body = await request.text()
        const signature = request.headers.get('stripe-signature')

        lognog.devDebug('Stripe webhook body received', {
            body_length: body.length,
            has_signature: !!signature
        });

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
            lognog.devDebug('Stripe webhook signature verified', {
                event_id: event.id,
                event_type: event.type
            });
        } catch (err) {
            lognog.devError('Webhook signature verification failed', {
                error: err instanceof Error ? err.message : String(err)
            });
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            )
        }

        // IDEMPOTENCY CHECK: Skip if already processed
        if (await isEventProcessed(event.id)) {
            lognog.devDebug('Webhook already processed, skipping', { event_id: event.id });
            return NextResponse.json({ received: true, skipped: true })
        }

        // Handle the event
        try {
            lognog.devDebug('Handling Stripe event', { event_type: event.type });
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object as Stripe.Checkout.Session
                    lognog.devDebug('Processing checkout.session.completed', {
                        session_id: session.id,
                        user_id: session.metadata?.user_id,
                        credits: session.metadata?.credits
                    });
                    await handleCheckoutCompleted(session, event.id)
                    break
                }

                case 'checkout.session.expired': {
                    const session = event.data.object as Stripe.Checkout.Session
                    lognog.devDebug('Checkout expired', {
                        session_id: session.id,
                        user_email: session.metadata?.user_email
                    });
                    break
                }

                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent
                    lognog.devWarn('Payment failed', { payment_intent_id: paymentIntent.id });
                    break
                }

                default:
                    lognog.devDebug('Unhandled Stripe event type', { event_type: event.type });
            }

            // Record successful processing
            await recordWebhookEvent(event.id, event.type, 'processed', event.data.object)

            // Log successful Stripe webhook
            lognog.info(`POST /api/webhooks/stripe 200 (${Date.now() - webhookStart}ms)`, {
                type: 'api',
                route: '/api/webhooks/stripe',
                method: 'POST',
                status_code: 200,
                duration_ms: Date.now() - webhookStart,
            })

        } catch (processingError) {
            const errorMessage = processingError instanceof Error
                ? processingError.message
                : 'Unknown processing error'

            lognog.devError('Webhook processing failed', {
                event_id: event.id,
                error: errorMessage
            });

            // Queue for retry instead of just failing
            await queueForRetry(event.id, event.type, event.data.object, errorMessage)
            await recordWebhookEvent(event.id, event.type, 'retrying', event.data.object, errorMessage)

            // Still return 200 to prevent Stripe from retrying immediately
            // Our own retry queue will handle it with exponential backoff
            return NextResponse.json({ received: true, queued_for_retry: true })
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        lognog.devError('Webhook error', {
            error: error instanceof Error ? error.message : String(error)
        });
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
    const userId = session.metadata?.user_id
    const credits = parseInt(session.metadata?.credits || '0')
    const packageId = session.metadata?.package_id
    const packageName = session.metadata?.package_name

    lognog.devDebug('handleCheckoutCompleted started', {
        user_id: userId,
        credits,
        package_id: packageId,
        package_name: packageName
    });

    if (!userId) {
        lognog.devError('Missing user_id in checkout session metadata', { session_id: session.id });
        throw new Error('Missing user_id in checkout metadata')
    }

    if (credits <= 0) {
        lognog.devError('Invalid credits amount in checkout session', { session_id: session.id, credits });
        throw new Error('Invalid credits amount')
    }

    // Add credits to user account using admin method (bypasses RLS)
    try {
        const result = await creditsService.addCreditsAdmin(userId, credits, {
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

        if (result.success) {
            lognog.devInfo('Successfully added credits', {
                user_id: userId,
                credits,
                new_balance: result.newBalance
            });

            // Log successful payment to LogNog (production logging)
            lognog.info('payment_completed', {
                type: 'business',
                event: 'payment_completed',
                user_id: userId,
                credits,
                package_name: packageName,
                amount_cents: session.amount_total,
                stripe_session_id: session.id,
            })
        } else {
            lognog.devError('Failed to add credits', {
                user_id: userId,
                error: result.error
            });
            throw new Error(result.error || 'Failed to add credits')
        }
    } catch (error) {
        lognog.devError('Exception in addCredits', {
            error: error instanceof Error ? error.message : String(error)
        });
        throw error
    }
}
