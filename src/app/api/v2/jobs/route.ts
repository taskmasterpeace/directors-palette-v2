import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse } from '../_lib/response'
import { listJobs, formatJobResponse } from '../_lib/job-manager'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  const url = new URL(request.url)
  const status = url.searchParams.get('status') || undefined
  const type = url.searchParams.get('type') || undefined
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100)
  const offset = Number(url.searchParams.get('offset')) || 0

  const { jobs, total } = await listJobs({
    userId: auth.userId,
    status,
    type,
    limit,
    offset,
  })

  await apiKeyService.logUsage({
    apiKeyId: auth.apiKeyId,
    userId: auth.userId,
    endpoint: '/v2/jobs',
    method: 'GET',
    statusCode: 200,
  })

  return successResponse({
    jobs: jobs.map(formatJobResponse),
    total,
    limit,
    offset,
  })
}
