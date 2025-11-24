/**
 * Wildcard Service
 * Handles Supabase operations for wildcard management
 */

import { getClient } from "@/lib/db/client";
import { WildCard } from "../helpers/wildcard/parser";

export interface CreateWildCardInput {
    name: string;
    category?: string;
    content: string;
    description?: string;
    is_shared?: boolean;
}

export interface UpdateWildCardInput {
    name?: string;
    category?: string;
    content?: string;
    description?: string;
    is_shared?: boolean;
}

/**
 * Validate wildcard name (no spaces, alphanumeric and underscores only)
 */
export function validateWildCardName(name: string): { isValid: boolean; error?: string } {
    if (!name.trim()) {
        return { isValid: false, error: 'Name cannot be empty' };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        return { isValid: false, error: 'Name can only contain letters, numbers, and underscores (no spaces)' };
    }

    if (name.length > 50) {
        return { isValid: false, error: 'Name must be 50 characters or less' };
    }

    return { isValid: true };
}

/**
 * Validate wildcard content (must have at least one line)
 */
export function validateWildCardContent(content: string): { isValid: boolean; error?: string; lineCount?: number } {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
        return { isValid: false, error: 'Content must have at least one line' };
    }

    return { isValid: true, lineCount: lines.length };
}

/**
 * Create a new wildcard
 */
export async function createWildCard(
    input: CreateWildCardInput
): Promise<{ data: WildCard | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        // Validate name
        const nameValidation = validateWildCardName(input.name);
        if (!nameValidation.isValid) {
            throw new Error(nameValidation.error);
        }

        // Validate content
        const contentValidation = validateWildCardContent(input.content);
        if (!contentValidation.isValid) {
            throw new Error(contentValidation.error);
        }

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('wildcards')
            .insert({
                user_id: user.id,
                name: input.name,
                category: input.category || null,
                content: input.content,
                description: input.description || null,
                is_shared: input.is_shared || false
            })
            .select()
            .single();

        if (error) throw error;

        return { data: data as WildCard, error: null };
    } catch (error) {
        console.error('Error creating wildcard:', error);
        return { data: null, error: error as Error };
    }
}

/**
 * Get all wildcards for the current user (including shared ones)
 */
export async function getWildCards(
    category?: string
): Promise<{ data: WildCard[] | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('User not authenticated');

        let query = supabase
            .from('wildcards')
            .select('*')
            .or(`user_id.eq.${user.id},is_shared.eq.true`)
            .order('created_at', { ascending: false });

        // Apply category filter if provided
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;

        return { data: data as WildCard[], error: null };
    } catch (error) {
        console.error('Error fetching wildcards:', error);
        return { data: null, error: error as Error };
    }
}

/**
 * Get a single wildcard by ID
 */
export async function getWildCardById(
    id: string
): Promise<{ data: WildCard | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        const { data, error } = await supabase
            .from('wildcards')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        return { data: data as WildCard, error: null };
    } catch (error) {
        console.error('Error fetching wildcard:', error);
        return { data: null, error: error as Error };
    }
}

/**
 * Get a wildcard by name for the current user
 */
export async function getWildCardByName(
    name: string
): Promise<{ data: WildCard | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('wildcards')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', name)
            .maybeSingle();

        if (error) throw error;

        return { data: data as WildCard | null, error: null };
    } catch (error) {
        console.error('Error fetching wildcard by name:', error);
        return { data: null, error: error as Error };
    }
}

/**
 * Update a wildcard
 */
export async function updateWildCard(
    id: string,
    input: UpdateWildCardInput
): Promise<{ data: WildCard | null; error: Error | null }> {
    try {
        const supabase = await getClient();

        // Validate name if provided
        if (input.name) {
            const nameValidation = validateWildCardName(input.name);
            if (!nameValidation.isValid) {
                throw new Error(nameValidation.error);
            }
        }

        // Validate content if provided
        if (input.content) {
            const contentValidation = validateWildCardContent(input.content);
            if (!contentValidation.isValid) {
                throw new Error(contentValidation.error);
            }
        }

        const { data, error } = await supabase
            .from('wildcards')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { data: data as WildCard, error: null };
    } catch (error) {
        console.error('Error updating wildcard:', error);
        return { data: null, error: error as Error };
    }
}

/**
 * Delete a wildcard
 */
export async function deleteWildCard(
    id: string
): Promise<{ error: Error | null }> {
    try {
        const supabase = await getClient();

        const { error } = await supabase
            .from('wildcards')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return { error: null };
    } catch (error) {
        console.error('Error deleting wildcard:', error);
        return { error: error as Error };
    }
}

/**
 * Parse text file content (reads .txt files and returns content)
 */
export function parseTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            resolve(content);
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}

/**
 * Get wildcard statistics
 */
export async function getWildCardStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    error: Error | null;
}> {
    try {
        const { data, error } = await getWildCards();

        if (error) throw error;

        const byCategory: Record<string, number> = {};
        data?.forEach(wc => {
            const cat = wc.category || 'uncategorized';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
        });

        return {
            total: data?.length || 0,
            byCategory,
            error: null
        };
    } catch (error) {
        console.error('Error getting wildcard stats:', error);
        return { total: 0, byCategory: {}, error: error as Error };
    }
}
