import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const loraId = formData.get('loraId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.safetensors')) {
      return NextResponse.json({ error: 'Only .safetensors files are supported' }, { status: 400 })
    }

    if (file.size > 150 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 150MB)' }, { status: 400 })
    }

    const fileId = loraId || `lora_${Date.now()}`
    const storagePath = `loras/${user.id}/${fileId}.safetensors`

    const buffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('directors-palette')
      .upload(storagePath, buffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      lognog.error('LoRA upload failed', {
        error: uploadError.message,
        user_id: user.id,
      })
      return NextResponse.json(
        { error: 'Upload failed', details: uploadError.message },
        { status: 500 }
      )
    }

    const { data: publicUrlData } = supabase.storage
      .from('directors-palette')
      .getPublicUrl(storagePath)

    lognog.info('LoRA uploaded', {
      user_id: user.id,
      file_size: file.size,
      storage_path: storagePath,
    })

    return NextResponse.json({
      weightsUrl: publicUrlData.publicUrl,
      storagePath,
    })
  } catch (error) {
    lognog.error('LoRA upload error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
