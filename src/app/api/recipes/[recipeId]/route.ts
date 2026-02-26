/**
 * Admin Recipe API
 * PATCH/DELETE operations for recipes (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger'

function getSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Check if user is admin
async function isAdmin(userId: string, supabase: SupabaseClient): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: adminUser } = await (supabase as any)
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .single();

  return !!adminUser;
}

/**
 * PATCH /api/recipes/[recipeId]
 * Update a recipe (admin only for system recipes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if user is admin
    const admin = await isAdmin(auth.user.id, supabase);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse update data
    const updates = await request.json();

    // Build update object for database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.recipeNote !== undefined) updateData.recipe_note = updates.recipeNote || null;
    if (updates.suggestedAspectRatio !== undefined) updateData.suggested_aspect_ratio = updates.suggestedAspectRatio || null;
    if (updates.suggestedResolution !== undefined) updateData.suggested_resolution = updates.suggestedResolution || null;
    if (updates.suggestedModel !== undefined) updateData.suggested_model = updates.suggestedModel || null;
    if (updates.quickAccessLabel !== undefined) updateData.quick_access_label = updates.quickAccessLabel || null;
    if (updates.isQuickAccess !== undefined) updateData.is_quick_access = updates.isQuickAccess;
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId || null;
    if (updates.isSystem !== undefined) updateData.is_system = updates.isSystem;
    if (updates.isSystemOnly !== undefined) updateData.is_system_only = updates.isSystemOnly;

    if (updates.stages !== undefined) {
      updateData.stages = updates.stages.map((stage: { id: string; order: number; type?: string; template: string; toolId?: string; referenceImages?: unknown[] }) => ({
        id: stage.id,
        order: stage.order,
        type: stage.type || 'generation',
        template: stage.template,
        toolId: stage.toolId,
        fields: [],
        referenceImages: stage.referenceImages || [],
      }));
    }

    // Update recipe
    const { data, error } = await supabase
      .from('user_recipes')
      .update(updateData)
      .eq('id', recipeId)
      .select()
      .single();

    if (error) {
      logger.api.error('admin-recipes: Update error', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: 'Failed to update recipe', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ recipe: data });

  } catch (error) {
    logger.api.error('Admin recipe update error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipes/[recipeId]
 * Delete a recipe (admin only for system recipes)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if user is admin
    const admin = await isAdmin(auth.user.id, supabase);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Delete associated images from storage
    try {
      const { data: files } = await supabase.storage
        .from('directors-palette')
        .list(`recipe-images/${recipeId}`);

      if (files && files.length > 0) {
        const paths = files.map((f: { name: string }) => `recipe-images/${recipeId}/${f.name}`);
        await supabase.storage.from('directors-palette').remove(paths);
        logger.api.info('admin-recipes: Deleted', { paths: paths.length, recipeId: recipeId });
      }
    } catch (storageError) {
      logger.api.error('admin-recipes: Error deleting recipe images', { error: storageError instanceof Error ? storageError.message : String(storageError) });
      // Continue anyway - image cleanup is best effort
    }

    // Delete recipe
    const { error } = await supabase
      .from('user_recipes')
      .delete()
      .eq('id', recipeId);

    if (error) {
      logger.api.error('admin-recipes: Delete error', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: 'Failed to delete recipe', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true, recipeId });

  } catch (error) {
    logger.api.error('Admin recipe delete error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
