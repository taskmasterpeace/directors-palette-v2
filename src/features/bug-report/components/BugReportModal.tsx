'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { ScreenshotUpload } from './ScreenshotUpload'
import { submitBugReport } from '../services/bug-report.service'
import { CATEGORY_LABELS, type BugCategory } from '../types'

interface BugReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MIN_DESCRIPTION = 20
const MAX_DESCRIPTION = 5000

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<BugCategory>('feature')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const pathname = usePathname()
  const { toast } = useToast()

  const isValid = description.trim().length >= MIN_DESCRIPTION

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return
    setSubmitting(true)

    const result = await submitBugReport(description.trim(), category, pathname, screenshot)

    if (result.success) {
      toast({
        title: `Bug report #${result.issueNumber} submitted`,
        description: 'Thank you for the report!',
        variant: 'success' as 'default',
      })
      setDescription('')
      setCategory('feature')
      setScreenshot(null)
      onOpenChange(false)
    } else {
      toast({
        title: 'Failed to submit',
        description: result.error || 'Something went wrong — please try again.',
        variant: 'destructive',
      })
    }

    setSubmitting(false)
  }, [isValid, submitting, description, category, pathname, screenshot, toast, onOpenChange])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="sm:rounded-[0.625rem] max-w-md border"
        style={{
          background: 'oklch(0.18 0.02 200)',
          borderColor: 'oklch(0.32 0.03 200)',
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle
            className="text-lg font-semibold tracking-tight flex items-center gap-2"
            style={{ color: 'oklch(0.92 0.02 200)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.2 200)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" />
              <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
              <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
              <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
              <path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
              <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" />
              <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
            </svg>
            Report a Bug
          </AlertDialogTitle>
          <AlertDialogDescription style={{ color: 'oklch(0.65 0.04 200)' }}>
            Help us improve by describing what went wrong.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'oklch(0.75 0.03 200)' }}>
              What happened? *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Describe what went wrong and the steps that led to the problem..."
              rows={4}
              className="w-full rounded-[0.625rem] border px-3 py-2.5 text-sm resize-none transition-colors focus:outline-none focus:ring-2"
              style={{
                background: 'oklch(0.14 0.015 200)',
                borderColor: 'oklch(0.32 0.03 200)',
                color: 'oklch(0.92 0.02 200)',
                // @ts-expect-error CSS custom property for focus ring
                '--tw-ring-color': 'oklch(0.6 0.2 200)',
              }}
            />
            <div className="flex justify-between text-xs" style={{ color: 'oklch(0.5 0.03 200)' }}>
              <span>
                {description.trim().length < MIN_DESCRIPTION
                  ? `At least ${MIN_DESCRIPTION - description.trim().length} more characters`
                  : '\u00A0'}
              </span>
              <span>{description.length}/{MAX_DESCRIPTION}</span>
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'oklch(0.75 0.03 200)' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BugCategory)}
              className="w-full rounded-[0.625rem] border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 appearance-none cursor-pointer"
              style={{
                background: 'oklch(0.14 0.015 200)',
                borderColor: 'oklch(0.32 0.03 200)',
                color: 'oklch(0.92 0.02 200)',
                // @ts-expect-error CSS custom property
                '--tw-ring-color': 'oklch(0.6 0.2 200)',
              }}
            >
              {(Object.entries(CATEGORY_LABELS) as [BugCategory, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Screenshot */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'oklch(0.75 0.03 200)' }}>
              Screenshot (optional)
            </label>
            <ScreenshotUpload file={screenshot} onFileChange={setScreenshot} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-[0.625rem] text-sm font-medium border transition-colors hover:opacity-80"
              style={{
                background: 'transparent',
                borderColor: 'oklch(0.32 0.03 200)',
                color: 'oklch(0.75 0.03 200)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="px-4 py-2 rounded-[0.625rem] text-sm font-semibold transition-all"
              style={{
                background: isValid && !submitting ? 'oklch(0.6 0.2 200)' : 'oklch(0.3 0.05 200)',
                color: isValid && !submitting ? 'oklch(0.98 0 200)' : 'oklch(0.5 0.03 200)',
                cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
