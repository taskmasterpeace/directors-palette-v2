import type { SecurityGateResult, PipelineNotification } from '../types/pipeline.types'
import { sendPipelineNotification } from './notification.service'
import { createLogger } from '@/lib/logger'
import { lognog } from '@/lib/lognog'

const log = createLogger('BugPipeline')

const GITHUB_REPO = 'taskmasterpeace/directors-palette-v2'

async function addGitHubComment(issueNumber: number, body: string): Promise<void> {
  const pat = process.env.GITHUB_PAT
  if (!pat) return

  await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ body }),
  })
}

async function addGitHubLabels(issueNumber: number, labels: string[]): Promise<void> {
  const pat = process.env.GITHUB_PAT
  if (!pat) return

  await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ labels }),
  })
}

/**
 * Handle a low-quality report: add needs-info label, comment asking for details, notify
 */
export async function handleLowQualityReport(params: {
  issueNumber: number
  issueUrl: string
  title: string
  suggestedFollowup: string
}): Promise<void> {
  const { issueNumber, suggestedFollowup } = params

  await addGitHubLabels(issueNumber, ['needs-info'])

  const comment = `Thanks for reporting this! We need a bit more detail to investigate:\n\n> ${suggestedFollowup}\n\nPlease reply with more info and we'll take a look.`
  await addGitHubComment(issueNumber, comment)

  log.info('Low-quality report handled', { issueNumber })
}

/**
 * Handle a security-flagged report: add label, notify owner immediately
 */
export async function handleSecurityFlag(params: {
  issueNumber: number
  issueUrl: string
  title: string
  gateResult: SecurityGateResult
}): Promise<void> {
  const { issueNumber, issueUrl, title, gateResult } = params

  await addGitHubLabels(issueNumber, ['security:flagged'])

  const notification: PipelineNotification = {
    event: 'security_flagged',
    issueNumber,
    issueUrl,
    title,
    priority: 'high',
    summary: `Security flags: ${gateResult.security_flags.join(', ')}. Score: ${gateResult.security_score}/100. Auto-fix skipped — manual review required.`,
  }

  await sendPipelineNotification(notification)
  log.info('Security-flagged report notified', { issueNumber, flags: gateResult.security_flags })
}

/**
 * Trigger real-time triage via Claude Code remote trigger.
 * Falls back gracefully — if trigger fails, the daily scheduled triage picks it up.
 */
export async function triggerRealtimeTriage(params: {
  issueNumber: number
  issueUrl: string
  title: string
  isSecurityFlagged: boolean
}): Promise<void> {
  const { issueNumber, issueUrl, title, isSecurityFlagged } = params

  // Add pipeline:pending label
  await addGitHubLabels(issueNumber, ['pipeline:pending'])

  // Attempt to dispatch remote triage agent
  const triggerUrl = process.env.CLAUDE_TRIGGER_URL
  const triggerToken = process.env.CLAUDE_TRIGGER_TOKEN

  if (!triggerUrl || !triggerToken) {
    log.warn('Claude trigger not configured, issue will be picked up by daily triage', { issueNumber })
    return
  }

  try {
    const response = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${triggerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issue_number: issueNumber,
        issue_url: issueUrl,
        skip_auto_fix: isSecurityFlagged,
      }),
    })

    if (!response.ok) {
      log.error('Remote trigger failed', { status: response.status, issueNumber })
      return
    }

    log.info('Remote triage triggered', { issueNumber })

    lognog.info('bug_pipeline_triggered', {
      type: 'business',
      event: 'bug_pipeline_triggered',
      issueNumber,
      title,
    })
  } catch (error) {
    log.error('Remote trigger error', { error: error instanceof Error ? error.message : String(error), issueNumber })
    // Fail silently — daily triage will catch it
  }
}
