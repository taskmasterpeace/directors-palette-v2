import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Model ID for background removal
const REMOVE_BG_MODEL = 'bria-ai/rmbg-2.0';

// Cost: ~2 cents, charge 3 points (50% margin)
const REMOVE_BG_COST_POINTS = 3;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;

    const body = await request.json();
    const { imageUrl, galleryId } = body;

    // Validate required fields
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Check credits (admins bypass)
    const userIsAdmin = isAdminEmail(user.email);
    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id);
      if (!balance || balance.balance < REMOVE_BG_COST_POINTS) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            details: `You need ${REMOVE_BG_COST_POINTS} points but only have ${balance?.balance || 0} points.`,
            required: REMOVE_BG_COST_POINTS,
            balance: balance?.balance || 0,
          },
          { status: 402 }
        );
      }
    }

    console.log('Starting background removal for:', imageUrl);

    // Call Replicate API
    const prediction = await replicate.predictions.create({
      model: REMOVE_BG_MODEL,
      input: {
        image: imageUrl,
      },
    });

    console.log('Prediction created:', prediction.id);

    // Wait for completion (background removal is fast, ~2-5 seconds)
    const completedPrediction = await replicate.wait(prediction, {
      interval: 500,
    });

    console.log('Prediction completed:', completedPrediction.status);

    if (completedPrediction.status === 'succeeded' && completedPrediction.output) {
      const outputUrl = completedPrediction.output as string;

      // Deduct credits after successful completion (admins bypass)
      if (!userIsAdmin) {
        const deductResult = await creditsService.addCredits(user.id, -REMOVE_BG_COST_POINTS, {
          type: 'usage',
          description: 'Background removal',
          metadata: {
            predictionId: prediction.id,
            originalImage: imageUrl,
            tool: 'remove-background',
          },
        });
        if (!deductResult.success) {
          console.error('Failed to deduct credits:', deductResult.error);
        } else {
          console.log(`Deducted ${REMOVE_BG_COST_POINTS} credits. New balance: ${deductResult.newBalance}`);
        }
      }

      // If galleryId provided, create a new gallery entry for the processed image
      if (galleryId) {
        // Get original gallery entry metadata
        const { data: originalEntry } = await supabase
          .from('gallery')
          .select('metadata, folder_id')
          .eq('id', galleryId)
          .single();

        // Create new gallery entry for the no-bg image
        const { data: newEntry, error: insertError } = await supabase
          .from('gallery')
          .insert({
            user_id: user.id,
            prediction_id: `bg-removed-${prediction.id}`,
            generation_type: 'image',
            status: 'completed',
            image_url: outputUrl,
            folder_id: originalEntry?.folder_id || null,
            metadata: {
              ...((originalEntry?.metadata as Record<string, unknown>) || {}),
              originalImage: imageUrl,
              tool: 'remove-background',
              prompt: `[Background Removed] ${((originalEntry?.metadata as Record<string, unknown>)?.prompt as string) || 'Unknown'}`,
            },
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create gallery entry:', insertError);
        } else {
          console.log('Created new gallery entry:', newEntry?.id);
        }

        return NextResponse.json({
          success: true,
          imageUrl: outputUrl,
          galleryId: newEntry?.id,
          creditsUsed: userIsAdmin ? 0 : REMOVE_BG_COST_POINTS,
        });
      }

      return NextResponse.json({
        success: true,
        imageUrl: outputUrl,
        creditsUsed: userIsAdmin ? 0 : REMOVE_BG_COST_POINTS,
      });
    } else if (completedPrediction.status === 'failed') {
      return NextResponse.json(
        {
          error: 'Background removal failed',
          details: completedPrediction.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Unexpected prediction status' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Failed to remove background' },
      { status: 500 }
    );
  }
}
