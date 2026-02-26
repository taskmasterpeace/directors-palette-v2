import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { getAPIClient } from '@/lib/db/client';
import { logger } from '@/lib/logger'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * POST /api/generation/cancel/[predictionId]
 * Cancel a running Replicate prediction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ predictionId: string }> }
) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { predictionId } = await params;

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Prediction ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify the authenticated user owns this prediction
    try {
      const supabase = await getAPIClient();
      const { data } = await supabase
        .from('generation_events')
        .select('id')
        .eq('prediction_id', predictionId)
        .eq('user_id', auth.user.id)
        .limit(1)
        .maybeSingle();

      if (!data) {
        return NextResponse.json(
          { error: 'Prediction not found' },
          { status: 404 }
        );
      }
    } catch {
      // Fail closed - if we can't verify ownership, deny access
      return NextResponse.json(
        { error: 'Failed to verify prediction ownership' },
        { status: 403 }
      );
    }

    // Cancel the prediction on Replicate
    const prediction = await replicate.predictions.cancel(predictionId);

    return NextResponse.json({
      success: true,
      id: prediction.id,
      status: prediction.status,
      message: 'Prediction canceled successfully',
    });
  } catch (error) {
    logger.api.error('Error canceling prediction', { error: error instanceof Error ? error.message : String(error) });

    // Check if it's a "not found" error from Replicate
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: 'Prediction not found', status: 'unknown' },
        { status: 404 }
      );
    }

    // Check if prediction already completed
    if (errorMessage.includes('already') || errorMessage.includes('completed')) {
      return NextResponse.json(
        { error: 'Prediction already completed or canceled', status: 'completed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel prediction' },
      { status: 500 }
    );
  }
}
