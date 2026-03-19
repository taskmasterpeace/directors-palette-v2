import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse } from '../_lib/response'
import { creditsService } from '@/features/credits'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  const balance = await creditsService.getBalance(auth.userId, true)

  await apiKeyService.logUsage({
    apiKeyId: auth.apiKeyId,
    userId: auth.userId,
    endpoint: '/v2/balance',
    method: 'GET',
    statusCode: 200,
  })

  return successResponse({ balance: balance?.balance ?? 0, unit: 'pts' })
}
