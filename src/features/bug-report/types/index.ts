export type BugCategory = 'ui' | 'feature' | 'performance' | 'other'

export const CATEGORY_LABELS: Record<BugCategory, string> = {
  ui: 'UI Glitch',
  feature: 'Feature Broken',
  performance: 'Slow / Laggy',
  other: 'Other',
}

export const CATEGORY_GITHUB_LABELS: Record<BugCategory, string> = {
  ui: 'bug:ui',
  feature: 'bug:feature',
  performance: 'bug:performance',
  other: 'bug:other',
}

export interface BugReportMetadata {
  pageUrl: string
  feature: string
  recentActions: string[]
  userAgent: string
  viewport: string
  timestamp: string
}

export interface BugReportPayload {
  description: string
  category: BugCategory
  metadata: BugReportMetadata
  screenshotUrl?: string
}
