/**
 * Adhub Template Fields API
 * Manage fields for a template
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubTemplateService } from '@/features/adhub/services/adhub-template.service'

interface RouteContext {
  params: Promise<{ templateId: string }>
}

// GET - List fields for a template
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify template access
    const template = await AdhubTemplateService.getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.userId !== user.id && !template.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const fields = await AdhubTemplateService.getTemplateFields(templateId)
    return NextResponse.json({ fields })
  } catch (error) {
    console.error('Error fetching template fields:', error)
    return NextResponse.json({ error: 'Failed to fetch template fields' }, { status: 500 })
  }
}

// POST - Add field to template
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify template ownership
    const template = await AdhubTemplateService.getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { fieldType, fieldName, fieldLabel, isRequired, placeholder, fieldOrder } = body

    if (!fieldType || !fieldName || !fieldLabel) {
      return NextResponse.json({ error: 'Field type, name, and label are required' }, { status: 400 })
    }

    const field = await AdhubTemplateService.addField(templateId, {
      fieldType,
      fieldName,
      fieldLabel,
      isRequired: isRequired ?? true,
      placeholder,
      fieldOrder: fieldOrder ?? 0,
    })

    return NextResponse.json({ field })
  } catch (error) {
    console.error('Error adding template field:', error)
    return NextResponse.json({ error: 'Failed to add template field' }, { status: 500 })
  }
}

// PUT - Update field
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify template ownership
    const template = await AdhubTemplateService.getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { fieldId, fieldType, fieldName, fieldLabel, isRequired, placeholder, fieldOrder } = body

    if (!fieldId) {
      return NextResponse.json({ error: 'Field ID is required' }, { status: 400 })
    }

    const field = await AdhubTemplateService.updateField(fieldId, {
      fieldType,
      fieldName,
      fieldLabel,
      isRequired,
      placeholder,
      fieldOrder,
    })

    return NextResponse.json({ field })
  } catch (error) {
    console.error('Error updating template field:', error)
    return NextResponse.json({ error: 'Failed to update template field' }, { status: 500 })
  }
}

// DELETE - Delete field
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify template ownership
    const template = await AdhubTemplateService.getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const fieldId = searchParams.get('fieldId')

    if (!fieldId) {
      return NextResponse.json({ error: 'Field ID is required' }, { status: 400 })
    }

    await AdhubTemplateService.deleteField(fieldId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template field:', error)
    return NextResponse.json({ error: 'Failed to delete template field' }, { status: 500 })
  }
}
