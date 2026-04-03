import type { BugCategory, BugReportMetadata } from '../types'
import { getRecentActions } from './action-logger'

function getFeatureFromPath(pathname: string): string {
  const featureMap: Record<string, string> = {
    'shot-creator': 'Shot Creator',
    'storyboard': 'Storyboard',
    'storybook': 'Storybook',
    'music-lab': 'Music Lab',
    'brand-studio': 'Brand Studio',
    'figurine-studio': 'Figurine Studio',
    'shot-animator': 'Shot Animator',
    'community': 'Community',
    'merch-lab': 'Merch Lab',
    'admin': 'Admin',
    'gallery': 'Gallery',
  }

  const segment = pathname.split('/').filter(Boolean)[0] || ''
  return featureMap[segment] || 'Unknown'
}

function collectMetadata(pathname: string): BugReportMetadata {
  return {
    pageUrl: pathname,
    feature: getFeatureFromPath(pathname),
    recentActions: getRecentActions(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    viewport: typeof window !== 'undefined'
      ? `${window.innerWidth}x${window.innerHeight}`
      : 'unknown',
    timestamp: new Date().toISOString(),
  }
}

export async function submitBugReport(
  description: string,
  category: BugCategory,
  pathname: string,
  screenshot?: File | null,
): Promise<{ success: boolean; issueNumber?: number; error?: string }> {
  const metadata = collectMetadata(pathname)

  const formData = new FormData()
  formData.append('description', description)
  formData.append('category', category)
  formData.append('metadata', JSON.stringify(metadata))
  if (screenshot) {
    formData.append('screenshot', screenshot)
  }

  const res = await fetch('/api/bug-report', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()

  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to submit bug report' }
  }

  return { success: true, issueNumber: data.issueNumber }
}
