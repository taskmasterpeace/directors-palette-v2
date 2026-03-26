import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const body = await request.json()

    const { name, loraType, triggerWord, weightsUrl, storagePath, thumbnailUrl,
            defaultLoraScale, defaultGuidanceScale, compatibleModels } = body

    if (!name || !weightsUrl) {
      return NextResponse.json({ error: 'name and weightsUrl are required' }, { status: 400 })
    }

    const validTypes = ['character', 'style']
    const type = validTypes.includes(loraType) ? loraType : 'style'

    const { data, error } = await supabase
      .from('user_loras')
      .insert({
        user_id: user.id,
        name,
        lora_type: type,
        trigger_word: triggerWord || null,
        weights_url: weightsUrl,
        storage_path: storagePath || null,
        thumbnail_url: thumbnailUrl || null,
        default_lora_scale: defaultLoraScale ?? 1.0,
        default_guidance_scale: defaultGuidanceScale ?? 3.5,
        compatible_models: compatibleModels || [],
      })
      .select()
      .single()

    if (error) {
      lognog.error('LoRA register failed', { error: error.message, user_id: user.id })
      return NextResponse.json({ error: 'Failed to register LoRA' }, { status: 500 })
    }

    lognog.info('LoRA registered', { user_id: user.id, lora_id: data.id, name, type })

    return NextResponse.json(data)
  } catch (error) {
    lognog.error('LoRA register error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
