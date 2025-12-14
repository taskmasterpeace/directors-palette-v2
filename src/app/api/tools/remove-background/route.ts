import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Model ID for background removal - cjwbw/rembg is stable and cheap (~$0.004/run)
const REMOVE_BG_MODEL = 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

// Cost: ~0.4 cents, charge 2 points (still good margin)
const REMOVE_BG_COST_POINTS = 2;

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

    // Call Replicate API using cjwbw/rembg (works with simple URL output)
    const rawOutput = await replicate.run(REMOVE_BG_MODEL, {
      input: {
        image: imageUrl,
      },
    });

    console.log('Background removal completed');
    console.log('  - rawOutput type:', typeof rawOutput);
    console.log('  - rawOutput constructor:', (rawOutput as object)?.constructor?.name);

    // Extract URL from output
    // Replicate SDK v1 returns FileOutput objects which have toString() -> URL
    let outputUrl: string | undefined;

    if (typeof rawOutput === 'string') {
      console.log('  - Detected: string output');
      outputUrl = rawOutput;
    } else if (rawOutput && typeof rawOutput === 'object') {
      // FileOutput objects have toString() which returns the URL
      const stringified = String(rawOutput);
      console.log('  - Detected: object output, toString() =', stringified);

      if (stringified && stringified.startsWith('http')) {
        outputUrl = stringified;
      }
    }

    console.log('Extracted outputUrl:', outputUrl);

    if (outputUrl && typeof outputUrl === 'string' && outputUrl.startsWith('http')) {

      // Deduct credits after successful completion (admins bypass)
      if (!userIsAdmin) {
        const deductResult = await creditsService.addCredits(user.id, -REMOVE_BG_COST_POINTS, {
          type: 'usage',
          description: 'Background removal',
          metadata: {
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
            prediction_id: `bg-removed-${Date.now()}`,
            generation_type: 'image',
            status: 'completed',
            public_url: outputUrl,  // Changed from image_url to match schema
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
    } else {
      return NextResponse.json(
        { error: 'No output from background removal' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Background removal error:', error);

    // Better error details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    console.error('Full error details:', errorDetails);

    return NextResponse.json(
      {
        error: 'Failed to remove background',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
