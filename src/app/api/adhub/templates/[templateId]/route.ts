/**
 * Adhub Template API - Single template operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { AdhubTemplateService } from '@/features/adhub/services/adhub-template.service'

interface RouteContext {
  params: Promise<{ templateId: string }>
}

// GET - Get single template with fields
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await AdhubTemplateService.getTemplate(templateId)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check access (own or public)
    if (template.userId !== user.id && !template.isPublic) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

// PUT - Update template
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, iconUrl, goalPrompt, isPublic } = body

    const template = await AdhubTemplateService.updateTemplate(templateId, user.id, {
      name: name?.trim(),
      iconUrl: iconUrl?.trim(),
      goalPrompt: goalPrompt?.trim(),
      isPublic,
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE - Delete template
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await AdhubTemplateService.deleteTemplate(templateId, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
