/**
 * Reference Library Service
 * Handles Supabase operations for reference library management
 */

import { getClient } from "@/lib/db/client"
import { toError } from "../helpers"
import { logger } from '@/lib/logger'

export interface ReferenceData {
    id?: string;
    gallery_id: string;
    category: string;
    tags: string[] | null;
    created_at?: string;
    updated_at?: string;
}

export interface ReferenceWithGallery {
    id: string;
    gallery_id: string;
    category: string;
    tags: string[];
    created_at: string;
    updated_at: string;
    gallery: {
        id: string;
        public_url: string | null;
        metadata: Record<string, unknown>;
    } | null;
}

/**
 * Create a new reference from a gallery item
 */
export async function createReference(
    galleryId: string,
    category: string,
    tags: string[]
): Promise<{ data: ReferenceData | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        const { data, error } = await supabase
            .from('reference')
            .insert({
                gallery_id: galleryId,
                category,
                tags
            })
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        logger.shotCreator.error('Error creating reference', { error: error instanceof Error ? error.message : String(error) })
        return { data: null, error: toError(error) };
    }
}

/**
 * Get all references for the current user
 */
export async function getReferences(
    category?: string
): Promise<{ data: ReferenceWithGallery[] | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        if (!supabase) {
            throw new Error('Supabase client not available');
        }

        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            logger.shotCreator.error('Authentication error in getReferences', { authError: authError })
            throw new Error(`Authentication failed: ${authError.message}`);
        }

        if (!user) {
            throw new Error('User not authenticated');
        }

        let query = supabase
            .from('reference')
            .select(`
                id,
                gallery_id,
                category,
                tags,
                created_at,
                updated_at,
                gallery (
                    id,
                    public_url,
                    metadata
                )
            `)
            .eq('gallery.user_id', user.id)
            .order('created_at', { ascending: false });

        // Apply category filter if provided
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { data: data as ReferenceWithGallery[], error: null };
    } catch (error) {
        logger.shotCreator.error('Error fetching references', { error: error instanceof Error ? error.message : String(error) })
        return { data: null, error: toError(error) };
    }
}

/**
 * Get references with pagination
 */
export async function getReferencesPaginated(
    page: number,
    pageSize: number,
    category?: string
): Promise<{ data: ReferenceWithGallery[] | null; total: number; totalPages: number; error: Error | null }> {
    try {
        const supabase = await getClient();

        if (!supabase) {
            throw new Error('Supabase client not available');
        }

        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            logger.shotCreator.error('Authentication error in getReferencesPaginated', { authError: authError })
            throw new Error(`Authentication failed: ${authError.message}`);
        }

        if (!user) {
            throw new Error('User not authenticated');
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Build base query for data
        let dataQuery = supabase
            .from('reference')
            .select(`
                id,
                gallery_id,
                category,
                tags,
                created_at,
                updated_at,
                gallery!inner (
                    id,
                    public_url,
                    metadata,
                    user_id
                )
            `)
            .eq('gallery.user_id', user.id)
            .not('gallery.public_url', 'is', null)
            .order('created_at', { ascending: false })
            .range(from, to);

        // Build count query with inner join
        let countQuery = supabase
            .from('reference')
            .select('id, gallery!inner(user_id)', { count: 'exact', head: true })
            .eq('gallery.user_id', user.id);

        // Apply category filter if provided
        if (category && category !== 'all') {
            dataQuery = dataQuery.eq('category', category);
            countQuery = countQuery.eq('category', category);
        }

        // Execute both queries in parallel
        const [{ data, error: dataError }, { count, error: countError }] = await Promise.all([
            dataQuery,
            countQuery,
        ]);

        if (dataError) {
            logger.shotCreator.error('Data query error', { dataError: dataError })
            throw new Error(`Failed to fetch references: ${dataError.message}`);
        }

        if (countError) {
            logger.shotCreator.error('Count query error', { countError: countError })
            throw new Error(`Failed to count references: ${countError.message}`);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / pageSize);

        return {
            data: data as ReferenceWithGallery[],
            total,
            totalPages,
            error: null
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.shotCreator.error('Error fetching paginated references', { message: errorMessage, error, page, pageSize, category })

        // Return error details
        return {
            data: null,
            total: 0,
            totalPages: 0,
            error: error instanceof Error ? error : new Error(errorMessage)
        };
    }
}

/**
 * Update reference category
 */
export async function updateReferenceCategory(
    referenceId: string,
    newCategory: string
): Promise<{ data: ReferenceData | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        const { data, error } = await supabase
            .from('reference')
            .update({ category: newCategory })
            .eq('id', referenceId)
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        logger.shotCreator.error('Error updating reference category', { error: error instanceof Error ? error.message : String(error) })
        return { data: null, error: toError(error) };
    }
}

/**
 * Update reference tags
 */
export async function updateReferenceTags(
    referenceId: string,
    tags: string[]
): Promise<{ data: ReferenceData | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        const { data, error } = await supabase
            .from('reference')
            .update({ tags })
            .eq('id', referenceId)
            .select()
            .single();

        if (error) throw error;

        return { data, error: null };
    } catch (error) {
        logger.shotCreator.error('Error updating reference tags', { error: error instanceof Error ? error.message : String(error) })
        return { data: null, error: toError(error) };
    }
}

/**
 * Delete a reference
 */
export async function deleteReference(
    referenceId: string
): Promise<{ error: Error | null }> {
    try {
        const supabase = await getClient();

        const { error } = await supabase
            .from('reference')
            .delete()
            .eq('id', referenceId);

        if (error) throw error;

        return { error: null };
    } catch (error) {
        logger.shotCreator.error('Error deleting reference', { error: error instanceof Error ? error.message : String(error) })
        return { error: toError(error) };
    }
}

/**
 * Check if a gallery item is already in reference library
 */
export async function isInReferenceLibrary(
    galleryId: string
): Promise<{ exists: boolean; referenceId?: string; error: Error | null }> {
    try {
        const supabase = await getClient();

        const { data, error } = await supabase
            .from('reference')
            .select('id')
            .eq('gallery_id', galleryId)
            .maybeSingle();

        if (error) throw error;

        return {
            exists: !!data,
            referenceId: data?.id,
            error: null
        };
    } catch (error) {
        logger.shotCreator.error('Error checking reference existence', { error: error instanceof Error ? error.message : String(error) })
        return { exists: false, error: toError(error) };
    }
}
