import { NextRequest, NextResponse } from 'next/server'
import { sendPipelineNotification } from '@/features/bug-report/services/notification.service'
import type { PipelineNotification } from '@/features/bug-report/types/pipeline.types'
import { createLogger } from '@/lib/logger'

const log = createLogger('BugPipeline')

export async function POST(request: NextRequest) {
  try {
    // Simple auth: check for internal secret
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.INTERNAL_NOTIFICATION_SECRET
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PipelineNotification = await request.json()

    if (!body.event || !body.issueNumber || !body.issueUrl || !body.title || !body.summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await sendPipelineNotification(body)

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Notification route error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
