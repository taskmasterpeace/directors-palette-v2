import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Model ID for background removal - bria/remove-background is higher quality
const REMOVE_BG_MODEL = 'bria/remove-background';

// Cost: ~1.5 cents, charge 3 points (still good margin)
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

    // Check if user is admin (bypass credit check)
    const userIsAdmin = isAdminEmail(user.email || '');

    // Check if user has enough credits (unless admin)
    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id);
      if (!balance || balance.balance < REMOVE_BG_COST_POINTS) {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${REMOVE_BG_COST_POINTS}, have ${balance?.balance || 0}` },
          { status: 402 }
        );
      }
    }

    console.log('Starting background removal for:', imageUrl);
    console.log('Using Bria model:', REMOVE_BG_MODEL);

    // Call Replicate API using bria/remove-background
    // Bria uses image_url (string) not image (uri), and outputs a URI
    const rawOutput = await replicate.run(REMOVE_BG_MODEL, {
      input: {
        image_url: imageUrl, // Bria uses image_url
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
