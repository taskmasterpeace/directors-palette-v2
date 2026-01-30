/**
 * Adhub Templates API
 * CRUD operations for user templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubTemplateService } from '@/features/adhub/services/adhub-template.service'

// GET - List all accessible templates
export async function GET() {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await AdhubTemplateService.listTemplates(user.id)
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, iconUrl, goalPrompt, isPublic, fields } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    if (!goalPrompt?.trim()) {
      return NextResponse.json({ error: 'Goal prompt is required' }, { status: 400 })
    }

    // Create template
    const template = await AdhubTemplateService.createTemplate(user.id, {
      name: name.trim(),
      iconUrl: iconUrl?.trim(),
      goalPrompt: goalPrompt.trim(),
      isPublic: isPublic ?? false,
    })

    // Add fields if provided
    if (fields && Array.isArray(fields)) {
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i]
        await AdhubTemplateService.addField(template.id, {
          fieldType: field.fieldType || 'text',
          fieldName: field.fieldName,
          fieldLabel: field.fieldLabel,
          isRequired: field.isRequired ?? true,
          placeholder: field.placeholder,
          fieldOrder: i,
        })
      }

      // Fetch template with fields
      const templateWithFields = await AdhubTemplateService.getTemplate(template.id)
      return NextResponse.json({ template: templateWithFields })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
