import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const { id } = await params

    // Fetch the LoRA first to get storage_path
    const { data: lora, error: fetchError } = await supabase
      .from('user_loras')
      .select('id, storage_path')
      .eq('id', id)
      .single()

    if (fetchError || !lora) {
      return NextResponse.json({ error: 'LoRA not found' }, { status: 404 })
    }

    // Delete from storage if path exists
    if (lora.storage_path) {
      await supabase.storage
        .from('directors-palette')
        .remove([lora.storage_path])
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_loras')
      .delete()
      .eq('id', id)

    if (deleteError) {
      lognog.error('LoRA delete failed', { error: deleteError.message, lora_id: id })
      return NextResponse.json({ error: 'Failed to delete LoRA' }, { status: 500 })
    }

    lognog.info('LoRA deleted', { user_id: user.id, lora_id: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    lognog.error('LoRA delete error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
