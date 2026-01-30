/**
 * Adhub Style Service
 * Handles all style-related database operations (admin-only creation)
 */

import { getAPIClient, getClient } from '@/lib/db/client'
import {
  AdhubStyle,
  AdhubStyleInput,
  AdhubStyleRow,
  styleFromRow,
} from '../types/adhub.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdhubClient(): Promise<any> {
  return await getAPIClient()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBrowserClient(): Promise<any> {
  return await getClient()
}

export class AdhubStyleService {
  /**
   * List all active styles (public)
   */
  static async listActiveStyles(): Promise<AdhubStyle[]> {
    const supabase = await getBrowserClient()

    const { data, error } = await supabase
      .from('adhub_styles')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true })

    if (error) {
      console.error('Error fetching styles:', error)
      throw new Error(`Failed to fetch styles: ${error.message}`)
    }

    return (data || []).map((row: AdhubStyleRow) => styleFromRow(row))
  }

  /**
   * List all styles (admin only - includes inactive)
   */
  static async listAllStyles(): Promise<AdhubStyle[]> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_styles')
      .select('*')
      .order('display_name', { ascending: true })

    if (error) {
      console.error('Error fetching all styles:', error)
      throw new Error(`Failed to fetch all styles: ${error.message}`)
    }

    return (data || []).map((row: AdhubStyleRow) => styleFromRow(row))
  }

  /**
   * Get a style by ID
   */
  static async getStyle(styleId: string): Promise<AdhubStyle | null> {
    const supabase = await getBrowserClient()

    const { data, error } = await supabase
      .from('adhub_styles')
      .select('*')
      .eq('id', styleId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching style:', error)
      throw new Error(`Failed to fetch style: ${error.message}`)
    }

    if (!data) return null
    return styleFromRow(data as AdhubStyleRow)
  }

  /**
   * Create a new style (admin only)
   */
  static async createStyle(input: AdhubStyleInput): Promise<AdhubStyle> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_styles')
      .insert({
        name: input.name,
        display_name: input.displayName,
        icon_url: input.iconUrl ?? null,
        prompt_modifiers: input.promptModifiers,
        is_active: input.isActive ?? true,
        created_by: input.createdBy ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating style:', error)
      throw new Error(`Failed to create style: ${error.message}`)
    }

    return styleFromRow(data as AdhubStyleRow)
  }

  /**
   * Update a style (admin only)
   */
  static async updateStyle(styleId: string, input: Partial<AdhubStyleInput>): Promise<AdhubStyle> {
    const supabase = await getAdhubClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.name !== undefined) updateData.name = input.name
    if (input.displayName !== undefined) updateData.display_name = input.displayName
    if (input.iconUrl !== undefined) updateData.icon_url = input.iconUrl
    if (input.promptModifiers !== undefined) updateData.prompt_modifiers = input.promptModifiers
    if (input.isActive !== undefined) updateData.is_active = input.isActive

    const { data, error } = await supabase
      .from('adhub_styles')
      .update(updateData)
      .eq('id', styleId)
      .select()
      .single()

    if (error) {
      console.error('Error updating style:', error)
      throw new Error(`Failed to update style: ${error.message}`)
    }

    return styleFromRow(data as AdhubStyleRow)
  }

  /**
   * Delete a style (admin only)
   */
  static async deleteStyle(styleId: string): Promise<void> {
    const supabase = await getAdhubClient()

    const { error } = await supabase
      .from('adhub_styles')
      .delete()
      .eq('id', styleId)

    if (error) {
      console.error('Error deleting style:', error)
      throw new Error(`Failed to delete style: ${error.message}`)
    }
  }

  /**
   * Toggle style active status (admin only)
   */
  static async toggleStyleActive(styleId: string): Promise<AdhubStyle> {
    const supabase = await getAdhubClient()

    // First get current state
    const { data: current, error: fetchError } = await supabase
      .from('adhub_styles')
      .select('is_active')
      .eq('id', styleId)
      .single()

    if (fetchError) {
      console.error('Error fetching style:', fetchError)
      throw new Error(`Failed to fetch style: ${fetchError.message}`)
    }

    // Toggle
    const { data, error } = await supabase
      .from('adhub_styles')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', styleId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling style:', error)
      throw new Error(`Failed to toggle style: ${error.message}`)
    }

    return styleFromRow(data as AdhubStyleRow)
  }
}
