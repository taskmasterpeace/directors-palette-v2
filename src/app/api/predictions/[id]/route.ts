import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { ReplicatePrediction, WebhookService } from '@/features/generation/services/webhook.service';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ SECURITY: Verify authentication first
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth; // Return 401 error

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Prediction ID is required' },
        { status: 400 }
      );
    }

    const prediction = await replicate.predictions.get(id);

    // If prediction succeeded and has output, process it (download and save to Supabase)
    if (prediction.status === 'succeeded' && prediction.output) {
      try {
        await WebhookService.processCompletedPrediction(prediction as unknown as ReplicatePrediction);
      } catch (processError) {
        logger.api.error('Error processing prediction', { error: processError instanceof Error ? processError.message : String(processError) });
      }
    }

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      metrics: prediction.metrics,
      input: prediction.input,
      created_at: prediction.created_at,
      completed_at: prediction.completed_at,
    });

  } catch (error) {
    logger.api.error('Prediction fetch error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch prediction status' },
      { status: 500 }
    );
  }
}