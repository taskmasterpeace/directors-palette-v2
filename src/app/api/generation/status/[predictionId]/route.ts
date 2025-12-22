import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { StorageService } from '@/features/generation/services/storage.service';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Track predictions we've already persisted to avoid duplicate uploads
const persistedPredictions = new Map<string, string>();

/**
 * GET /api/generation/status/[predictionId]
 * Check the status of a Replicate prediction
 * When completed, persists image to Supabase Storage and returns permanent URL
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

    // Check if we've already persisted this prediction
    const cachedUrl = persistedPredictions.get(predictionId);
    if (cachedUrl) {
      return NextResponse.json({
        id: predictionId,
        status: 'succeeded',
        output: cachedUrl,
        persistedUrl: cachedUrl,
      });
    }

    // Get prediction status from Replicate
    const prediction = await replicate.predictions.get(predictionId);

    // If completed successfully, persist to Supabase Storage
    if (prediction.status === 'succeeded' && prediction.output) {
      const replicateUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;

      try {
        // Download from Replicate and upload to Supabase Storage
        const { buffer } = await StorageService.downloadAsset(replicateUrl);
        const { ext, mimeType } = StorageService.getMimeType(replicateUrl);
        const { publicUrl } = await StorageService.uploadToStorage(
          buffer,
          auth.user.id,
          `storybook_${predictionId}`,
          ext,
          mimeType
        );

        // Cache the persisted URL
        persistedPredictions.set(predictionId, publicUrl);

        // Clean up old cache entries (keep last 100)
        if (persistedPredictions.size > 100) {
          const firstKey = persistedPredictions.keys().next().value;
          if (firstKey) persistedPredictions.delete(firstKey);
        }

        return NextResponse.json({
          id: prediction.id,
          status: prediction.status,
          output: publicUrl, // Return permanent URL
          persistedUrl: publicUrl,
          error: prediction.error,
          createdAt: prediction.created_at,
          completedAt: prediction.completed_at,
        });
      } catch (uploadError) {
        console.error('Failed to persist to Supabase Storage:', uploadError);
        // Fall back to temporary URL if upload fails
        return NextResponse.json({
          id: prediction.id,
          status: prediction.status,
          output: prediction.output,
          error: prediction.error,
          createdAt: prediction.created_at,
          completedAt: prediction.completed_at,
          warning: 'Image stored temporarily - may expire',
        });
      }
    }

    // Not completed yet, return raw status
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
