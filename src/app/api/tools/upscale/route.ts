import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';
import { lognog } from '@/lib/lognog';
import { logger } from '@/lib/logger'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Model ID for upscaling - Real-ESRGAN is a high quality upscaler
const UPSCALE_MODEL = 'nightmareai/real-esrgan';

// Cost: ~1 cent, charge 2 points (good margin)
const UPSCALE_COST_POINTS = 2;

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
      if (!balance || balance.balance < UPSCALE_COST_POINTS) {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${UPSCALE_COST_POINTS}, have ${balance?.balance || 0}` },
          { status: 402 }
        );
      }
    }

    logger.api.info('Starting upscale for', { detail: imageUrl });
    logger.api.info('Using Real-ESRGAN model', { detail: UPSCALE_MODEL });

    // Call Replicate API using nightmareai/real-esrgan
    // Real-ESRGAN uses image (uri) not image_url, scale 4x
    const rawOutput = await replicate.run(UPSCALE_MODEL, {
      input: {
        image: imageUrl,
        scale: 4,
        face_enhance: false,
      },
    });

    logger.api.info('Upscale completed');
    logger.api.info('  - rawOutput type', { detail: typeof rawOutput });
    logger.api.info('  - rawOutput constructor', { name: (rawOutput as object)?.constructor?.name });

    // Extract URL from output
    // Replicate SDK v1 returns FileOutput objects which have toString() -> URL
    let outputUrl: string | undefined;

    if (typeof rawOutput === 'string') {
      logger.api.info('  - Detected: string output');
      outputUrl = rawOutput;
    } else if (rawOutput && typeof rawOutput === 'object') {
      // FileOutput objects have toString() which returns the URL
      const stringified = String(rawOutput);
      logger.api.info('  - Detected: object output, toString() =', { detail: stringified });

      if (stringified && stringified.startsWith('http')) {
        outputUrl = stringified;
      }
    }

    logger.api.info('Extracted outputUrl', { detail: outputUrl });

    if (outputUrl && typeof outputUrl === 'string' && outputUrl.startsWith('http')) {

      // Deduct credits after successful completion (admins bypass)
      if (!userIsAdmin) {
        const deductResult = await creditsService.addCredits(user.id, -UPSCALE_COST_POINTS, {
          type: 'usage',
          description: 'Image upscale 4x',
          metadata: {
            originalImage: imageUrl,
            tool: 'upscale-4x',
          },
        });
        if (!deductResult.success) {
          logger.api.error('Failed to deduct credits', { error: deductResult.error });
        } else {
          logger.api.info('Deducted credits', { points: UPSCALE_COST_POINTS, newBalance: deductResult.newBalance });
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

        // Create new gallery entry for the upscaled image
        const { data: newEntry, error: insertError } = await supabase
          .from('gallery')
          .insert({
            user_id: user.id,
            prediction_id: `upscaled-${Date.now()}`,
            generation_type: 'image',
            status: 'completed',
            public_url: outputUrl,  // Changed from image_url to match schema
            folder_id: originalEntry?.folder_id || null,
            metadata: {
              ...((originalEntry?.metadata as Record<string, unknown>) || {}),
              originalImage: imageUrl,
              tool: 'upscale-4x',
              prompt: `[Upscaled 4x] ${((originalEntry?.metadata as Record<string, unknown>)?.prompt as string) || 'Unknown'}`,
            },
          })
          .select()
          .single();

        if (insertError) {
          logger.api.error('Failed to create gallery entry', { error: insertError instanceof Error ? insertError.message : String(insertError) });
        } else {
          logger.api.info('Created new gallery entry', { id: newEntry?.id });
        }

        return NextResponse.json({
          success: true,
          imageUrl: outputUrl,
          galleryId: newEntry?.id,
          creditsUsed: userIsAdmin ? 0 : UPSCALE_COST_POINTS,
        });
      }

      return NextResponse.json({
        success: true,
        imageUrl: outputUrl,
        creditsUsed: userIsAdmin ? 0 : UPSCALE_COST_POINTS,
      });
    } else {
      return NextResponse.json(
        { error: 'No output from upscale model' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.api.error('Upscale error', { error: error instanceof Error ? error.message : String(error) });

    // Better error details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    logger.api.error('Full error details', { detail: errorDetails });

    lognog.error('tool_upscale_failed', {
      error: errorMessage,
      tool: 'upscale-4x',
    });

    return NextResponse.json(
      {
        error: 'Failed to upscale image',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
