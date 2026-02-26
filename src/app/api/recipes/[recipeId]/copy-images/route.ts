import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger'

const STORAGE_BUCKET = 'directors-palette';

function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface CopyResult {
  oldUrl: string;
  newUrl: string;
  oldImageId: string;
  newImageId: string;
}

/**
 * POST /api/recipes/[recipeId]/copy-images
 * Copy all images from a source recipe to the new recipe
 * Body: { sourceRecipeId: string }
 * Returns: { copies: CopyResult[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { recipeId: targetRecipeId } = await params;
    const body = await request.json();
    const { sourceRecipeId } = body;

    if (!targetRecipeId || !sourceRecipeId) {
      return NextResponse.json(
        { error: 'Target recipe ID and source recipe ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // List files in source recipe folder
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`recipe-images/${sourceRecipeId}`);

    if (listError) {
      logger.api.error('copy-images: List error', { error: listError instanceof Error ? listError.message : String(listError) });
      return NextResponse.json(
        { error: 'Failed to list source images' },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      // No images to copy
      return NextResponse.json({ copies: [] });
    }

    const copies: CopyResult[] = [];

    // Copy each file
    for (const file of files) {
      try {
        const sourcePath = `recipe-images/${sourceRecipeId}/${file.name}`;

        // Download the file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(sourcePath);

        if (downloadError || !fileData) {
          logger.api.error('copy-images: Download error for', { file: file.name, error: downloadError instanceof Error ? downloadError.message : String(downloadError) });
          continue;
        }

        // Generate new image ID (preserve extension)
        const ext = file.name.split('.').pop() || 'jpg';
        const oldImageId = file.name.replace(`.${ext}`, '');
        const newImageId = randomUUID();
        const newFileName = `${newImageId}.${ext}`;
        const targetPath = `recipe-images/${targetRecipeId}/${newFileName}`;

        // Upload to new location
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(targetPath, fileData, {
            contentType: file.metadata?.mimetype || 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          logger.api.error('copy-images: Upload error for', { file: file.name, error: uploadError instanceof Error ? uploadError.message : String(uploadError) });
          continue;
        }

        // Get URLs
        const { data: { publicUrl: oldUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(sourcePath);

        const { data: { publicUrl: newUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(targetPath);

        copies.push({
          oldUrl,
          newUrl,
          oldImageId,
          newImageId,
        });

      } catch (fileError) {
        logger.api.error('copy-images: Error copying', { file: file.name, error: fileError instanceof Error ? fileError.message : String(fileError) });
        continue;
      }
    }

    logger.api.info('copy-images: Copied', { copies: copies.length, files: files.length, sourceRecipeId: sourceRecipeId, targetRecipeId: targetRecipeId });

    return NextResponse.json({ copies });

  } catch (error) {
    logger.api.error('Copy images error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to copy images' },
      { status: 500 }
    );
  }
}
