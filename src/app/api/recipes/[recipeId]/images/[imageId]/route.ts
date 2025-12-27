import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';

const STORAGE_BUCKET = 'directors-palette';

function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * DELETE /api/recipes/[recipeId]/images/[imageId]
 * Delete a single image from a recipe
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string; imageId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { recipeId, imageId } = await params;

    if (!recipeId || !imageId) {
      return NextResponse.json(
        { error: 'Recipe ID and Image ID are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // List files to find the one with matching imageId
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`recipe-images/${recipeId}`);

    if (listError) {
      console.error('[recipe-image-delete] List error:', listError);
      return NextResponse.json(
        { error: 'Failed to find image' },
        { status: 500 }
      );
    }

    // Find file that starts with the imageId
    const file = files?.find(f => f.name.startsWith(imageId));

    if (!file) {
      // Also try to delete by exact path in case imageId includes extension
      const possiblePaths = [
        `recipe-images/${recipeId}/${imageId}`,
        `recipe-images/${recipeId}/${imageId}.jpg`,
        `recipe-images/${recipeId}/${imageId}.png`,
        `recipe-images/${recipeId}/${imageId}.webp`,
      ];

      // Try to delete any of these paths
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(possiblePaths);

      if (deleteError) {
        console.error('[recipe-image-delete] Delete error:', deleteError);
      }

      // Return success anyway - image might already be deleted
      return NextResponse.json({ deleted: true, imageId });
    }

    // Delete the found file
    const storagePath = `recipe-images/${recipeId}/${file.name}`;
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (deleteError) {
      console.error('[recipe-image-delete] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deleted: true,
      imageId,
      storagePath,
    });

  } catch (error) {
    console.error('Recipe image delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
