import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse } from '../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('user_loras')
    .select('*')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  const loras = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    type: row.lora_type || 'style',
    trigger_word: row.trigger_word,
    compatible_models: row.compatible_models || ['flux-2-klein-9b'],
    thumbnail_url: row.thumbnail_url,
  }))

  await apiKeyService.logUsage({
    apiKeyId: auth.apiKeyId,
    userId: auth.userId,
    endpoint: '/v2/loras',
    method: 'GET',
    statusCode: 200,
  })

  return successResponse({ loras })
}
