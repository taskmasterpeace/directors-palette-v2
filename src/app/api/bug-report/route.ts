import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'
import type { BugCategory, BugReportMetadata } from '@/features/bug-report/types'
import { CATEGORY_GITHUB_LABELS } from '@/features/bug-report/types'
import { analyzeReport } from '@/features/bug-report/services/security-gate.service'
import {
  handleLowQualityReport,
  handleSecurityFlag,
  triggerRealtimeTriage,
} from '@/features/bug-report/services/bug-pipeline.service'

// Simple in-memory rate limiting: userId -> timestamps[]
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS)
  rateLimitMap.set(userId, timestamps)
  if (timestamps.length >= RATE_LIMIT) return true
  timestamps.push(now)
  return false
}

// Security ban: userId -> ban expiry timestamp
const securityBanMap = new Map<string, number>()
const blockCountMap = new Map<string, number[]>()

function isSecurityBanned(userId: string): boolean {
  const banExpiry = securityBanMap.get(userId)
  if (banExpiry && Date.now() < banExpiry) return true
  if (banExpiry) securityBanMap.delete(userId)
  return false
}

function recordSecurityBlock(userId: string): void {
  const now = Date.now()
  const blocks = (blockCountMap.get(userId) || []).filter(t => now - t < 60 * 60 * 1000)
  blocks.push(now)
  blockCountMap.set(userId, blocks)
  // Two blocks in an hour = 24-hour ban
  if (blocks.length >= 2) {
    securityBanMap.set(userId, now + 24 * 60 * 60 * 1000)
  }
}

function obfuscateEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local[0]}***@${domain}`
}

function buildIssueBody(
  description: string,
  category: BugCategory,
  metadata: BugReportMetadata,
  email: string,
  userId: string,
  screenshotUrl?: string,
  gateResult?: { quality_score: number; quality_issues: string[]; security_flags: string[] },
): string {
  const categoryLabel = { ui: 'UI Glitch', feature: 'Feature Broken', performance: 'Slow / Laggy', other: 'Other' }[category]

  let body = `## Bug Report\n\n`
  body += `**Category:** ${categoryLabel}\n`
  body += `**Reported by:** ${obfuscateEmail(email)}\n`
  body += `**Page:** ${metadata.pageUrl}\n`
  body += `**Feature:** ${metadata.feature}\n\n`
  body += `### Description\n${description}\n\n`

  if (screenshotUrl) {
    body += `### Screenshot\n![screenshot](${screenshotUrl})\n\n`
  }

  if (metadata.recentActions.length > 0) {
    body += `### Recent Actions\n`
    metadata.recentActions.forEach((action, i) => {
      body += `${i + 1}. ${action}\n`
    })
    body += `\n`
  }

  body += `### Environment\n`
  body += `- Browser: ${metadata.userAgent}\n`
  body += `- Viewport: ${metadata.viewport}\n`
  body += `- Timestamp: ${metadata.timestamp}\n`
  body += `- User ID: \`${userId}\`\n`

  if (gateResult) {
    body += `\n<details><summary>Pipeline Analysis</summary>\n\n`
    body += `- Quality Score: ${gateResult.quality_score}/100\n`
    if (gateResult.quality_issues.length > 0) {
      body += `- Quality Issues: ${gateResult.quality_issues.join(', ')}\n`
    }
    if (gateResult.security_flags.length > 0) {
      body += `- Security Flags: ${gateResult.security_flags.join(', ')}\n`
    }
    body += `\n</details>\n`
  }

  return body
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "You've submitted 3 reports recently. Please wait before submitting another." },
      { status: 429 }
    )
  }

  if (isSecurityBanned(user.id)) {
    return NextResponse.json(
      { error: 'Something went wrong — please try again later.' },
      { status: 429 }
    )
  }

  try {
    const formData = await request.formData()
    const description = formData.get('description') as string
    const category = formData.get('category') as BugCategory
    const metadataRaw = formData.get('metadata') as string
    const screenshot = formData.get('screenshot') as File | null

    if (!description || description.trim().length < 20) {
      return NextResponse.json({ error: 'Description must be at least 20 characters' }, { status: 400 })
    }
    if (!['ui', 'feature', 'performance', 'other'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Upload screenshot if provided
    let screenshotUrl: string | undefined
    if (screenshot && screenshot.size > 0) {
      const timestamp = Date.now()
      const ext = screenshot.name.split('.').pop() || 'png'
      const path = `bug-reports/${user.id}/${timestamp}.${ext}`

      const buffer = Buffer.from(await screenshot.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from('directors-palette')
        .upload(path, buffer, { contentType: screenshot.type, upsert: false })

      if (uploadError) {
        logger.api.warn('Screenshot upload failed, proceeding without', { error: uploadError.message })
        // Don't block report for optional screenshot
      } else {
        const { data: urlData } = supabase.storage.from('directors-palette').getPublicUrl(path)
        screenshotUrl = urlData.publicUrl
      }
    }

    // Security & Quality Gate
    const metadata: BugReportMetadata = JSON.parse(metadataRaw)
    const gateResult = await analyzeReport({
      description: description.trim(),
      category,
      pageUrl: metadata.pageUrl,
      feature: metadata.feature,
    })

    // Block malicious submissions
    if (gateResult.verdict === 'block') {
      recordSecurityBlock(user.id)
      logger.api.warn('Bug report blocked by security gate', {
        userId: user.id,
        security_score: gateResult.security_score,
        flags: gateResult.security_flags,
      })
      return NextResponse.json(
        { error: 'Something went wrong — please try again.' },
        { status: 400 }
      )
    }

    // Create GitHub issue
    const githubPat = process.env.GITHUB_PAT
    if (!githubPat) {
      logger.api.error('GITHUB_PAT not configured')
      return NextResponse.json({ error: 'Bug reporting is not configured' }, { status: 500 })
    }

    const issueBody = buildIssueBody(
      description.trim(),
      category,
      metadata,
      user.email || 'unknown',
      user.id,
      screenshotUrl,
      gateResult,
    )

    const labels = ['bug', 'user-reported', CATEGORY_GITHUB_LABELS[category]]
    if (gateResult.verdict === 'flag') labels.push('security:flagged')
    if (gateResult.quality_score < 30) labels.push('needs-info')
    else if (gateResult.quality_score < 60) labels.push('low-quality')
    labels.push('pipeline:pending')

    const ghRes = await fetch('https://api.github.com/repos/taskmasterpeace/directors-palette-v2/issues', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: `[Bug] ${metadata.feature}: ${description.trim().slice(0, 80)}`,
        body: issueBody,
        labels,
      }),
    })

    if (!ghRes.ok) {
      const ghError = await ghRes.text()
      logger.api.error('GitHub issue creation failed', { status: ghRes.status, error: ghError })
      return NextResponse.json(
        { error: 'Something went wrong — please try again.' },
        { status: 500 }
      )
    }

    const ghData = await ghRes.json()

    logger.api.info('Bug report created', {
      type: 'business',
      event: 'bug_report_created',
      issueNumber: ghData.number,
      category,
      feature: metadata.feature,
      userId: user.id,
    })

    // Fire-and-forget: trigger pipeline
    const pipelineAsync = async () => {
      try {
        if (gateResult.quality_score < 30 && gateResult.suggested_followup) {
          await handleLowQualityReport({
            issueNumber: ghData.number,
            issueUrl: ghData.html_url,
            title: description.trim().slice(0, 80),
            suggestedFollowup: gateResult.suggested_followup,
          })
          return // Don't trigger full triage for garbage reports
        }

        if (gateResult.verdict === 'flag') {
          await handleSecurityFlag({
            issueNumber: ghData.number,
            issueUrl: ghData.html_url,
            title: description.trim().slice(0, 80),
            gateResult,
          })
        }

        // Trigger real-time triage (skips auto-fix for security-flagged)
        await triggerRealtimeTriage({
          issueNumber: ghData.number,
          issueUrl: ghData.html_url,
          title: description.trim().slice(0, 80),
          isSecurityFlagged: gateResult.verdict === 'flag',
        })
      } catch (pipelineError) {
        logger.api.error('Bug pipeline error (non-blocking)', {
          error: pipelineError instanceof Error ? pipelineError.message : String(pipelineError),
          issueNumber: ghData.number,
        })
      }
    }
    pipelineAsync()

    return NextResponse.json({ success: true, issueNumber: ghData.number, issueUrl: ghData.html_url })
  } catch (error) {
    logger.api.error('Bug report submission failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Something went wrong — please try again.' },
      { status: 500 }
    )
  }
}
