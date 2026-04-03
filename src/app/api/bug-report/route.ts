import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'
import type { BugCategory, BugReportMetadata } from '@/features/bug-report/types'
import { CATEGORY_GITHUB_LABELS } from '@/features/bug-report/types'

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

    const metadata: BugReportMetadata = JSON.parse(metadataRaw)

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
    )

    const labels = ['bug', 'user-reported', CATEGORY_GITHUB_LABELS[category]]

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
