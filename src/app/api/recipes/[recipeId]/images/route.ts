import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { randomUUID } from 'crypto';

const STORAGE_BUCKET = 'directors-palette';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/recipes/[recipeId]/images
 * Upload a reference image for a specific recipe
 * Stores in: recipe-images/{recipeId}/{imageId}.{ext}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { recipeId } = await params;

    console.log('[recipe-images] POST request for recipe:', recipeId, 'user:', auth.user.id);

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    // Validate recipe ID format (should be a UUID)
    if (!/^[a-f0-9-]{36}$/.test(recipeId)) {
      console.error('[recipe-images] Invalid recipe ID format:', recipeId);
      return NextResponse.json(
        { error: 'Invalid recipe ID format', details: `Expected UUID, got: ${recipeId}` },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum file size is 50MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          details: `Allowed types: JPEG, PNG, WebP. Your file: ${file.type}`
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine file extension
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const fileExtension = extMap[file.type] || 'jpg';

    // Generate unique image ID
    const imageId = randomUUID();

    // Upload to recipe-scoped folder
    const storagePath = `recipe-images/${recipeId}/${imageId}.${fileExtension}`;
    const supabase = getSupabaseClient();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: 'public, max-age=31536000, immutable',
      });

    if (uploadError) {
      console.error('[recipe-images] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      url: publicUrl,
      imageId,
      storagePath,
    });

  } catch (error) {
    console.error('Recipe image upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recipes/[recipeId]/images
 * List all images for a recipe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { recipeId } = await params;
    const supabase = getSupabaseClient();

    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`recipe-images/${recipeId}`);

    if (error) {
      console.error('[recipe-images] List error:', error);
      return NextResponse.json(
        { error: 'Failed to list images' },
        { status: 500 }
      );
    }

    // Get public URLs for each file
    const images = files?.map(file => {
      const storagePath = `recipe-images/${recipeId}/${file.name}`;
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      return {
        name: file.name,
        url: publicUrl,
        storagePath,
        createdAt: file.created_at,
      };
    }) || [];

    return NextResponse.json({ images });

  } catch (error) {
    console.error('Recipe images list error:', error);
    return NextResponse.json(
      { error: 'Failed to list images' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[recipeId]/images
 * Delete ALL images for a recipe (used when deleting recipe)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { recipeId } = await params;
    const supabase = getSupabaseClient();

    // List all files in recipe folder
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`recipe-images/${recipeId}`);

    if (listError) {
      console.error('[recipe-images] List error:', listError);
      return NextResponse.json(
        { error: 'Failed to list images for deletion' },
        { status: 500 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete all files
    const paths = files.map(f => `recipe-images/${recipeId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (deleteError) {
      console.error('[recipe-images] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete images' },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: paths.length });

  } catch (error) {
    console.error('Recipe images delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete images' },
      { status: 500 }
    );
  }
}
