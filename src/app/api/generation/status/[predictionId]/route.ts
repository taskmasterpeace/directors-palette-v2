import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * GET /api/generation/status/[predictionId]
 * Check the status of a Replicate prediction
 */
export async function GET(
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

    // Get prediction status from Replicate
    const prediction = await replicate.predictions.get(predictionId);

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      createdAt: prediction.created_at,
      completedAt: prediction.completed_at,
    });
  } catch (error) {
    console.error('Error fetching prediction status:', error);

    // Check if it's a "not found" error from Replicate
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return NextResponse.json(
        { error: 'Prediction not found', status: 'unknown' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch prediction status' },
      { status: 500 }
    );
  }
}
