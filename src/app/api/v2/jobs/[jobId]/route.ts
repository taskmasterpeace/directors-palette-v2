import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { getJob, formatJobResponse } from '../../_lib/job-manager'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  const { jobId } = await params

  const job = await getJob(jobId, auth.userId)
  if (!job) return errors.notFound('Job not found')

  await apiKeyService.logUsage({
    apiKeyId: auth.apiKeyId,
    userId: auth.userId,
    endpoint: `/v2/jobs/${jobId}`,
    method: 'GET',
    statusCode: 200,
  })

  return successResponse(formatJobResponse(job))
}
