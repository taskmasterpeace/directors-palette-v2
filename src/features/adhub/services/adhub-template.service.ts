/**
 * Adhub Template Service
 * Handles all template-related database operations
 */

import { getAPIClient, getClient } from '@/lib/db/client'
import {
  AdhubTemplate,
  AdhubTemplateField,
  AdhubTemplateInput,
  AdhubTemplateFieldInput,
  AdhubTemplateRow,
  AdhubTemplateFieldRow,
  templateFromRow,
  templateFieldFromRow,
} from '../types/adhub.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdhubClient(): Promise<any> {
  return await getAPIClient()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBrowserClient(): Promise<any> {
  return await getClient()
}

export class AdhubTemplateService {
  /**
   * List all templates accessible by user (own + public)
   */
  static async listTemplates(userId: string): Promise<AdhubTemplate[]> {
    const supabase = await getBrowserClient()

    const { data, error } = await supabase
      .from('adhub_templates')
      .select('*')
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      throw new Error(`Failed to fetch templates: ${error.message}`)
    }

    return (data || []).map((row: AdhubTemplateRow) => templateFromRow(row))
  }

  /**
   * List user's own templates
   */
  static async listUserTemplates(userId: string): Promise<AdhubTemplate[]> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_templates')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching user templates:', error)
      throw new Error(`Failed to fetch user templates: ${error.message}`)
    }

    return (data || []).map((row: AdhubTemplateRow) => templateFromRow(row))
  }

  /**
   * Get a template by ID with its fields
   */
  static async getTemplate(templateId: string): Promise<AdhubTemplate | null> {
    const supabase = await getBrowserClient()

    const { data: templateData, error: templateError } = await supabase
      .from('adhub_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle()

    if (templateError) {
      console.error('Error fetching template:', templateError)
      throw new Error(`Failed to fetch template: ${templateError.message}`)
    }

    if (!templateData) return null

    // Get fields
    const { data: fieldsData, error: fieldsError } = await supabase
      .from('adhub_template_fields')
      .select('*')
      .eq('template_id', templateId)
      .order('field_order', { ascending: true })

    if (fieldsError) {
      console.error('Error fetching template fields:', fieldsError)
      throw new Error(`Failed to fetch template fields: ${fieldsError.message}`)
    }

    const template = templateFromRow(templateData as AdhubTemplateRow)
    template.fields = (fieldsData || []).map((row: AdhubTemplateFieldRow) => templateFieldFromRow(row))

    return template
  }

  /**
   * Create a new template
   */
  static async createTemplate(userId: string, input: AdhubTemplateInput): Promise<AdhubTemplate> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_templates')
      .insert({
        user_id: userId,
        name: input.name,
        icon_url: input.iconUrl ?? null,
        goal_prompt: input.goalPrompt,
        is_public: input.isPublic ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      throw new Error(`Failed to create template: ${error.message}`)
    }

    return templateFromRow(data as AdhubTemplateRow)
  }

  /**
   * Update a template
   */
  static async updateTemplate(templateId: string, userId: string, input: Partial<AdhubTemplateInput>): Promise<AdhubTemplate> {
    const supabase = await getAdhubClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.name !== undefined) updateData.name = input.name
    if (input.iconUrl !== undefined) updateData.icon_url = input.iconUrl
    if (input.goalPrompt !== undefined) updateData.goal_prompt = input.goalPrompt
    if (input.isPublic !== undefined) updateData.is_public = input.isPublic

    const { data, error } = await supabase
      .from('adhub_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      throw new Error(`Failed to update template: ${error.message}`)
    }

    return templateFromRow(data as AdhubTemplateRow)
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const supabase = await getAdhubClient()

    const { error } = await supabase
      .from('adhub_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting template:', error)
      throw new Error(`Failed to delete template: ${error.message}`)
    }
  }

  /**
   * Add a field to a template
   */
  static async addField(templateId: string, input: AdhubTemplateFieldInput): Promise<AdhubTemplateField> {
    const supabase = await getAdhubClient()

    const { data, error } = await supabase
      .from('adhub_template_fields')
      .insert({
        template_id: templateId,
        field_type: input.fieldType,
        field_name: input.fieldName,
        field_label: input.fieldLabel,
        is_required: input.isRequired ?? true,
        placeholder: input.placeholder ?? null,
        field_order: input.fieldOrder ?? 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding field:', error)
      throw new Error(`Failed to add field: ${error.message}`)
    }

    return templateFieldFromRow(data as AdhubTemplateFieldRow)
  }

  /**
   * Update a field
   */
  static async updateField(fieldId: string, input: Partial<AdhubTemplateFieldInput>): Promise<AdhubTemplateField> {
    const supabase = await getAdhubClient()

    const updateData: Record<string, unknown> = {}
    if (input.fieldType !== undefined) updateData.field_type = input.fieldType
    if (input.fieldName !== undefined) updateData.field_name = input.fieldName
    if (input.fieldLabel !== undefined) updateData.field_label = input.fieldLabel
    if (input.isRequired !== undefined) updateData.is_required = input.isRequired
    if (input.placeholder !== undefined) updateData.placeholder = input.placeholder
    if (input.fieldOrder !== undefined) updateData.field_order = input.fieldOrder

    const { data, error } = await supabase
      .from('adhub_template_fields')
      .update(updateData)
      .eq('id', fieldId)
      .select()
      .single()

    if (error) {
      console.error('Error updating field:', error)
      throw new Error(`Failed to update field: ${error.message}`)
    }

    return templateFieldFromRow(data as AdhubTemplateFieldRow)
  }

  /**
   * Delete a field
   */
  static async deleteField(fieldId: string): Promise<void> {
    const supabase = await getAdhubClient()

    const { error } = await supabase
      .from('adhub_template_fields')
      .delete()
      .eq('id', fieldId)

    if (error) {
      console.error('Error deleting field:', error)
      throw new Error(`Failed to delete field: ${error.message}`)
    }
  }

  /**
   * Reorder fields
   */
  static async reorderFields(templateId: string, fieldOrders: { fieldId: string; order: number }[]): Promise<void> {
    const supabase = await getAdhubClient()

    // Update each field order
    for (const { fieldId, order } of fieldOrders) {
      const { error } = await supabase
        .from('adhub_template_fields')
        .update({ field_order: order })
        .eq('id', fieldId)
        .eq('template_id', templateId)

      if (error) {
        console.error('Error reordering field:', error)
        throw new Error(`Failed to reorder fields: ${error.message}`)
      }
    }
  }

  /**
   * Get template fields
   */
  static async getTemplateFields(templateId: string): Promise<AdhubTemplateField[]> {
    const supabase = await getBrowserClient()

    const { data, error } = await supabase
      .from('adhub_template_fields')
      .select('*')
      .eq('template_id', templateId)
      .order('field_order', { ascending: true })

    if (error) {
      console.error('Error fetching template fields:', error)
      throw new Error(`Failed to fetch template fields: ${error.message}`)
    }

    return (data || []).map((row: AdhubTemplateFieldRow) => templateFieldFromRow(row))
  }
}
