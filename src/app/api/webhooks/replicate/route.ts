import { NextRequest, NextResponse } from 'next/server';
import { WebhookVerificationService } from '@/features/generation/services/webhook-verification.service';
import { WebhookService } from '@/features/generation/services/webhook.service';
import { lognog } from '@/lib/lognog';

export async function POST(request: NextRequest) {
  const webhookStart = Date.now();
  let predictionId: string | undefined;

  try {
    // 1. Get raw body and headers
    const body = await request.text();
    const webhookId = request.headers.get('webhook-id');
    const webhookTimestamp = request.headers.get('webhook-timestamp');
    const webhookSignature = request.headers.get('webhook-signature');

    // 2. Validate required headers exist
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      console.error('Missing webhook headers');
      return NextResponse.json(
        { error: 'Missing webhook headers' },
        { status: 400 }
      );
    }

    // 3. Validate timestamp (prevent replay attacks - 5 min tolerance)
    if (!WebhookVerificationService.isTimestampValid(webhookTimestamp)) {
      console.error('Webhook timestamp too old');
      return NextResponse.json(
        { error: 'Webhook timestamp too old' },
        { status: 400 }
      );
    }

    // 4. Get signing secret from Replicate (cached)
    let signingSecret: string;
    try {
      signingSecret = await WebhookVerificationService.getSigningSecret();
    } catch (error) {
      console.error('Failed to get signing secret:', error);
      return NextResponse.json(
        { error: 'Failed to get webhook secret' },
        { status: 500 }
      );
    }

    // 5. Verify signature using HMAC-SHA256
    const isValid = WebhookVerificationService.verifySignature(
      webhookId,
      webhookTimestamp,
      body,
      webhookSignature,
      signingSecret
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // 6. Parse and process the prediction event
    const event = JSON.parse(body);
    predictionId = event.id;
    console.log(`Webhook received for prediction ${event.id}: ${event.status}`);

    // 7. Process the prediction asynchronously
    try {
      await WebhookService.processCompletedPrediction(event);

      // Log successful webhook processing
      lognog.business({
        event: 'webhook_processed',
        metadata: { prediction_id: predictionId, status: event.status },
      });

      lognog.api({
        route: '/api/webhooks/replicate',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - webhookStart,
      });

      // 8. Return success immediately (Replicate expects quick response)
      return NextResponse.json({ received: true });
    } catch (processingError) {
      // If processing fails (e.g., download timeout), return 500 so Replicate retries
      console.error('Prediction processing error:', processingError);

      lognog.error({
        message: processingError instanceof Error ? processingError.message : 'Webhook processing failed',
        context: { prediction_id: predictionId },
      });

      lognog.api({
        route: '/api/webhooks/replicate',
        method: 'POST',
        status_code: 500,
        duration_ms: Date.now() - webhookStart,
        error: processingError instanceof Error ? processingError.message : 'Processing error',
      });

      return NextResponse.json(
        { error: 'Failed to process prediction' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Webhook processing error:', error);

    lognog.error({
      message: error instanceof Error ? error.message : 'Webhook failed',
      context: { prediction_id: predictionId },
    });

    lognog.api({
      route: '/api/webhooks/replicate',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - webhookStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
