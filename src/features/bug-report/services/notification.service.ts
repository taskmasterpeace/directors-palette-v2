import type { PipelineNotification } from '../types/pipeline.types'
import { createLogger } from '@/lib/logger'

const log = createLogger('BugPipeline')

const OWNER_EMAIL = process.env.BUG_PIPELINE_NOTIFY_EMAIL || ''
const FROM_EMAIL = 'bugs@directorspalette.com'

function buildEmailHtml(notification: PipelineNotification): string {
  const priorityColors: Record<string, string> = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#22c55e',
  }
  const priorityColor = priorityColors[notification.priority || 'medium'] || '#888'

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="margin: 0 0 8px;">Bug #${notification.issueNumber}: ${notification.title}</h2>
      ${notification.priority ? `<span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
        ${notification.priority.toUpperCase()} PRIORITY
      </span>` : ''}
      <p style="color: #666; margin: 16px 0;">${notification.summary}</p>
      ${notification.prUrl ? `<p><a href="${notification.prUrl}" style="background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">Review PR</a></p>` : ''}
      <p><a href="${notification.issueUrl}" style="color: #2563eb;">View Issue on GitHub</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Directors Palette Bug Pipeline</p>
    </div>
  `
}

function subjectLine(notification: PipelineNotification): string {
  const statusMap: Record<string, string> = {
    security_blocked: 'SECURITY ALERT — Blocked',
    security_flagged: 'SECURITY — Flagged for Review',
    needs_info: 'Needs More Info',
    triage_started: 'Triage Started',
    triage_complete: 'Triaged',
    fix_pr_created: 'PR Ready for Review',
    needs_manual_review: 'Needs Your Attention',
  }
  const status = statusMap[notification.event] || notification.event
  return `[Directors Palette] Bug #${notification.issueNumber} — ${status}`
}

export async function sendPipelineNotification(notification: PipelineNotification): Promise<void> {
  if (!OWNER_EMAIL) {
    log.warn('BUG_PIPELINE_NOTIFY_EMAIL not set, skipping email notification')
    log.info('Pipeline notification (no email)', { event: notification.event, issue: notification.issueNumber })
    return
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    log.warn('RESEND_API_KEY not set, skipping email notification')
    log.info('Pipeline notification (no email)', { event: notification.event, issue: notification.issueNumber })
    return
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendKey)

    await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: subjectLine(notification),
      html: buildEmailHtml(notification),
    })

    log.info('Pipeline email sent', { event: notification.event, issue: notification.issueNumber, to: OWNER_EMAIL })
  } catch (error) {
    log.error('Pipeline email failed', { error: error instanceof Error ? error.message : String(error) })
    // Don't throw — email failure shouldn't block the pipeline
  }
}
